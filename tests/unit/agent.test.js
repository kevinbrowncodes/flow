import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertCapabilities, ContractError, runFields, isRunActive } from '../../src/adapter/contract.js'
import { createHttpAdapter } from '../../src/adapter/http.js'
import { createMockAdapter } from '../../src/data/index.js'
import { memoryStore } from '../../src/adapter/store.js'
import { fakeGateway } from './fakeGateway.js'

const base = () => ({ protocol: 1, name: 'T', modes: [{ key: 'video', fields: [{ key: 'size', type: 'choice', role: 'size', options: ['1x1'], default: '1x1' }, { key: 'length', type: 'choice', role: 'duration', options: [5, 8], default: 8 }] }] })

test('agent capabilities: absent/false → false; object → validated with defaults', () => {
  assert.equal(assertCapabilities(base()).agent, false)
  assert.equal(assertCapabilities({ ...base(), agent: false }).agent, false)
  const caps = assertCapabilities({ ...base(), agent: { fields: ['length'] } })
  assert.deepEqual(caps.agent, { instructions: true, count: { min: 1, max: 12, default: 3 }, confirm: 'always', fields: ['length'], shapeFromSeed: false })
  assert.equal(caps.surfaces.agent, true, 'declaring agent turns the pill on')
  assert.deepEqual(runFields(caps).map((f) => f.key), ['length'])
  assert.deepEqual(runFields(assertCapabilities(base())), [])
})

test('agent capabilities: every rule', () => {
  const bad = (agent, re) => assert.throws(() => assertCapabilities({ ...base(), agent }), (e) => e instanceof ContractError && re.test(e.message))
  bad({ count: { min: 0 } }, /at least 1/)
  bad({ count: { min: 2, max: 4, default: 9 } }, /outside/)
  bad({ count: { default: 'x' } }, /integer/)
  bad({ confirm: 'sometimes' }, /confirm/)
  bad({ fields: ['nope'] }, /not fields of the video mode/)
  bad({ fields: 'size' }, /array/)
  bad('yes', /object/)
  assert.throws(() => assertCapabilities({ protocol: 1, name: 'T', modes: [{ key: 'image', fields: [{ key: 'size', type: 'choice', options: ['1x1'], default: '1x1' }] }], agent: {} }), /requires a 'video' mode/)
})

test('isRunActive', () => {
  assert.equal(isRunActive({ state: 'rendering' }), true)
  assert.equal(isRunActive({ state: 'done' }), false)
  assert.equal(isRunActive({ state: 'failed' }), false)
})

for (const [name, make] of [
  ['http', () => createHttpAdapter({ baseUrl: 'http://gw', store: memoryStore(), fetch: fakeGateway({ stepsToDone: 2 }).fetch })],
  ['mock', () => createMockAdapter()],
]) {
  test(`${name} adapter: agent lifecycle — plan, run, review, approve, chain to done`, async () => {
    const adapter = make()
    const caps = await adapter.capabilities()
    assert.ok(caps.agent, 'both adapters declare agent')
    const instructions = await adapter.agent.instructions()
    assert.equal(instructions.length, 2)
    const scene = instructions.find((i) => !i.count_locked).id
    const single = instructions.find((i) => i.count_locked).id
    const referenceId = name === 'http' ? 'ref-1' : 'ember'

    const plan = await adapter.agent.plan({ referenceId, instruction: scene, count: 3 })
    assert.equal(plan.scripts.length, 3)
    await assert.rejects(adapter.agent.plan({ referenceId, instruction: single, count: 2 }), (e) => e.status === 422)
    await assert.rejects(adapter.agent.plan({ referenceId, instruction: 'nope', count: 1 }), (e) => e.status === 404)

    let run = await adapter.agent.createRun({ projectId: 'p1', referenceId, instruction: scene, count: 2 })
    assert.equal(run.state, 'planning')
    run = await adapter.agent.run(run.id)
    assert.equal(run.state, 'review')
    assert.equal(run.scripts.length, 2)
    assert.equal(run.clips[1].script, run.scripts[1])

    run = await adapter.agent.editScript(run.id, 2, '  slower  ')
    assert.equal(run.scripts[1], 'slower')
    run = await adapter.agent.rewriteScript(run.id, 1)
    assert.match(run.scripts[0], /rewritten/)
    await assert.rejects(adapter.agent.editScript(run.id, 9, 'x'), (e) => e.status === 404)
    await assert.rejects(adapter.agent.resume(run.id), (e) => e.status === 409)

    run = await adapter.agent.approve(run.id)
    assert.equal(run.state, 'queued')
    await assert.rejects(adapter.agent.approve(run.id), (e) => e.status === 409)
    await assert.rejects(adapter.agent.editScript(run.id, 1, 'late'), (e) => e.status === 409)

    const seen = new Set()
    for (let i = 0; i < 30 && isRunActive(run); i++) {
      run = await adapter.agent.run(run.id)
      seen.add(run.state)
    }
    assert.equal(run.state, 'done')
    assert.ok(seen.has('rendering'))
    assert.ok(run.clips.every((c) => c.media_id), 'every clip has media')
    assert.equal(run.step, 'Done')
    assert.equal((await adapter.agent.listRuns('p1')).length, 1)
    assert.equal((await adapter.agent.listRuns('other')).length, 0)
  })

  test(`${name} adapter: a failing clip → failed → resume`, async () => {
    const adapter = make()
    const scene = (await adapter.agent.instructions()).find((i) => !i.count_locked).id
    const referenceId = name === 'http' ? 'ref-1' : 'ember'
    let run = await adapter.agent.createRun({ referenceId, instruction: scene, count: 1, autostart: true })
    run = await adapter.agent.run(run.id)
    assert.equal(run.state, 'queued', 'autostart skips review')
    // force a failure the way the fakes understand it: a script containing FAIL — only editable in review,
    // so create another run without autostart for that path
    let r2 = await adapter.agent.createRun({ referenceId, instruction: scene, count: 1 })
    r2 = await adapter.agent.run(r2.id)
    r2 = await adapter.agent.editScript(r2.id, 1, 'please FAIL')
    r2 = await adapter.agent.approve(r2.id)
    for (let i = 0; i < 10 && isRunActive(r2); i++) r2 = await adapter.agent.run(r2.id)
    assert.equal(r2.state, 'failed')
    assert.match(r2.step, /Failed at clip 1/)
    r2 = await adapter.agent.resume(r2.id)
    assert.equal(r2.state, 'queued')
    assert.equal(r2.clips[0].job_id, null)
  })
}
