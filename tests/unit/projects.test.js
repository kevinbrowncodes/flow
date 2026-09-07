/** STORY-208 — the project CRUD both adapters must implement, and the store
 *  guarantee the home page depends on: deleting a project takes its batches. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryStore, localStorageStore } from '../../src/adapter/store.js'
import { createHttpAdapter } from '../../src/adapter/http.js'
import { createMockAdapter } from '../../src/data/index.js'
import { formatProjectTitle, uuid } from '../../src/adapter/contract.js'
import { fakeGateway } from './fakeGateway.js'

const httpAdapter = (seed) =>
  createHttpAdapter({ baseUrl: 'http://gw', store: memoryStore(seed), fetch: fakeGateway() })

const seed = {
  projects: [
    { id: 'old', title: 'Aug 18 at 04:41 PM', createdAt: '2026-08-18T16:41:00' },
    { id: 'new', title: 'Aug 21 at 10:58 AM', createdAt: '2026-08-21T10:58:00' },
  ],
  batches: { old: [{ id: 'b1', items: [] }], new: [{ id: 'b2', items: [] }] },
}

test('store.deleteProject drops the project AND its batches', async () => {
  const db = memoryStore(seed)
  await db.deleteProject('old')
  assert.deepEqual((await db.listProjects()).map((p) => p.id), ['new'])
  assert.deepEqual(await db.listBatches('old'), [], 'orphaned batches would be unreachable forever')
  assert.equal((await db.listBatches('new')).length, 1, 'other projects are untouched')
})

test('deleting an unknown project is a no-op', async () => {
  const db = memoryStore(seed)
  await db.deleteProject('nope')
  assert.equal((await db.listProjects()).length, 2)
})

test('localStorage store deletes across a reload', async () => {
  const backing = new Map()
  globalThis.localStorage = {
    getItem: (k) => backing.get(k) ?? null,
    setItem: (k, v) => backing.set(k, v),
  }
  try {
    const first = localStorageStore('gw')
    await first.putProject({ id: 'p1', title: 'One', createdAt: '2026-09-01T00:00:00' })
    await first.putBatch('p1', { id: 'b', items: [] })
    await first.deleteProject('p1')
    const reloaded = localStorageStore('gw') // fresh instance, same backing store
    assert.deepEqual(await reloaded.listProjects(), [])
    assert.deepEqual(await reloaded.listBatches('p1'), [])
  } finally {
    delete globalThis.localStorage
  }
})

for (const [name, make] of [
  ['http', () => httpAdapter(seed)],
  ['mock', () => createMockAdapter()],
]) {
  test(`${name} adapter: listProjects is newest first`, async () => {
    const adapter = make()
    const list = await adapter.listProjects()
    const dates = list.map((p) => p.createdAt)
    assert.deepEqual(dates, [...dates].sort().reverse(), 'home grid shows newest first')
  })

  test(`${name} adapter: createProject titles by timestamp and lands on top`, async () => {
    const adapter = make()
    const before = (await adapter.listProjects()).length
    const project = await adapter.createProject()
    assert.match(project.title, /^[A-Z][a-z]{2} \d{1,2} at \d{1,2}:\d{2} (AM|PM)$/, project.title)
    assert.equal(project.title, formatProjectTitle(new Date(project.createdAt)))
    const list = await adapter.listProjects()
    assert.equal(list.length, before + 1)
    assert.equal(list[0].id, project.id, 'a new project is the newest')
  })

  test(`${name} adapter: renameProject persists, and refuses an empty name`, async () => {
    const adapter = make()
    const target = (await adapter.listProjects())[0]
    assert.equal((await adapter.renameProject(target.id, '  Beach scene  ')).title, 'Beach scene')
    assert.equal((await adapter.getProject(target.id)).title, 'Beach scene')
    for (const bad of ['', '   ', null, undefined]) {
      assert.equal((await adapter.renameProject(target.id, bad)).title, 'Beach scene', `rejected: ${bad}`)
    }
    assert.equal(await adapter.renameProject('does-not-exist', 'x'), null)
  })

  test(`${name} adapter: deleteProject removes it and its batches`, async () => {
    const adapter = make()
    const target = (await adapter.listProjects())[0]
    await adapter.deleteProject(target.id)
    assert.equal(await adapter.getProject(target.id), null)
    assert.deepEqual(await adapter.listBatches(target.id), [])
    assert.ok(!(await adapter.listProjects()).some((p) => p.id === target.id))
  })

  test(`${name} adapter: getDefaultProjectId creates one when the store is empty`, async () => {
    const adapter = name === 'http' ? httpAdapter({ projects: [], batches: {} }) : make()
    for (const p of await adapter.listProjects()) await adapter.deleteProject(p.id)
    const id = await adapter.getDefaultProjectId()
    assert.ok(id, 'an id is always returned')
    assert.equal((await adapter.listProjects()).length, 1)
    assert.equal(await adapter.getDefaultProjectId(), id, 'and it is stable on the next call')
  })
}

test('uuid works without crypto.randomUUID (insecure context / Node 18)', () => {
  const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  // `globalThis.crypto` is an accessor in Node 22 — assignment throws, so swap
  // the property descriptor and put the original back.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const swap = (value) => Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true })
  const real = globalThis.crypto
  try {
    // getRandomValues only — what a plain-http browser and Node 18 expose.
    swap({ getRandomValues: (b) => real.getRandomValues(b) })
    const ids = new Set(Array.from({ length: 500 }, uuid))
    assert.equal(ids.size, 500, 'no collisions')
    for (const id of ids) assert.match(id, v4)
    // No WebCrypto at all: still a valid v4, from Math.random.
    swap(undefined)
    assert.match(uuid(), v4)
  } finally {
    Object.defineProperty(globalThis, 'crypto', original)
  }
})

test('adapters report the gateway the About panel shows', async () => {
  assert.equal(httpAdapter(seed).gatewayUrl, 'http://gw')
  assert.equal(createHttpAdapter({ store: memoryStore(seed), fetch: fakeGateway() }).gatewayUrl, 'same origin')
  assert.match(createMockAdapter().gatewayUrl, /mock/)
})
