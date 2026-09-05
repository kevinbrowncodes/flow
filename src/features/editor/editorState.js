import { useEffect, useReducer, useRef, useMemo } from 'react'
import { useAdapter } from '../../adapter/useAdapter.js'
import { defaultValues, applyPatch, isPending } from '../../adapter/contract.js'

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
      }
    }
    case 'LOADED':
      return { ...state, batches: action.batches }
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

  // Capabilities first — they seed the output settings.
  useEffect(() => {
    let live = true
    adapter
      .capabilities()
      .then((caps) => live && dispatch({ type: 'CAPS', caps }))
      .catch((error) => live && dispatch({ type: 'ERROR', error }))
    return () => {
      live = false
    }
  }, [adapter])

  useEffect(() => {
    let live = true
    adapter
      .listBatches(projectId)
      .then((batches) => live && dispatch({ type: 'LOADED', batches }))
      .catch((error) => live && dispatch({ type: 'ERROR', error }))
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
      if (isPending(b) && !watchers.current.has(b.id)) {
        const stop = adapter.watch(projectId, b, (patch) => dispatch({ type: 'BATCH_PATCH', batchId: b.id, patch }))
        watchers.current.set(b.id, stop)
      }
    }
    for (const [id, stop] of watchers.current) {
      const b = state.batches.find((x) => x.id === id)
      if (!b || !isPending(b)) {
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
