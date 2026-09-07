/**
 * A run mirrored into the project as one batch (STORY-604, D21). Pure functions:
 * the reducer applies what these return, and the watcher feeds them fresh runs.
 */
import { uuid, aspectFromSize, RUN_TERMINAL } from './contract.js'

const CLIP_STATUS = { pending: 'pending', running: 'running', queued: 'pending', done: 'done', failed: 'failed' }

/** A brand-new batch for a run, one pending item per clip. */
export function batchFromRun(run, { createdAt, modelName = null }) {
  const items = Array.from({ length: run.clip_count }, (_, i) => ({
    id: uuid(),
    type: 'video',
    status: 'pending',
    progress: null,
    assetKey: null,
    jobId: null,
    error: null,
    clipIndex: i,
  }))
  const v = run.values ?? {}
  const size = v.size ?? null
  const length = v.length ?? v.duration ?? null
  return applyRunToBatch(
    {
      id: uuid(),
      runId: run.id,
      type: 'video',
      mode: 'video',
      prompt: run.title,
      model: modelName,
      aspect: v.aspect ?? (size ? aspectFromSize(size) : null),
      duration: length,
      resolution: size,
      createdAt,
      referenceKey: run.reference_id ?? null,
      values: { ...v },
      items,
    },
    run,
  )
}

/** Item patches for an existing batch from a fresh run (what BATCH_PATCH consumes). */
export function patchFromRun(batch, run) {
  const items = {}
  batch.items.forEach((item, i) => {
    const clip = run.clips?.[i]
    if (!clip) return
    const status = CLIP_STATUS[clip.status] ?? 'pending'
    const patch = { status }
    if (status === 'running') patch.progress = clip.progress == null ? 0 : Math.max(0, Math.min(99, Math.round(clip.progress)))
    if (status === 'done') {
      patch.progress = 100
      patch.assetKey = clip.media_id ?? item.assetKey
    }
    if (status === 'pending') patch.progress = null
    if (status === 'failed') patch.error = clip.error ?? run.error ?? 'failed'
    items[item.id] = patch
  })
  const step = ['done', 'failed'].includes(run.state) && run.state === 'done' ? null : run.step
  return { batch: { prompt: run.title, runStep: step, runState: run.state, runError: run.error ?? null }, items }
}

function applyRunToBatch(batch, run) {
  const { batch: b, items } = patchFromRun(batch, run)
  return { ...batch, ...b, items: batch.items.map((it) => ({ ...it, ...(items[it.id] ?? {}) })) }
}

/**
 * Reconcile the project's batches with the backend's runs on load: a run with no
 * batch gets one; an existing batch gets patched; a deleted batch is left deleted.
 * Returns { add: Batch[], patches: [{batchId, patch}] }.
 */
export function reconcileRuns(batches, runs, { createdAt, deletedRunIds = new Set(), modelName = null }) {
  const byRun = new Map((batches ?? []).filter((b) => b.runId).map((b) => [b.runId, b]))
  const add = []
  const patches = []
  for (const run of runs ?? []) {
    const existing = byRun.get(run.id)
    if (existing) patches.push({ batchId: existing.id, patch: patchFromRun(existing, run) })
    else if (!deletedRunIds.has(run.id)) add.push(batchFromRun(run, { createdAt, modelName }))
  }
  return { add, patches }
}

export const isRunBatch = (batch) => Boolean(batch?.runId)

/**
 * The run-side twin of an adapter's `watch()`: poll the run, mirror it into the
 * batch, persist, notify; stop on a terminal state. Shared by both adapters.
 */
export function makeRunWatcher({ fetchRun, db, pollMs = 2000 }) {
  return function watchRun(projectId, batch, onUpdate) {
    let stopped = false
    let current = batch
    let timer = null
    const tick = async () => {
      if (stopped) return
      let run
      try {
        run = await fetchRun(batch.runId)
      } catch (e) {
        if (e?.status === 404) run = { id: batch.runId, state: 'failed', step: 'Run not found on gateway (it may have restarted)', error: 'run not found', clips: current.items.map((it, i) => ({ n: i + 1, status: it.status === 'done' ? 'done' : 'failed', media_id: it.assetKey, error: 'run not found' })), title: current.prompt, count: current.items.length }
        else {
          timer = setTimeout(tick, pollMs)
          return
        }
      }
      if (stopped) return
      const patch = patchFromRun(current, run)
      current = { ...current, ...patch.batch, items: current.items.map((it) => ({ ...it, ...(patch.items[it.id] ?? {}) })) }
      await db.putBatch(projectId, current)
      if (stopped) return
      onUpdate(patch)
      if (RUN_TERMINAL.has(run.state)) {
        stopped = true
        return
      }
      timer = setTimeout(tick, pollMs)
    }
    timer = setTimeout(tick, 0)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }
}

export const isRunActiveBatch = (batch) => isRunBatch(batch) && !RUN_TERMINAL.has(batch.runState ?? 'planning')
