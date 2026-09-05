/**
 * The adapter contract — the ONE seam between the Flow UI and a model backend.
 *
 * Everything the editor knows about a backend comes through an object that
 * satisfies the `Adapter` shape below. Two implementations ship with flow:
 *
 *   - `createMockAdapter()`  (src/data/)          fixtures + a fake 22s ticker
 *   - `createHttpAdapter()`  (src/adapter/http.js) speaks the Flow Gateway
 *                                                  Protocol (protocol/PROTOCOL.md)
 *
 * Downstream repos (spark-cosmos3, spark-ltx2, …) never touch this file. They
 * implement the HTTP protocol server-side and pin a flow version.
 *
 * Versioning: `PROTOCOL_VERSION` is the *wire* contract's major. Within a
 * major, flow only ever adds optional fields. A gateway that reports a
 * different major is refused at boot with a readable error.
 *
 * @typedef {Object} FieldOption
 * @property {string|number|boolean} value
 * @property {string} label
 *
 * @typedef {Object} Field
 * @property {string} key                       stable key, sent back verbatim in `values`
 * @property {string|null} label                section label; null renders the control with no heading
 * @property {'choice'|'boolean'|'number'|'text'} type
 * @property {FieldOption[]} [options]          choice only
 * @property {number} [min]                     number only
 * @property {number} [max]                     number only
 * @property {number} [step]                    number only
 * @property {*} default
 * @property {'model'|'aspect'|'size'|'duration'|'count'|'seed'} [role]
 *   How the UI should *interpret* the field, independent of its key:
 *   model → composer chip + details column; aspect / size → aspect line + icon;
 *   duration → "Video length" line (seconds); count → `xN` chip + number of jobs.
 *
 * @typedef {Object} Mode
 * @property {'image'|'video'} key              also the batch/tile type
 * @property {string} label
 * @property {string} [icon]                    optional emoji shown on the composer chip
 * @property {Field[]} fields
 *
 * @typedef {Object} Capabilities
 * @property {number} protocol                  must equal PROTOCOL_VERSION
 * @property {string} name                      human name of the backend ("Cosmos 3 Nano")
 * @property {Mode[]} modes                     at least one; order = tab order
 * @property {string} default_mode
 * @property {'none'|'optional'|'required'} reference
 * @property {('image'|'video')[]} reference_kinds
 * @property {'percent'|'none'} progress        whether jobs report a 0–100 number
 * @property {boolean} credits                  whether `estimateCost` means anything
 * @property {{footer?: string, placeholder?: string, empty?: string}} strings
 * @property {{agent?: boolean, characters?: boolean, scenes?: boolean, tools?: boolean, trash?: boolean}} surfaces
 *   Surfaces the backend has no analogue for are simply not rendered.
 *
 * @typedef {Object} Job
 * @property {string} id
 * @property {'queued'|'running'|'done'|'failed'} status
 * @property {number|null} [progress]           0–100, or null when unknown
 * @property {string|null} [media_id]           set when done
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [duration_s]
 * @property {string|null} [error]
 *
 * @typedef {Object} MediaAsset
 * @property {string} id
 * @property {string} name
 * @property {'image'|'video'} kind
 * @property {'upload'|'output'} source
 *
 * @typedef {Object} MediaItem                  one tile
 * @property {string} id
 * @property {'image'|'video'|'upload'} type
 * @property {'queued'|'running'|'done'|'failed'} status
 * @property {number|null} progress
 * @property {string|null} assetKey             media id once done
 * @property {string} [jobId]
 * @property {string|null} [error]
 *
 * @typedef {Object} Batch                      one generation (RECON-04 §8)
 * @property {string} id
 * @property {'image'|'video'|'upload'} type
 * @property {string} prompt
 * @property {string|null} model
 * @property {string|null} aspect
 * @property {number|null} duration
 * @property {string|null} resolution           fills in on completion
 * @property {string} createdAt
 * @property {string|null} referenceKey         media id of the reference asset
 * @property {string} [mode]
 * @property {Object} [values]
 * @property {MediaItem[]} items
 *
 * @typedef {Object} GenerateRequest
 * @property {string} mode
 * @property {string} prompt
 * @property {Object} values                    every field of the mode, keyed by `Field.key`
 * @property {string|null} referenceId
 *
 * @typedef {Object} BatchPatch
 * @property {Partial<Batch>} [batch]
 * @property {Record<string, Partial<MediaItem>>} [items]   keyed by item id
 *
 * @typedef {Object} Adapter
 * @property {() => Promise<Capabilities>} capabilities
 * @property {() => Promise<string>} getDefaultProjectId
 * @property {(id: string) => Promise<Object|null>} getProject
 * @property {(projectId: string) => Promise<Batch[]>} listBatches
 * @property {(mediaId: string, type?: 'FULL'|'THUMBNAIL') => string|null} getMediaUrl
 * @property {(projectId: string) => Promise<MediaAsset[]>} listMedia
 * @property {(projectId: string, file: File) => Promise<MediaAsset>} uploadMedia
 * @property {(projectId: string, req: GenerateRequest) => Promise<Batch>} generate
 * @property {(projectId: string, batch: Batch, onUpdate: (p: BatchPatch) => void) => () => void} watch
 * @property {(projectId: string, batchId: string) => Promise<void>} deleteBatch
 * @property {(mode: string, values: Object) => number|null} [estimateCost]
 */

export const PROTOCOL_VERSION = 1

export const FIELD_TYPES = ['choice', 'boolean', 'number', 'text']
export const FIELD_ROLES = ['model', 'aspect', 'size', 'duration', 'count', 'seed']
export const MODE_KEYS = ['image', 'video']
export const REFERENCE_MODES = ['none', 'optional', 'required']
export const PROGRESS_MODES = ['percent', 'none']
export const TERMINAL = new Set(['done', 'failed'])

export class ContractError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ContractError'
  }
}

const fail = (msg) => {
  throw new ContractError(`capabilities: ${msg}`)
}

const normaliseOption = (o) => (o && typeof o === 'object' && 'value' in o ? { label: String(o.value), ...o } : { value: o, label: String(o) })

function normaliseField(f, where) {
  if (!f || typeof f !== 'object') fail(`${where}: field is not an object`)
  if (typeof f.key !== 'string' || !f.key) fail(`${where}: field.key must be a non-empty string`)
  if (!FIELD_TYPES.includes(f.type)) fail(`${where}.${f.key}: type must be one of ${FIELD_TYPES.join(', ')}`)
  if (f.role != null && !FIELD_ROLES.includes(f.role)) fail(`${where}.${f.key}: unknown role "${f.role}"`)
  if (!('default' in f)) fail(`${where}.${f.key}: default is required`)
  const out = { ...f, label: f.label ?? null, role: f.role ?? null }
  if (f.type === 'choice') {
    if (!Array.isArray(f.options) || f.options.length === 0) fail(`${where}.${f.key}: choice needs options`)
    out.options = f.options.map(normaliseOption)
    if (!out.options.some((o) => o.value === f.default)) fail(`${where}.${f.key}: default is not one of the options`)
  }
  return out
}

/**
 * Validates a capabilities document and fills in defaults. Throws
 * `ContractError` with a message naming the offending path. Returns a new,
 * normalised object — never mutates the input.
 */
export function assertCapabilities(caps) {
  if (!caps || typeof caps !== 'object') fail('not an object')
  const major = Number(caps.protocol)
  if (!Number.isInteger(major)) fail('protocol must be an integer')
  if (major !== PROTOCOL_VERSION) {
    fail(`gateway speaks protocol ${major}, this UI needs ${PROTOCOL_VERSION}`)
  }
  if (typeof caps.name !== 'string' || !caps.name) fail('name must be a non-empty string')
  if (!Array.isArray(caps.modes) || caps.modes.length === 0) fail('modes must be a non-empty array')

  const modes = caps.modes.map((m, i) => {
    const where = `modes[${i}]`
    if (!m || typeof m !== 'object') fail(`${where}: not an object`)
    if (!MODE_KEYS.includes(m.key)) fail(`${where}: key must be one of ${MODE_KEYS.join(', ')}`)
    if (!Array.isArray(m.fields)) fail(`${where}: fields must be an array`)
    const seen = new Set()
    const fields = m.fields.map((f) => {
      const nf = normaliseField(f, where)
      if (seen.has(nf.key)) fail(`${where}: duplicate field key "${nf.key}"`)
      seen.add(nf.key)
      return nf
    })
    return { ...m, label: m.label ?? (m.key === 'image' ? 'Image' : 'Video'), icon: m.icon ?? null, fields }
  })
  if (new Set(modes.map((m) => m.key)).size !== modes.length) fail('duplicate mode keys')

  const default_mode = caps.default_mode ?? modes[0].key
  if (!modes.some((m) => m.key === default_mode)) fail(`default_mode "${default_mode}" is not a mode`)

  const reference = caps.reference ?? 'none'
  if (!REFERENCE_MODES.includes(reference)) fail(`reference must be one of ${REFERENCE_MODES.join(', ')}`)
  const reference_kinds = caps.reference_kinds ?? (reference === 'none' ? [] : ['image'])
  if (!Array.isArray(reference_kinds) || reference_kinds.some((k) => !MODE_KEYS.includes(k))) {
    fail('reference_kinds must be an array of "image" | "video"')
  }
  const progress = caps.progress ?? 'none'
  if (!PROGRESS_MODES.includes(progress)) fail(`progress must be one of ${PROGRESS_MODES.join(', ')}`)

  return {
    ...caps,
    protocol: major,
    modes,
    default_mode,
    reference,
    reference_kinds,
    progress,
    credits: Boolean(caps.credits),
    strings: { ...(caps.strings ?? {}) },
    surfaces: { agent: false, characters: false, scenes: false, tools: false, trash: false, ...(caps.surfaces ?? {}) },
  }
}

export const findMode = (caps, key) => caps.modes.find((m) => m.key === key) ?? null

export const defaultValues = (mode) => Object.fromEntries(mode.fields.map((f) => [f.key, f.default]))

export const fieldByRole = (mode, role) => mode.fields.find((f) => f.role === role) ?? null

export function valueByRole(mode, values, role) {
  const f = fieldByRole(mode, role)
  return f ? values[f.key] : undefined
}

const COMMON_ASPECTS = ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9']

/** '1280x720' → '16:9' (nearest common ratio). Returns null when unparseable. */
export function aspectFromSize(size) {
  const m = /^\s*(\d+)\s*[x×X]\s*(\d+)\s*$/.exec(String(size ?? ''))
  if (!m) return null
  const r = Number(m[1]) / Number(m[2])
  let best = null
  let bestDiff = Infinity
  for (const a of COMMON_ASPECTS) {
    const [w, h] = a.split(':').map(Number)
    const d = Math.abs(w / h - r)
    if (d < bestDiff) {
      bestDiff = d
      best = a
    }
  }
  return best
}

/** Display string for a field's value: `8s`, `x2`, an option label, On/Off. */
export function formatValue(field, value) {
  if (field.role === 'duration') return `${value}s`
  if (field.role === 'count') return `x${value}`
  if (field.type === 'boolean') return value ? 'On' : 'Off'
  if (field.type === 'choice') return field.options.find((o) => o.value === value)?.label ?? String(value)
  return String(value)
}

/** The details-column summary of a request (model / aspect / duration / count). */
export function describeBatch(caps, mode, values) {
  const model = valueByRole(mode, values, 'model') ?? caps.name
  const aspect = valueByRole(mode, values, 'aspect') ?? aspectFromSize(valueByRole(mode, values, 'size'))
  const duration = valueByRole(mode, values, 'duration')
  const count = Math.max(1, Number(valueByRole(mode, values, 'count') ?? 1) || 1)
  return {
    model: model == null ? null : String(model),
    aspect: aspect == null ? null : String(aspect),
    duration: duration == null ? null : Number(duration),
    count,
  }
}

export const uuid = () => globalThis.crypto.randomUUID()

/** 'Aug 22, 2026' — the format the details column shows (RECON-04 §6). */
export const formatCreatedAt = (d = new Date()) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)

/** 'Aug 21 at 10:58 AM' — Flow names projects by timestamp (RECON-01, OBS-01). */
export function formatProjectTitle(d = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
  return `${day} at ${time}`
}

/** Translate a protocol Job into the patch to apply to its tile. */
export function jobToItemPatch(job, caps) {
  const patch = { status: job.status }
  if (caps.progress === 'percent') {
    patch.progress = job.status === 'done' ? 100 : job.progress == null ? 0 : Math.max(0, Math.min(99, Math.round(job.progress)))
  } else {
    patch.progress = job.status === 'done' ? 100 : null
  }
  if (job.status === 'done') patch.assetKey = job.media_id ?? null
  if (job.status === 'failed') patch.error = job.error ?? 'Generation failed'
  return patch
}

/**
 * Builds the pending batch that is prepended to the grid the moment the user
 * hits send (RECON-04 §8: details populate immediately, resolution later).
 */
export function buildPendingBatch({ caps, mode, prompt, values, referenceId = null, jobs, createdAt = formatCreatedAt() }) {
  const { model, aspect, duration } = describeBatch(caps, mode, values)
  return {
    id: uuid(),
    type: mode.key,
    prompt,
    model,
    aspect,
    duration: mode.key === 'video' ? duration : null,
    resolution: null,
    createdAt,
    referenceKey: referenceId ?? null,
    mode: mode.key,
    values: { ...values },
    items: jobs.map((j) => ({
      id: uuid(),
      type: mode.key,
      status: j.status ?? 'running',
      progress: caps.progress === 'percent' ? (j.progress ?? 0) : null,
      assetKey: j.media_id ?? null,
      jobId: j.id,
      error: j.error ?? null,
    })),
  }
}

/** Apply a BatchPatch immutably. */
export function applyPatch(batch, patch) {
  if (!patch) return batch
  let out = patch.batch ? { ...batch, ...patch.batch } : batch
  if (patch.items) {
    out = { ...out, items: out.items.map((it) => (patch.items[it.id] ? { ...it, ...patch.items[it.id] } : it)) }
  }
  return out
}

export const isPending = (batch) => batch.items.some((it) => !TERMINAL.has(it.status))
