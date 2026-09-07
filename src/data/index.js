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
import { GatewayError } from '../adapter/http.js'
import { batchFromRun, makeRunWatcher, reconcileRuns } from '../adapter/runMirror.js'

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
  const agent = mockAgent({ pool: MOCK_POOL, uuid })

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

    /** Mock agent (v1.1): canned scripts, and a run that advances one step per poll — like the Python fake. */
    agent,

    async mirrorRun(projectId, run) {
      const batch = batchFromRun(run, { createdAt: formatCreatedAt(), modelName: caps.name })
      await db.putBatch(projectId, batch)
      return batch
    },
    async reconcileRuns(projectId, batches) {
      const out = reconcileRuns(batches, await agent.listRuns(projectId), { createdAt: formatCreatedAt(), deletedRunIds: new Set(await db.forgottenRuns(projectId)), modelName: caps.name })
      for (const b of out.add) await db.putBatch(projectId, b)
      return out
    },
    watchRun: makeRunWatcher({ fetchRun: (id) => agent.run(id), db, pollMs: tickMs }),
  }
}

const MOCK_INSTRUCTIONS = [
  { id: 'mock-scene', name: 'mock-scene', description: 'Writes N clips that continue the seed.', count_locked: false },
  { id: 'mock-single', name: 'mock-single', description: 'One clip, one paragraph.', count_locked: true },
]

const stepLabel = (r) => ({
  planning: `Writing ${r.count} script${r.count === 1 ? '' : 's'}…`, review: 'Waiting for review',
  queued: r.clip_index === 0 ? 'Queued' : `Caching clip ${r.clip_index}`, rendering: `Rendering clip ${r.clip_index + 1} of ${r.count}`,
  paused: `Paused: ${r.error ?? 'gate'}`, failed: `Failed at clip ${r.clip_index + 1}: ${r.error ?? 'unknown'}`, done: 'Done',
})[r.state]

const fail = (message, status) => Object.assign(new GatewayError(status, message), { detail: message })

export function mockAgent({ pool, uuid: makeId, ticks = 3 }) {
  const runs = new Map()
  let assetIdx = 0
  const script = (n, count, extra = '') => `[0:00-0:04] Clip ${n} of ${count} begins${extra}.\n[0:04-0:08] The colour deepens.\n[0:08-0:10] It settles.`
  const instruction = (id, count) => {
    const i = MOCK_INSTRUCTIONS.find((x) => x.id === id)
    if (!i) throw fail(`unknown instruction "${id}"`, 404)
    if (i.count_locked && count !== 1) throw fail(`"${id}" writes a single clip; count must be 1`, 422)
    return i
  }
  const get = (id) => {
    const r = runs.get(id)
    if (!r) throw fail(`unknown run "${id}"`, 404)
    return r
  }
  const review = (id) => {
    const r = get(id)
    if (r.state !== 'review') throw fail(`scripts can only change while the run is in review (it is ${r.state})`, 409)
    return r
  }
  const snapshot = (r) => ({ ...r, step: stepLabel(r), clips: r.clips.map((c) => ({ ...c })), scripts: [...r.scripts], titles: [...r.titles] })

  return {
    async instructions() { return MOCK_INSTRUCTIONS.map((i) => ({ ...i })) },
    async plan({ instruction: id, count }) {
      instruction(id, count)
      const scripts = Array.from({ length: count }, (_, i) => script(i + 1, count))
      return { instruction: id, count, scripts, titles: ['🎨 Solid Colours', '🟦 Blue Period'], summary: `Solid Colours (${count} × 10 s)`, attempts: 1, model: 'mock' }
    },
    async createRun({ projectId = null, referenceId, instruction: id, count, values = {}, autostart = false }) {
      instruction(id, count)
      const r = {
        id: `run_${makeId().slice(0, 12)}`, project_id: projectId, title: 'Untitled run', state: 'planning', clip_index: 0, clip_count: count,
        instruction: id, count, values: { ...values }, reference_id: referenceId, scripts: [], titles: [], summary: null,
        clips: Array.from({ length: count }, (_, i) => ({ n: i + 1, script: null, job_id: null, media_id: null, status: 'pending', progress: null, error: null })),
        autostart, error: null, created_at: Date.now() / 1000, polls: 0,
      }
      runs.set(r.id, r)
      return snapshot(r)
    },
    async listRuns(projectId) {
      return [...runs.values()].filter((r) => projectId == null || r.project_id === projectId).sort((a, b) => b.created_at - a.created_at).map(snapshot)
    },
    async run(id) {
      const r = get(id)
      if (r.state === 'planning') {
        const p = await this.plan({ referenceId: r.reference_id, instruction: r.instruction, count: r.count })
        r.scripts = p.scripts; r.titles = p.titles; r.summary = p.summary; r.title = p.titles[0]
        r.clips.forEach((c, i) => { c.script = p.scripts[i] })
        r.state = r.autostart ? 'queued' : 'review'
      } else if (r.state === 'queued' || r.state === 'rendering') {
        const c = r.clips[r.clip_index]
        if (!c.job_id) { c.job_id = `mock-${makeId().slice(0, 8)}`; c.status = 'running'; c.progress = 0; r.state = 'rendering'; r.polls = 0 }
        else if (c.script && c.script.includes('FAIL')) { c.status = 'failed'; c.error = 'script asked to fail'; r.state = 'failed'; r.error = c.error }
        else if (++r.polls >= ticks) { c.status = 'done'; c.progress = 100; c.media_id = pool[assetIdx++ % pool.length]; r.clip_index += 1; r.state = r.clip_index >= r.count ? 'done' : 'queued' }
        else { c.progress = Math.round((100 * r.polls) / ticks) }
      }
      return snapshot(r)
    },
    async editScript(id, n, text) {
      const r = review(id)
      if (n < 1 || n > r.count) throw fail(`run has ${r.count} scripts; no script ${n}`, 404)
      r.scripts[n - 1] = String(text).trim(); r.clips[n - 1].script = r.scripts[n - 1]
      return snapshot(r)
    },
    async rewriteScript(id, n) {
      const r = review(id)
      if (n < 1 || n > r.count) throw fail(`run has ${r.count} scripts; no script ${n}`, 404)
      r.scripts[n - 1] = script(n, r.count, ', rewritten'); r.clips[n - 1].script = r.scripts[n - 1]
      return snapshot(r)
    },
    async approve(id) { const r = review(id); r.state = 'queued'; r.error = null; return snapshot(r) },
    async resume(id) {
      const r = get(id)
      if (!['failed', 'paused'].includes(r.state)) throw fail(`only a failed or paused run can be resumed (it is ${r.state})`, 409)
      const c = r.clips[r.clip_index]; Object.assign(c, { job_id: null, status: 'pending', progress: null, error: null })
      r.state = 'queued'; r.error = null
      return snapshot(r)
    },
  }
}
