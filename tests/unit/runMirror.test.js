import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batchFromRun, patchFromRun, reconcileRuns, isRunBatch } from '../../src/adapter/runMirror.js'

const run = (over = {}) => ({
  id: 'run_1', title: '🔥 The Reveal', state: 'planning', step: 'Writing 3 scripts…', clip_index: 0, clip_count: 3, count: 3,
  values: { size: '832x480', length: 10 }, reference_id: 'in:seed.png', error: null, created_at: 100,
  clips: [1, 2, 3].map((n) => ({ n, script: null, job_id: null, media_id: null, status: 'pending', progress: null, error: null })),
  ...over,
})

test('batchFromRun: one pending video item per clip, titled by the run, tagged with runId', () => {
  const b = batchFromRun(run(), { createdAt: 'Sep 7, 2026' })
  assert.equal(b.runId, 'run_1')
  assert.equal(b.type, 'video')
  assert.equal(b.prompt, '🔥 The Reveal')
  assert.equal(b.items.length, 3)
  assert.deepEqual(b.items.map((i) => i.status), ['pending', 'pending', 'pending'])
  assert.deepEqual(b.items.map((i) => i.clipIndex), [0, 1, 2])
  assert.equal(b.resolution, '832x480')
  assert.equal(b.runStep, 'Writing 3 scripts…')
  assert.ok(isRunBatch(b) && !isRunBatch({ id: 'x' }))
})

test('patchFromRun mirrors each clip: running progress, done assetKey, failed error, step on the batch', () => {
  const b = batchFromRun(run(), { createdAt: 'x' })
  const r = run({
    state: 'rendering', step: 'Rendering clip 2 of 3', clip_index: 1,
    clips: [
      { n: 1, status: 'done', progress: 100, media_id: 'out:j1.mp4', error: null },
      { n: 2, status: 'running', progress: 42.6, media_id: null, error: null },
      { n: 3, status: 'pending', progress: null, media_id: null, error: null },
    ],
  })
  const { batch, items } = patchFromRun(b, r)
  assert.equal(batch.runStep, 'Rendering clip 2 of 3')
  assert.equal(batch.runState, 'rendering')
  const [i1, i2, i3] = b.items.map((it) => items[it.id])
  assert.deepEqual(i1, { status: 'done', progress: 100, assetKey: 'out:j1.mp4' })
  assert.deepEqual(i2, { status: 'running', progress: 43 })
  assert.deepEqual(i3, { status: 'pending', progress: null })

  const failed = patchFromRun(b, run({ state: 'failed', step: 'Failed at clip 1: cuda oom', error: 'cuda oom', clips: [{ n: 1, status: 'failed', progress: null, media_id: null, error: 'cuda oom' }, ...r.clips.slice(1, 3).map((c) => ({ ...c, status: 'pending' }))] }))
  assert.equal(failed.items[b.items[0].id].error, 'cuda oom')
  assert.equal(failed.batch.runStep, 'Failed at clip 1: cuda oom')

  const done = patchFromRun(b, run({ state: 'done', step: 'Done' }))
  assert.equal(done.batch.runStep, null, 'no step label once done — the batch reads like any other')
  assert.equal(patchFromRun(b, run({ state: 'queued', clips: [{ n: 1, status: 'queued' }] })).items[b.items[0].id].status, 'pending')
})

test('reconcileRuns: adds missing, patches existing, skips deleted', () => {
  const existing = batchFromRun(run({ id: 'run_a' }), { createdAt: 'x' })
  const runs = [run({ id: 'run_a', state: 'review', step: 'Waiting for review' }), run({ id: 'run_b' }), run({ id: 'run_c' })]
  const { add, patches } = reconcileRuns([existing], runs, { createdAt: 'y', deletedRunIds: new Set(['run_c']) })
  assert.deepEqual(add.map((b) => b.runId), ['run_b'])
  assert.equal(patches.length, 1)
  assert.equal(patches[0].batchId, existing.id)
  assert.equal(patches[0].patch.batch.runStep, 'Waiting for review')
  assert.deepEqual(reconcileRuns(null, [], { createdAt: 'y' }), { add: [], patches: [] })
})

// --- the watcher and the adapters' mirror methods (STORY-604) ---
import { memoryStore } from '../../src/adapter/store.js'
import { makeRunWatcher } from '../../src/adapter/runMirror.js'
import { createHttpAdapter } from '../../src/adapter/http.js'
import { createMockAdapter } from '../../src/data/index.js'
import { fakeGateway } from './fakeGateway.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

test('makeRunWatcher: mirrors each poll, persists, stops on terminal, synthesises failed on 404', async () => {
  const db = memoryStore()
  const states = ['queued', 'rendering', 'done']
  let i = 0
  const fetchRun = async () => {
    const s = states[Math.min(i++, states.length - 1)]
    return run({ state: s, step: s, clips: [{ n: 1, status: s === 'done' ? 'done' : 'running', progress: s === 'done' ? 100 : 50, media_id: s === 'done' ? 'out:a.mp4' : null }], clip_count: 1, count: 1 })
  }
  const watchRun = makeRunWatcher({ fetchRun, db, pollMs: 1 })
  const batch = batchFromRun(run({ clip_count: 1, count: 1, clips: [{ n: 1, status: 'pending' }] }), { createdAt: 'x' })
  const seen = []
  const stop = watchRun('p', batch, (patch) => seen.push(patch.batch.runState))
  await wait(60)
  stop()
  assert.deepEqual(seen, ['queued', 'rendering', 'done'])
  const stored = (await db.listBatches('p'))[0]
  assert.equal(stored.items[0].assetKey, 'out:a.mp4')
  assert.equal(stored.runState, 'done')

  const gone = makeRunWatcher({ fetchRun: async () => { throw Object.assign(new Error('nope'), { status: 404 }) }, db, pollMs: 1 })
  const seen2 = []
  gone('p', batch, (patch) => seen2.push(patch.batch.runState))
  await wait(20)
  assert.deepEqual(seen2, ['failed'])
})

for (const [name, make] of [
  ['http', () => createHttpAdapter({ baseUrl: 'http://gw', store: memoryStore(), fetch: fakeGateway({ stepsToDone: 2 }).fetch, pollMs: 1 })],
  ['mock', () => createMockAdapter({ tickMs: 1 })],
]) {
  test(`${name} adapter: mirrorRun, reconcileRuns honours deletion, watchRun fills the batch`, async () => {
    const adapter = make()
    const scene = (await adapter.agent.instructions()).find((i) => !i.count_locked).id
    const referenceId = name === 'http' ? 'ref-1' : 'ember'
    const r1 = await adapter.agent.createRun({ projectId: 'p', referenceId, instruction: scene, count: 2, autostart: true })
    const b1 = await adapter.mirrorRun('p', r1)
    assert.equal(b1.runId, r1.id)
    assert.equal(b1.items.length, 2)
    assert.equal((await adapter.listBatches('p'))[0].id, b1.id)

    // a second run the browser has never mirrored → reconcile adds it; the deleted one stays gone
    const r2 = await adapter.agent.createRun({ projectId: 'p', referenceId, instruction: scene, count: 1, autostart: true })
    await adapter.deleteBatch('p', b1.id)
    const { add, patches } = await adapter.reconcileRuns('p', await adapter.listBatches('p'))
    assert.deepEqual(add.map((b) => b.runId), [r2.id], 'r1 was deleted by the user and must not come back')
    assert.equal(patches.length, 0)

    // watchRun drives the mirrored batch to done
    const b2 = add[0]
    let last = null
    const stop = adapter.watchRun('p', b2, (patch) => { last = patch })
    for (let i = 0; i < 200 && last?.batch?.runState !== 'done'; i++) await wait(5)
    stop()
    assert.equal(last.batch.runState, 'done')
    const stored = (await adapter.listBatches('p')).find((b) => b.id === b2.id)
    assert.ok(stored.items.every((it) => it.status === 'done' && it.assetKey), JSON.stringify(stored.items))
  })
}
