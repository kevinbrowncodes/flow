/**
 * HTTP adapter — speaks the Flow Gateway Protocol (protocol/PROTOCOL.md) to a
 * model repo's `/flow/*` router. This is the adapter the standalone bundle
 * uses when a gateway serves it.
 *
 *   GET  /flow/capabilities            → Capabilities
 *   POST /flow/generate                → Job          (one output per call)
 *   GET  /flow/jobs/{id}               → Job
 *   GET  /flow/media                   → MediaAsset[]
 *   POST /flow/uploads  (multipart)    → MediaAsset
 *   GET  /flow/media/{id}?type=FULL|THUMBNAIL → bytes
 *
 * Projects and batches are client-side (see store.js); the gateway is
 * stateless apart from jobs and files.
 */
import {
  assertCapabilities,
  buildPendingBatch,
  valueByRole,
  findMode,
  formatCreatedAt,
  formatProjectTitle,
  jobToItemPatch,
  applyPatch,
  isPending,
  uuid,
  ContractError,
  TERMINAL,
} from './contract.js'
import { localStorageStore, memoryStore } from './store.js'

const JSON_HEADERS = { 'content-type': 'application/json' }

export class GatewayError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'GatewayError'
    this.status = status
  }
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.baseUrl='']       gateway origin; '' = same origin as the page
 * @param {import('./store.js').BatchStore} [opts.store]
 * @param {number} [opts.pollMs=1000]
 * @param {typeof fetch} [opts.fetch]      injectable for tests
 * @param {(d?: Date) => string} [opts.now] injectable clock for tests
 */
export function createHttpAdapter({ baseUrl = '', store, pollMs = 1000, fetch: fetchImpl, now } = {}) {
  const base = String(baseUrl).replace(/\/+$/, '')
  const doFetch = fetchImpl ?? ((...a) => globalThis.fetch(...a))
  const db = store ?? (typeof globalThis.localStorage !== 'undefined' ? localStorageStore(base || 'same-origin') : memoryStore())
  const clock = now ?? (() => new Date())
  let capsPromise = null

  async function api(path, init) {
    let res
    try {
      res = await doFetch(`${base}/flow${path}`, init)
    } catch (e) {
      throw new GatewayError(0, `Cannot reach gateway at ${base || 'this origin'} (${e.message})`)
    }
    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail ?? body)
      } catch {
        /* non-JSON error body */
      }
      throw new GatewayError(res.status, `${init?.method ?? 'GET'} /flow${path} → ${res.status}${detail ? `: ${detail}` : ''}`)
    }
    return res.json()
  }

  const capabilities = () => {
    capsPromise ??= api('/capabilities')
      .then(assertCapabilities)
      .catch((e) => {
        capsPromise = null // let the next call retry
        throw e
      })
    return capsPromise
  }

  /** Named, not a method: the adapter is often destructured, so `this` is unsafe. */
  async function createProject() {
    const d = clock()
    const project = { id: uuid(), title: formatProjectTitle(d), createdAt: d.toISOString() }
    await db.putProject(project)
    return project
  }

  return {
    capabilities,
    createProject,

    /** What the About panel reports (STORY-208). '' means the page's own
     *  origin, which is the usual self-hosted case. */
    gatewayUrl: base || 'same origin',

    async getDefaultProjectId() {
      const projects = await db.listProjects()
      if (projects.length) return projects[0].id
      return (await createProject()).id
    },

    /** Newest first — the home grid's order (STORY-208). */
    async listProjects() {
      const projects = await db.listProjects()
      return projects.slice().sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    },

    /** Empty or whitespace-only titles are refused: the project keeps its name. */
    async renameProject(id, title) {
      const project = await db.getProject(id)
      if (!project) return null
      const next = String(title ?? '').trim()
      if (!next) return project
      const updated = { ...project, title: next }
      await db.putProject(updated)
      return updated
    },

    /** Removes the project and its batches. Media stays on the gateway — the
     *  protocol has no delete, and the clips remain in the asset picker. */
    deleteProject: (id) => db.deleteProject(id),

    getProject: (id) => db.getProject(id),
    listBatches: (projectId) => db.listBatches(projectId),
    deleteBatch: (projectId, batchId) => db.deleteBatch(projectId, batchId),

    getMediaUrl(mediaId, type = 'FULL') {
      if (!mediaId) return null
      return `${base}/flow/media/${encodeURIComponent(mediaId)}?type=${type === 'THUMBNAIL' ? 'THUMBNAIL' : 'FULL'}`
    },

    listMedia: () => api('/media'),

    async uploadMedia(_projectId, file) {
      const form = new FormData()
      form.append('file', file, file.name)
      return api('/uploads', { method: 'POST', body: form })
    },

    async generate(projectId, { mode: modeKey, prompt, values, referenceId = null }) {
      const caps = await capabilities()
      const mode = findMode(caps, modeKey)
      if (!mode) throw new ContractError(`unknown mode "${modeKey}"`)
      if (caps.reference === 'required' && !referenceId) throw new ContractError(`${caps.name} needs a reference asset`)
      const count = Math.max(1, Number(valueByRole(mode, values, 'count') ?? 1) || 1)
      const body = JSON.stringify({ mode: modeKey, prompt, values, reference_id: referenceId })
      const jobs = await Promise.all(
        Array.from({ length: count }, () =>
          api('/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body }),
        ),
      )
      const batch = buildPendingBatch({ caps, mode, prompt, values, referenceId, jobs, createdAt: formatCreatedAt(clock()) })
      await db.putBatch(projectId, batch)
      return batch
    },

    /** Polls each unfinished item's job until every item is terminal. */
    watch(projectId, batch, onUpdate) {
      let stopped = false
      let timer = null
      let current = batch
      const open = new Map(batch.items.filter((it) => !TERMINAL.has(it.status) && it.jobId).map((it) => [it.id, it.jobId]))

      const tick = async () => {
        if (stopped) return
        const caps = await capabilities().catch(() => null)
        if (stopped) return
        const items = {}
        const batchPatch = {}
        for (const [itemId, jobId] of open) {
          let job
          try {
            job = await api(`/jobs/${encodeURIComponent(jobId)}`)
          } catch (e) {
            if (e.status === 404) job = { id: jobId, status: 'failed', error: 'Job not found on gateway (it may have restarted)' }
            else continue // transient: try again next tick
          }
          if (stopped) return
          items[itemId] = jobToItemPatch(job, caps ?? { progress: 'none' })
          if (TERMINAL.has(job.status)) {
            open.delete(itemId)
            if (job.status === 'done' && !current.resolution && job.width && job.height) {
              batchPatch.resolution = `${job.width}x${job.height}`
            }
          }
        }
        const patch = { ...(Object.keys(batchPatch).length ? { batch: batchPatch } : {}), items }
        current = applyPatch(current, patch)
        await db.putBatch(projectId, current)
        if (stopped) return
        onUpdate(patch)
        if (!isPending(current) || open.size === 0) {
          stopped = true
          return
        }
        timer = setTimeout(tick, pollMs)
      }
      tick()
      return () => {
        stopped = true
        if (timer) clearTimeout(timer)
      }
    },

    estimateCost: () => null,

    /** Agent mode (v1.1): thin wrappers over /flow/agent/*. Only meaningful when capabilities.agent. */
    agent: {
      instructions: () => api('/agent/instructions'),
      plan: ({ referenceId, instruction, count }) =>
        api('/agent/plan', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ reference_id: referenceId, instruction, count }) }),
      createRun: ({ projectId = null, referenceId, instruction, count, values = {}, autostart = false }) =>
        api('/agent/runs', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ project_id: projectId, reference_id: referenceId, instruction, count, values, autostart }) }),
      listRuns: (projectId) => api(projectId ? `/agent/runs?project_id=${encodeURIComponent(projectId)}` : '/agent/runs'),
      run: (runId) => api(`/agent/runs/${encodeURIComponent(runId)}`),
      editScript: (runId, n, text) =>
        api(`/agent/runs/${encodeURIComponent(runId)}/scripts/${n}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ text }) }),
      rewriteScript: (runId, n) => api(`/agent/runs/${encodeURIComponent(runId)}/scripts/${n}/rewrite`, { method: 'POST' }),
      approve: (runId) => api(`/agent/runs/${encodeURIComponent(runId)}/approve`, { method: 'POST' }),
      resume: (runId) => api(`/agent/runs/${encodeURIComponent(runId)}/resume`, { method: 'POST' }),
    },
  }
}
