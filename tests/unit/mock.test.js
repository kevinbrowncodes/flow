import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockAdapter } from '../../src/data/index.js'
import { defaultValues } from '../../src/adapter/contract.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

test('mock adapter runs the whole lifecycle without a browser', async () => {
  const adapter = createMockAdapter({ generationMs: 30, tickMs: 5 })
  const caps = await adapter.capabilities()
  const pid = await adapter.getDefaultProjectId()
  assert.equal((await adapter.listBatches(pid)).length, 4)

  const values = defaultValues(caps.modes[0]) // image x2
  const batch = await adapter.generate(pid, { mode: 'image', prompt: 'a lagoon', values, referenceId: 'refEmber' })
  assert.equal(batch.items.length, 2)
  assert.equal(batch.model, 'Nano Banana 2')
  assert.equal(batch.resolution, null)

  const seen = []
  adapter.watch(pid, batch, (p) => seen.push(p))
  await sleep(80)
  const done = (await adapter.listBatches(pid))[0]
  assert.equal(done.prompt, 'a lagoon', 'prepended')
  assert.equal(done.resolution, '1376x768')
  assert.ok(done.items.every((it) => it.status === 'done' && adapter.getMediaUrl(it.assetKey, 'THUMBNAIL')?.endsWith('.jpg')))
  assert.ok(seen.length >= 2, 'progress ticks before completion')
  assert.equal(adapter.estimateCost('video', { model: 'Omni Flash', duration: 8, count: 2 }), 24) // RECON-04 observed anchor
  assert.equal(adapter.estimateCost('image', values), 0)
})
