import { useEffect, useReducer, useRef, useMemo } from 'react'
import { useAdapter } from '../../adapter/useAdapter.js'
import { defaultValues, applyPatch, isPending, findMode, runFields } from '../../adapter/contract.js'
import { isRunActiveBatch, isRunBatch } from '../../adapter/runMirror.js'

/** Agent settings persist per gateway origin (STORY-602). Tolerates missing/blocked storage. */
const AGENT_KEY = 'flow:agent:v1'
export function readAgentSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(AGENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export function writeAgentSettings(agent, storage = globalThis.localStorage) {
  try {
    storage?.setItem(AGENT_KEY, JSON.stringify({ on: agent.on, instruction: agent.instruction, count: agent.count, confirm: agent.confirm, values: agent.values }))
  } catch {
    /* quota / privacy mode */
  }
}

/** The agent's initial state from capabilities, overlaid with whatever the user saved. */
export function seedAgent(caps, saved) {
  if (!caps.agent) return null
  const video = findMode(caps, 'video')
  const values = Object.fromEntries(runFields(caps).map((f) => [f.key, saved?.values?.[f.key] ?? f.default]))
  const count = Math.min(caps.agent.count.max, Math.max(caps.agent.count.min, Number(saved?.count) || caps.agent.count.default))
  return {
    on: Boolean(saved?.on),
    instruction: saved?.instruction ?? null,
    lockedCount: false,      // true while a count_locked skill is chosen
    savedCount: count,       // what to restore when an unlocked skill is chosen again
    count,
    confirm: saved?.confirm === 'never' ? 'never' : caps.agent.confirm,
    values,
    videoMode: video?.key ?? 'video',
  }
}

export const initialState = {
  caps: null, // null = loading capabilities
  batches: null, // null = loading
  error: null, // fatal: gateway unreachable, protocol mismatch
  notice: null, // transient, e.g. a rejected generate request
  filter: 'all', // all | images | videos | scenes | uploads
  search: '',
  railExpanded: true,
  view: {
    mode: 'batch', // 'grid' | 'batch' — Batch is the default (RECON-04 §4)
    gridSize: 'M',
    soundOnHover: true, // observed defaults (RECON-01)
    returnSilentVideos: true, // EST: default unobserved
    showTileDetails: true, // EST: default unobserved
    clearPromptOnSubmit: true, // observed default
  },
  output: { mode: null, values: {} }, // values: { [modeKey]: { [fieldKey]: value } } — seeded from capabilities
  reference: null, // media id attached via the asset picker
  agent: null, // null until capabilities say the backend has an agent (STORY-602)
}

export function reducer(state, action) {
  switch (action.type) {
    case 'CAPS': {
      const caps = action.caps
      return {
        ...state,
        caps,
        error: null,
        output: { mode: caps.default_mode, values: Object.fromEntries(caps.modes.map((m) => [m.key, defaultValues(m)])) },
        agent: seedAgent(caps, action.savedAgent),
      }
    }
    case 'AGENT_TOGGLE':
      return state.agent ? { ...state, agent: { ...state.agent, on: !state.agent.on }, notice: null } : state
    case 'AGENT_SET': {
      // key: 'count' | 'confirm' | 'values' (merged) — count is clamped and ignored while locked
      if (!state.agent) return state
      const a = state.agent
      if (action.key === 'values') return { ...state, agent: { ...a, values: { ...a.values, ...action.value } } }
      if (action.key === 'count') {
        if (a.lockedCount) return state
        const count = Math.min(action.max, Math.max(action.min, Number(action.value) || a.count))
        return { ...state, agent: { ...a, count, savedCount: count } }
      }
      return { ...state, agent: { ...a, [action.key]: action.value } }
    }
    case 'AGENT_INSTRUCTION': {
      // A count_locked skill forces 1; choosing an unlocked one restores the previous count.
      if (!state.agent) return state
      const locked = Boolean(action.countLocked)
      return { ...state, agent: { ...state.agent, instruction: action.id, lockedCount: locked, count: locked ? 1 : state.agent.savedCount } }
    }
    case 'LOADED':
      return { ...state, batches: action.batches }
    case 'RECONCILED': {
      // Runs the backend knows that this browser has no batch for (STORY-604), newest first.
      const patched = (state.batches ?? []).map((b) => {
        const p = action.patches.find((x) => x.batchId === b.id)
        return p ? applyPatch(b, p.patch) : b
      })
      return { ...state, batches: [...action.add, ...patched] }
    }
    case 'ERROR':
      return { ...state, error: action.error }
    case 'NOTICE':
      return { ...state, notice: action.notice }
    case 'FILTER':
      return { ...state, filter: action.filter, notice: null }
    case 'SEARCH':
      return { ...state, search: action.value }
    case 'RAIL_TOGGLE':
      return { ...state, railExpanded: !state.railExpanded }
    case 'VIEW_SET':
      return { ...state, view: { ...state.view, [action.key]: action.value } }
    case 'OUTPUT_MODE':
      return { ...state, output: { ...state.output, mode: action.mode } }
    case 'OUTPUT_SET': {
      const { mode, key, value } = action
      return {
        ...state,
        output: { ...state.output, values: { ...state.output.values, [mode]: { ...state.output.values[mode], [key]: value } } },
      }
    }
    case 'REFERENCE':
      return { ...state, reference: action.mediaId, notice: null }
    case 'BATCH_ADD':
      // New batches are PREPENDED — newest first (RECON-04 §8)
      return { ...state, batches: [action.batch, ...(state.batches ?? [])], reference: null, notice: null }
    case 'BATCH_PATCH':
      return { ...state, batches: state.batches.map((b) => (b.id === action.batchId ? applyPatch(b, action.patch) : b)) }
    case 'DELETE_BATCH':
      return { ...state, batches: state.batches.filter((b) => b.id !== action.batchId) }
    default:
      return state
  }
}

/**
 * Editor session state. The adapter (mock or HTTP) owns generation and
 * progress; this hook only subscribes. Returns `[state, dispatch, actions]`.
 */
export function useEditorState(projectId) {
  const adapter = useAdapter()
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // Capabilities first — they seed the output settings (and the agent's, from localStorage).
  useEffect(() => {
    let live = true
    adapter
      .capabilities()
      .then((caps) => live && dispatch({ type: 'CAPS', caps, savedAgent: readAgentSettings() }))
      .catch((error) => live && dispatch({ type: 'ERROR', error }))
    return () => {
      live = false
    }
  }, [adapter])

  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const batches = await adapter.listBatches(projectId)
        if (!live) return
        dispatch({ type: 'LOADED', batches })
        // Runs are the backend's; mirror any this browser hasn't seen (STORY-604).
        if (adapter.reconcileRuns) {
          const { add, patches } = await adapter.reconcileRuns(projectId, batches)
          if (live && (add.length || patches.length)) dispatch({ type: 'RECONCILED', add, patches })
        }
      } catch (error) {
        if (live) dispatch({ type: 'ERROR', error })
      }
    }
    load()
    return () => {
      live = false
    }
  }, [adapter, projectId])

  // Generation engine: one adapter.watch() per pending batch (STORY-307).
  // Batches still pending after a reload resume here too.
  const watchers = useRef(new Map())
  useEffect(() => {
    if (!state.batches) return
    for (const b of state.batches) {
      // A run batch follows its run (STORY-604); a generate batch follows its jobs.
      const active = isRunBatch(b) ? isRunActiveBatch(b) : isPending(b)
      if (active && !watchers.current.has(b.id)) {
        const onPatch = (patch) => dispatch({ type: 'BATCH_PATCH', batchId: b.id, patch })
        const stop = isRunBatch(b) ? adapter.watchRun(projectId, b, onPatch) : adapter.watch(projectId, b, onPatch)
        watchers.current.set(b.id, stop)
      }
    }
    for (const [id, stop] of watchers.current) {
      const b = state.batches.find((x) => x.id === id)
      const active = b && (isRunBatch(b) ? isRunActiveBatch(b) : isPending(b))
      if (!active) {
        stop()
        watchers.current.delete(id)
      }
    }
  }, [state.batches, adapter, projectId])

  useEffect(
    () => () => {
      for (const stop of watchers.current.values()) stop()
      watchers.current.clear()
    },
    [adapter, projectId],
  )

  // Agent settings follow the user across reloads (STORY-602).
  useEffect(() => {
    if (state.agent) writeAgentSettings(state.agent)
  }, [state.agent])

  const actions = useMemo(
    () => ({
      async generate(prompt) {
        const { output, reference } = stateRef.current
        try {
          const batch = await adapter.generate(projectId, {
            mode: output.mode,
            prompt,
            values: output.values[output.mode],
            referenceId: reference,
          })
          dispatch({ type: 'BATCH_ADD', batch })
          return true
        } catch (e) {
          dispatch({ type: 'NOTICE', notice: e.message ?? String(e) })
          return false
        }
      },
      /** Agent mode: the skill is the prompt; typed text is not part of a run (STORY-602). */
      async agentRun() {
        const { agent, reference } = stateRef.current
        if (!agent?.instruction) {
          dispatch({ type: 'NOTICE', notice: 'Pick a skill to start' })
          return null
        }
        try {
          const run = await adapter.agent.createRun({
            projectId,
            referenceId: reference,
            instruction: agent.instruction,
            count: agent.count,
            values: agent.values,
            autostart: agent.confirm === 'never',
          })
          const batch = await adapter.mirrorRun(projectId, run)
          dispatch({ type: 'BATCH_ADD', batch })
          return run
        } catch (e) {
          dispatch({ type: 'NOTICE', notice: e.message ?? String(e) })
          return null
        }
      },
      async deleteBatch(batchId) {
        dispatch({ type: 'DELETE_BATCH', batchId })
        try {
          await adapter.deleteBatch(projectId, batchId)
        } catch (e) {
          dispatch({ type: 'NOTICE', notice: e.message ?? String(e) })
        }
      },
    }),
    [adapter, projectId],
  )

  return [state, dispatch, actions]
}

/** Which rail items exist, given the project's media (RECON-04 §2: dynamic). */
export function railPresence(batches) {
  const has = (fn) => (batches ?? []).some(fn)
  return {
    images: has((b) => b.type === 'image'),
    videos: has((b) => b.type === 'video'),
    uploads: has((b) => b.type === 'upload'),
  }
}

export function filterBatches(batches, filter, search) {
  if (!batches) return []
  let out = batches
  if (filter === 'images') out = out.filter((b) => b.type === 'image')
  if (filter === 'videos') out = out.filter((b) => b.type === 'video')
  if (filter === 'uploads') out = out.filter((b) => b.type === 'upload')
  if (filter === 'scenes') out = [] // no scenes in mock data — shows the empty placeholder
  if (search.trim()) out = out.filter((b) => b.prompt.toLowerCase().includes(search.trim().toLowerCase()))
  return out
}
