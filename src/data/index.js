/**
 * The mock adapter — fixtures plus a fake generation engine.
 *
 * Implements the same `Adapter` contract (src/adapter/contract.js) as the
 * HTTP adapter, so the editor never learns which one it is talking to. This
 * is what `npm run dev` and the pixel-conformance suite run against.
 *
 * Media resolution mirrors Flow's real endpoint (RECON-02):
 *   media.getMediaUrlRedirect?name={uuid}&mediaUrlType=FULL|THUMBNAIL
 */
import { PROJECT, OLDER_PROJECTS, BATCHES, ASSETS, MOCK_POOL } from './fixtures.js'
import { MOCK_CAPABILITIES, estimateCost } from './outputSettings.js'
import { assertCapabilities, buildPendingBatch, findMode, valueByRole, formatCreatedAt, formatProjectTitle, applyPatch, uuid, ContractError } from '../adapter/contract.js'
import { memoryStore } from '../adapter/store.js'

/** RECON-04 §8: image ×2 batch took EST 20–30s end to end. */
export const GENERATION_MS = 22000
const TICK_MS = 900

/**
 * @param {Object} [opts]
 * @param {number} [opts.generationMs]  wall time for a batch (default 22s; pass 1500 for dev)
 * @param {number} [opts.tickMs]
 */
export function createMockAdapter({ generationMs = GENERATION_MS, tickMs = TICK_MS } = {}) {
  const caps = assertCapabilities(MOCK_CAPABILITIES)
  const db = memoryStore({ projects: [PROJECT, ...OLDER_PROJECTS], batches: { [PROJECT.id]: BATCHES } })
  const uploads = new Map() // id → { full, thumb, name, kind }
  const pending = new Map() // batchId → { finalAssets, finalResolution, started }
  let genCount = 0

  /** Named, not a method: the adapter is often destructured, so `this` is unsafe. */
  async function createProject() {
    const d = new Date()
    const project = { id: uuid(), title: formatProjectTitle(d), createdAt: d.toISOString() }
    await db.putProject(project)
    return project
  }

  return {
    capabilities: async () => caps,
    createProject,
    gatewayUrl: 'mock adapter (no gateway)',

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

    async renameProject(id, title) {
      const project = await db.getProject(id)
      if (!project) return null
      const next = String(title ?? '').trim()
      if (!next) return project
      const updated = { ...project, title: next }
      await db.putProject(updated)
      return updated
    },

    deleteProject: (id) => db.deleteProject(id),

    getProject: (id) => db.getProject(id),
    listBatches: (projectId) => db.listBatches(projectId),
    deleteBatch: (projectId, batchId) => db.deleteBatch(projectId, batchId),

    /** type: 'FULL' | 'THUMBNAIL' — mirrors mediaUrlType (RECON-02). */
    getMediaUrl(assetKey, type = 'FULL') {
      const a = ASSETS[assetKey] ?? uploads.get(assetKey)
      if (!a) return null
      return type === 'THUMBNAIL' ? a.thumb : a.full
    },

    async listMedia() {
      return [
        ...MOCK_POOL.map((key, i) => ({ id: key, name: `clip-${key}.mp4`, kind: 'video', source: i === 0 ? 'upload' : 'output' })),
        ...[...uploads].map(([id, u]) => ({ id, name: u.name, kind: u.kind, source: 'upload' })),
      ]
    },

    async uploadMedia(_projectId, file) {
      const url = URL.createObjectURL(file)
      const id = `upload-${uuid()}`
      const kind = file.type.startsWith('video') ? 'video' : 'image'
      uploads.set(id, { full: url, thumb: url, name: file.name, kind })
      return { id, name: file.name, kind, source: 'upload' }
    },

    async generate(projectId, { mode: modeKey, prompt, values, referenceId = null }) {
      const mode = findMode(caps, modeKey)
      if (!mode) throw new ContractError(`unknown mode "${modeKey}"`)
      const count = Math.max(1, Number(valueByRole(mode, values, 'count') ?? 1) || 1)
      const jobs = Array.from({ length: count }, () => ({ id: uuid(), status: 'running', progress: 0 }))
      const batch = buildPendingBatch({ caps, mode, prompt, values, referenceId, jobs, createdAt: formatCreatedAt() })
      pending.set(batch.id, {
        finalAssets: Array.from({ length: count }, () => MOCK_POOL[genCount++ % MOCK_POOL.length]),
        finalResolution: modeKey === 'video' ? '720p' : '1376x768', // RECON-04 §8 observed
        started: Date.now(),
      })
      await db.putBatch(projectId, batch)
      return batch
    },

    /** Fake engine: linear % counter, then everything lands at once (STORY-307). */
    watch(projectId, batch, onUpdate) {
      let current = batch
      const p = pending.get(batch.id) ?? {
        finalAssets: batch.items.map(() => MOCK_POOL[genCount++ % MOCK_POOL.length]),
        finalResolution: batch.type === 'video' ? '720p' : '1376x768',
        started: Date.now(),
      }
      const timer = setInterval(() => {
        const elapsed = Date.now() - p.started
        let patch
        if (elapsed >= generationMs) {
          clearInterval(timer)
          pending.delete(batch.id)
          patch = {
            batch: { resolution: p.finalResolution },
            items: Object.fromEntries(batch.items.map((it, i) => [it.id, { status: 'done', progress: 100, assetKey: p.finalAssets[i] }])),
          }
        } else {
          const progress = Math.min(99, Math.round((elapsed / generationMs) * 100))
          patch = { items: Object.fromEntries(batch.items.map((it) => [it.id, { progress }])) }
        }
        current = applyPatch(current, patch)
        db.putBatch(projectId, current)
        onUpdate(patch)
      }, tickMs)
      return () => clearInterval(timer)
    },

    estimateCost,
  }
}
