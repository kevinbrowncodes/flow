import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpAdapter, GatewayError } from '../../src/adapter/http.js'
import { memoryStore } from '../../src/adapter/store.js'
import { ContractError, defaultValues } from '../../src/adapter/contract.js'
import { fakeGateway, FAKE_CAPS } from './fakeGateway.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fixedNow = () => new Date('2026-09-05T08:12:00')

function make(opts = {}) {
  const gw = fakeGateway(opts.gateway)
  const store = memoryStore()
  const adapter = createHttpAdapter({ baseUrl: 'http://gw:8002/', store, pollMs: 2, fetch: gw.fetch, now: fixedNow, ...opts.adapter })
  return { gw, store, adapter }
}

test('capabilities are fetched once and validated', async () => {
  const { gw, adapter } = make()
  const a = await adapter.capabilities()
  const b = await adapter.capabilities()
  assert.equal(a, b)
  assert.equal(a.name, 'Fake Nano')
  assert.equal(gw.log.filter((l) => l.endsWith('/flow/capabilities')).length, 1)
})

test('a gateway on the wrong protocol is refused and retried on the next call', async () => {
  const { adapter, gw } = make({ gateway: { caps: { ...FAKE_CAPS, protocol: 99 } } })
  await assert.rejects(adapter.capabilities(), (e) => e instanceof ContractError && /protocol 99/.test(e.message))
  await assert.rejects(adapter.capabilities(), ContractError)
  assert.equal(gw.log.length, 2, 'second call hits the network again')
})

test('an unreachable gateway surfaces as GatewayError', async () => {
  const adapter = createHttpAdapter({ baseUrl: 'http://nowhere', store: memoryStore(), fetch: async () => { throw new TypeError('fetch failed') } })
  await assert.rejects(adapter.capabilities(), (e) => e instanceof GatewayError && e.status === 0 && /Cannot reach gateway/.test(e.message))
})

test('media URLs follow the protocol', async () => {
  const { adapter } = make()
  assert.equal(adapter.getMediaUrl('out/1 x.mp4', 'THUMBNAIL'), 'http://gw:8002/flow/media/out%2F1%20x.mp4?type=THUMBNAIL')
  assert.equal(adapter.getMediaUrl('m'), 'http://gw:8002/flow/media/m?type=FULL')
  assert.equal(adapter.getMediaUrl(null), null)
})

test('default project is created once and named like Flow does', async () => {
  const { adapter, store } = make()
  const id = await adapter.getDefaultProjectId()
  assert.equal(await adapter.getDefaultProjectId(), id)
  const p = await store.getProject(id)
  assert.equal(p.title, 'Sep 5 at 8:12 AM')
})

test('generate: one job per output, batch prepended and persisted', async () => {
  const { adapter, store, gw } = make()
  const caps = await adapter.capabilities()
  const values = defaultValues(caps.modes[0])
  const b1 = await adapter.generate('p1', { mode: 'video', prompt: 'first', values, referenceId: 'ref-1' })
  const b2 = await adapter.generate('p1', { mode: 'video', prompt: 'second', values: { ...values, count: 1 }, referenceId: 'ref-1' })
  assert.equal(b1.items.length, 2)
  assert.equal(b2.items.length, 1)
  assert.equal(gw.log.filter((l) => l === 'POST /flow/generate').length, 3)
  assert.equal(b1.model, 'Fake Nano')
  assert.equal(b1.aspect, '16:9')
  assert.equal(b1.createdAt, 'Sep 5, 2026')
  assert.equal(b1.items[0].status, 'queued')
  assert.equal(b1.items[0].progress, 0)
  assert.ok(b1.items[0].jobId.startsWith('job-'))
  const list = await store.listBatches('p1')
  assert.deepEqual(list.map((b) => b.prompt), ['second', 'first'])
})

test('generate: required reference is enforced before any network call', async () => {
  const { adapter, gw } = make()
  const caps = await adapter.capabilities()
  await assert.rejects(
    adapter.generate('p1', { mode: 'video', prompt: 'x', values: defaultValues(caps.modes[0]), referenceId: null }),
    (e) => e instanceof ContractError && /needs a reference asset/.test(e.message),
  )
  assert.ok(!gw.log.includes('POST /flow/generate'))
})

test('generate: gateway rejections carry the detail', async () => {
  const { adapter } = make()
  const caps = await adapter.capabilities()
  await assert.rejects(
    adapter.generate('p1', { mode: 'video', prompt: '', values: defaultValues(caps.modes[0]), referenceId: 'ref-1' }),
    (e) => e instanceof GatewayError && e.status === 422 && /prompt is required/.test(e.message),
  )
})

test('watch: polls to completion, fills resolution, persists, and stops', async () => {
  const { adapter, store, gw } = make()
  const caps = await adapter.capabilities()
  const batch = await adapter.generate('p1', { mode: 'video', prompt: 'go', values: defaultValues(caps.modes[0]), referenceId: 'ref-1' })
  const patches = []
  const stop = adapter.watch('p1', batch, (p) => patches.push(p))
  await sleep(60)
  const final = (await store.listBatches('p1'))[0]
  assert.equal(final.resolution, '1280x720')
  assert.ok(final.items.every((it) => it.status === 'done' && it.assetKey?.startsWith('out-job-')))
  const first = patches[0].items[batch.items[0].id]
  assert.equal(first.status, 'running')
  assert.equal(first.progress, 33)
  const pollsAfter = gw.log.filter((l) => l.startsWith('GET /flow/jobs/')).length
  await sleep(20)
  assert.equal(gw.log.filter((l) => l.startsWith('GET /flow/jobs/')).length, pollsAfter, 'no polling after completion')
  stop()
})

test('watch: a failed job marks its tile failed while the other completes', async () => {
  const { adapter, store } = make()
  const caps = await adapter.capabilities()
  const values = { ...defaultValues(caps.modes[0]), count: 1 }
  const ok = await adapter.generate('p1', { mode: 'video', prompt: 'fine', values, referenceId: 'ref-1' })
  const bad = await adapter.generate('p1', { mode: 'video', prompt: 'FAIL please', values, referenceId: 'ref-1' })
  adapter.watch('p1', ok, () => {})
  adapter.watch('p1', bad, () => {})
  await sleep(60)
  const [b, o] = await store.listBatches('p1')
  assert.equal(o.items[0].status, 'done')
  assert.equal(b.items[0].status, 'failed')
  assert.equal(b.items[0].error, 'boom')
})

test('watch: a job the gateway forgot becomes a failed tile, not a spinner forever', async () => {
  const { adapter, store } = make()
  const batch = {
    id: 'b-lost',
    type: 'video',
    prompt: 'lost',
    items: [{ id: 'i1', type: 'video', status: 'running', progress: 10, assetKey: null, jobId: 'job-gone' }],
  }
  await store.putBatch('p1', batch)
  adapter.watch('p1', batch, () => {})
  await sleep(20)
  const [b] = await store.listBatches('p1')
  assert.equal(b.items[0].status, 'failed')
  assert.match(b.items[0].error, /Job not found/)
})

test('watch: unsubscribe stops polling', async () => {
  const { adapter, gw } = make({ gateway: { stepsToDone: 1000 } })
  const caps = await adapter.capabilities()
  const batch = await adapter.generate('p1', { mode: 'video', prompt: 'slow', values: { ...defaultValues(caps.modes[0]), count: 1 }, referenceId: 'ref-1' })
  const stop = adapter.watch('p1', batch, () => {})
  await sleep(15)
  stop()
  const n = gw.log.filter((l) => l.startsWith('GET /flow/jobs/')).length
  assert.ok(n > 0)
  await sleep(15)
  assert.equal(gw.log.filter((l) => l.startsWith('GET /flow/jobs/')).length, n)
})

test('uploads go up as multipart and come back as assets', async () => {
  const { adapter } = make()
  const file = new File([new Uint8Array([1, 2, 3])], 'frame.png', { type: 'image/png' })
  const asset = await adapter.uploadMedia('p1', file)
  assert.equal(asset.name, 'frame.png')
  const list = await adapter.listMedia('p1')
  assert.ok(list.some((a) => a.id === asset.id))
})
