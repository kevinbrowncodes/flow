import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PROTOCOL_VERSION,
  ContractError,
  assertCapabilities,
  aspectFromSize,
  describeBatch,
  defaultValues,
  jobToItemPatch,
  buildPendingBatch,
  applyPatch,
  isPending,
  formatValue,
} from '../../src/adapter/contract.js'
import { MOCK_CAPABILITIES } from '../../src/data/outputSettings.js'

const minimal = () => ({
  protocol: PROTOCOL_VERSION,
  name: 'Test',
  modes: [{ key: 'video', fields: [{ key: 'size', label: 'Size', type: 'choice', role: 'size', options: ['1280x720'], default: '1280x720' }] }],
})

test('mock capabilities validate and normalise', () => {
  const caps = assertCapabilities(MOCK_CAPABILITIES)
  assert.equal(caps.default_mode, 'image')
  assert.equal(caps.modes[0].fields[0].options[0].label, '16:9')
  assert.deepEqual(caps.modes[1].fields[3].options.map((o) => o.value), [4, 6, 8, 10])
  assert.equal(caps.surfaces.agent, true)
  assert.notEqual(caps, MOCK_CAPABILITIES, 'returns a new object')
})

test('defaults fill in for a minimal document', () => {
  const caps = assertCapabilities(minimal())
  assert.equal(caps.reference, 'none')
  assert.deepEqual(caps.reference_kinds, [])
  assert.equal(caps.progress, 'none')
  assert.equal(caps.credits, false)
  assert.equal(caps.modes[0].label, 'Video')
  assert.deepEqual(caps.surfaces, { agent: false, characters: false, scenes: false, tools: false, trash: false })
})

test('protocol mismatch is refused with a readable message', () => {
  assert.throws(() => assertCapabilities({ ...minimal(), protocol: 2 }), (e) => e instanceof ContractError && /protocol 2, this UI needs 1/.test(e.message))
})

test('structural errors name the path', () => {
  const bad = minimal()
  bad.modes[0].fields.push({ key: 'size', label: 'Dup', type: 'choice', options: [1], default: 1 })
  assert.throws(() => assertCapabilities(bad), /duplicate field key "size"/)
  const noDefault = minimal()
  delete noDefault.modes[0].fields[0].default
  assert.throws(() => assertCapabilities(noDefault), /default is required/)
  const badDefault = minimal()
  badDefault.modes[0].fields[0].default = '1x1'
  assert.throws(() => assertCapabilities(badDefault), /not one of the options/)
  assert.throws(() => assertCapabilities({ ...minimal(), default_mode: 'image' }), /default_mode "image" is not a mode/)
  assert.throws(() => assertCapabilities({ ...minimal(), reference: 'maybe' }), /reference must be one of/)
})

test('aspectFromSize picks the nearest common ratio', () => {
  assert.equal(aspectFromSize('1280x720'), '16:9')
  assert.equal(aspectFromSize('720x1280'), '9:16')
  assert.equal(aspectFromSize('704 × 1280'), '9:16')
  assert.equal(aspectFromSize('960x960'), '1:1')
  assert.equal(aspectFromSize('nope'), null)
  assert.equal(aspectFromSize(undefined), null)
})

test('describeBatch derives aspect from a size role and falls back to the backend name', () => {
  const caps = assertCapabilities(minimal())
  const d = describeBatch(caps, caps.modes[0], defaultValues(caps.modes[0]))
  assert.deepEqual(d, { model: 'Test', aspect: '16:9', duration: null, count: 1 })
})

test('formatValue honours roles', () => {
  assert.equal(formatValue({ role: 'duration', type: 'choice', options: [] }, 8), '8s')
  assert.equal(formatValue({ role: 'count', type: 'choice', options: [] }, 2), 'x2')
  assert.equal(formatValue({ type: 'boolean' }, true), 'On')
  assert.equal(formatValue({ type: 'choice', options: [{ value: 'a', label: 'Alpha' }] }, 'a'), 'Alpha')
})

test('jobToItemPatch respects the progress capability', () => {
  assert.deepEqual(jobToItemPatch({ status: 'running', progress: 42.4 }, { progress: 'percent' }), { status: 'running', progress: 42 })
  assert.deepEqual(jobToItemPatch({ status: 'running', progress: 100 }, { progress: 'percent' }), { status: 'running', progress: 99 })
  assert.deepEqual(jobToItemPatch({ status: 'running' }, { progress: 'none' }), { status: 'running', progress: null })
  assert.deepEqual(jobToItemPatch({ status: 'done', media_id: 'm1' }, { progress: 'none' }), { status: 'done', progress: 100, assetKey: 'm1' })
  assert.equal(jobToItemPatch({ status: 'failed' }, { progress: 'none' }).error, 'Generation failed')
})

test('buildPendingBatch + applyPatch + isPending', () => {
  const caps = assertCapabilities(MOCK_CAPABILITIES)
  const mode = caps.modes[1]
  const batch = buildPendingBatch({ caps, mode, prompt: 'p', values: defaultValues(mode), jobs: [{ id: 'j1' }, { id: 'j2' }], createdAt: 'Aug 22, 2026' })
  assert.equal(batch.type, 'video')
  assert.equal(batch.model, 'Omni Flash')
  assert.equal(batch.duration, 8)
  assert.equal(batch.resolution, null)
  assert.equal(batch.items.length, 2)
  assert.equal(batch.items[0].progress, 0)
  assert.ok(isPending(batch))
  const done = applyPatch(batch, {
    batch: { resolution: '720p' },
    items: { [batch.items[0].id]: { status: 'done', assetKey: 'a' }, [batch.items[1].id]: { status: 'failed', error: 'x' } },
  })
  assert.equal(done.resolution, '720p')
  assert.equal(done.items[0].assetKey, 'a')
  assert.ok(!isPending(done))
  assert.equal(batch.resolution, null, 'original untouched')
})
