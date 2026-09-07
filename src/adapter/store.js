/**
 * Where projects and batches live on the client. Media stays on the gateway;
 * only metadata is stored here. Pluggable so a gateway that grows a
 * `/flow/batches` endpoint (additive, future protocol minor) can replace it.
 *
 * @typedef {Object} BatchStore
 * @property {() => Promise<Object[]>} listProjects
 * @property {(id: string) => Promise<Object|null>} getProject
 * @property {(project: Object) => Promise<void>} putProject
 * @property {(id: string) => Promise<void>} deleteProject          drops the project AND its batches
 * @property {(projectId: string) => Promise<Object[]>} listBatches
 * @property {(projectId: string, batch: Object) => Promise<void>} putBatch   upsert; new batches go first
 * @property {(projectId: string, batchId: string) => Promise<void>} deleteBatch
 */

const clone = (v) => JSON.parse(JSON.stringify(v))

function fromState(read, write) {
  return {
    async listProjects() {
      return clone(read().projects)
    },
    async getProject(id) {
      const p = read().projects.find((x) => x.id === id)
      return p ? clone(p) : null
    },
    async putProject(project) {
      const s = read()
      const i = s.projects.findIndex((x) => x.id === project.id)
      if (i >= 0) s.projects[i] = clone(project)
      else s.projects.push(clone(project))
      write(s)
    },
    async deleteProject(id) {
      // The batches go with it — orphaned batches would leak storage forever
      // and can never be reached again (STORY-208).
      const s = read()
      s.projects = s.projects.filter((x) => x.id !== id)
      delete s.batches[id]
      write(s)
    },
    async listBatches(projectId) {
      return clone(read().batches[projectId] ?? [])
    },
    async putBatch(projectId, batch) {
      const s = read()
      const list = s.batches[projectId] ?? (s.batches[projectId] = [])
      const i = list.findIndex((b) => b.id === batch.id)
      if (i >= 0) list[i] = clone(batch)
      else list.unshift(clone(batch)) // newest first (RECON-04 §8)
      write(s)
    },
    async deleteBatch(projectId, batchId) {
      const s = read()
      s.batches[projectId] = (s.batches[projectId] ?? []).filter((b) => b.id !== batchId)
      write(s)
    },
  }
}

/** In-memory store. `seed` = { projects: [], batches: { [projectId]: Batch[] } }. */
export function memoryStore(seed = {}) {
  const state = { projects: clone(seed.projects ?? []), batches: clone(seed.batches ?? {}) }
  return fromState(
    () => state,
    () => {},
  )
}

/**
 * localStorage-backed store, namespaced per gateway so two gateways on one
 * origin don't share history. Falls back to memory when storage is unavailable
 * (private mode, blocked site data).
 */
export function localStorageStore(namespace = 'default') {
  const key = `flow:${namespace}:v1`
  let cache = null
  const read = () => {
    if (cache) return cache
    try {
      const raw = globalThis.localStorage?.getItem(key)
      cache = raw ? JSON.parse(raw) : null
    } catch {
      cache = null
    }
    if (!cache || typeof cache !== 'object') cache = { projects: [], batches: {} }
    cache.projects ??= []
    cache.batches ??= {}
    return cache
  }
  const write = (s) => {
    cache = s
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(s))
    } catch {
      /* quota / privacy mode: keep the in-memory copy */
    }
  }
  return fromState(read, write)
}
