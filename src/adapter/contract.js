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
 * @property {string} [gatewayUrl]                                 shown in About (STORY-208)
 * @property {() => Promise<Object[]>} listProjects                 newest first (STORY-208)
 * @property {() => Promise<Object>} createProject                  titled by `formatProjectTitle`
 * @property {(id: string, title: string) => Promise<Object|null>} renameProject
 * @property {(id: string) => Promise<void>} deleteProject          project + its batches; no media
 * @property {(id: string) => Promise<Object|null>} getProject
 * @property {(projectId: string) => Promise<Batch[]>} listBatches
 * @property {(mediaId: string, type?: 'FULL'|'THUMBNAIL') => string|null} getMediaUrl
 * @property {(projectId: string) => Promise<MediaAsset[]>} listMedia
 * @property {(projectId: string, file: File) => Promise<MediaAsset>} uploadMedia
 * @property {(projectId: string, req: GenerateRequest) => Promise<Batch>} generate
 * @property {(projectId: string, batch: Batch, onUpdate: (p: BatchPatch) => void) => () => void} watch
 * @property {(projectId: string, batchId: string) => Promise<void>} deleteBatch
 * @property {(mode: string, values: Object) => number|null} [estimateCost]
 * @property {AgentAdapter} [agent]                                       present iff capabilities.agent (v1.1)
 * @property {(projectId: string, run: Run) => Promise<Batch>} [mirrorRun]          a run as a batch (STORY-604)
 * @property {(projectId: string, batches: Batch[]) => Promise<{add: Batch[], patches: Object[]}>} [reconcileRuns]
 * @property {(projectId: string, batch: Batch, onUpdate: (p: BatchPatch) => void) => () => void} [watchRun]
 *
 * @typedef {Object} AgentCapabilities
 * @property {boolean} instructions
 * @property {{min: number, max: number, default: number}} count
 * @property {'always'|'never'} confirm
 * @property {string[]} fields                  which fields of the default mode a run carries
 *
 * @typedef {Object} Instruction
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {boolean} count_locked
 *
 * @typedef {Object} Clip
 * @property {number} n
 * @property {string|null} script
 * @property {string|null} job_id
 * @property {string|null} media_id
 * @property {string} status
 * @property {number|null} progress
 * @property {string|null} error
 *
 * @typedef {Object} Run
 * @property {string} id
 * @property {string|null} project_id
 * @property {string} title
 * @property {'planning'|'review'|'queued'|'rendering'|'done'|'failed'|'paused'} state
 * @property {string} step                       a short present-tense label, shown verbatim
 * @property {number} clip_index
 * @property {number} clip_count
 * @property {string} instruction
 * @property {number} count
 * @property {Object} values
 * @property {string} reference_id
 * @property {string[]} scripts
 * @property {string[]} titles
 * @property {string|null} summary
 * @property {Clip[]} clips
 * @property {boolean} autostart
 * @property {string|null} error
 * @property {number} created_at
 *
 * @typedef {Object} AgentAdapter
 * @property {() => Promise<Instruction[]>} instructions
 * @property {(req: {referenceId: string, instruction: string, count: number}) => Promise<Object>} plan
 * @property {(req: {projectId?: string, referenceId: string, instruction: string, count: number, values?: Object, autostart?: boolean}) => Promise<Run>} createRun
 * @property {(projectId?: string) => Promise<Run[]>} listRuns
 * @property {(runId: string) => Promise<Run>} run
 * @property {(runId: string, n: number, text: string) => Promise<Run>} editScript
 * @property {(runId: string, n: number) => Promise<Run>} rewriteScript
 * @property {(runId: string) => Promise<Run>} approve
 * @property {(runId: string) => Promise<Run>} resume
 */

export const PROTOCOL_VERSION = 1

export const FIELD_TYPES = ['choice', 'boolean', 'number', 'text']
export const FIELD_ROLES = ['model', 'aspect', 'size', 'duration', 'count', 'seed']
export const MODE_KEYS = ['image', 'video']
export const REFERENCE_MODES = ['none', 'optional', 'required']
export const PROGRESS_MODES = ['percent', 'none']
export const TERMINAL = new Set(['done', 'failed'])
export const RUN_STATES = ['planning', 'review', 'queued', 'rendering', 'done', 'failed', 'paused']
export const RUN_TERMINAL = new Set(['done', 'failed'])
export const CONFIRM_MODES = ['always', 'never']

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

  const agent = normaliseAgent(caps.agent, modes.find((m) => m.key === 'video'))

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
    // A backend that declares `agent` (v1.1) owns the Agent surface; the legacy inert pill needs surfaces.agent.
    surfaces: { agent: Boolean(agent), characters: false, scenes: false, tools: false, trash: false, ...(caps.surfaces ?? {}), ...(agent ? { agent: true } : {}) },
    agent,
  }
}

/** `capabilities.agent` (v1.1): absent/false → false; an object → validated and defaulted. */
function normaliseAgent(agent, mode) {
  if (!agent) return false
  if (typeof agent !== 'object') fail('agent must be an object or false')
  if (!mode) fail("agent mode requires a 'video' mode")
  const count = { min: 1, max: 12, default: 3, ...(agent.count ?? {}) }
  for (const k of ['min', 'max', 'default']) if (!Number.isInteger(count[k])) fail(`agent.count.${k} must be an integer`)
  if (count.min < 1) fail('agent.count.min must be at least 1')
  if (count.default < count.min || count.default > count.max) fail(`agent.count.default ${count.default} is outside [${count.min}, ${count.max}]`)
  const confirm = agent.confirm ?? 'always'
  if (!CONFIRM_MODES.includes(confirm)) fail(`agent.confirm must be one of ${CONFIRM_MODES.join(', ')}`)
  const fields = agent.fields ?? []
  if (!Array.isArray(fields)) fail('agent.fields must be an array')
  const known = new Set((mode?.fields ?? []).map((f) => f.key))
  const unknown = fields.filter((f) => !known.has(f))
  if (unknown.length) fail(`agent.fields ${JSON.stringify(unknown)} are not fields of the video mode`)
  if (agent.shape_from_seed != null && typeof agent.shape_from_seed !== 'boolean') fail('agent.shape_from_seed must be a boolean')
  return { instructions: agent.instructions ?? true, count, confirm, fields, shapeFromSeed: Boolean(agent.shape_from_seed) }
}

/** Which of a run's `values` the UI shows — the video mode's fields the backend listed, in the mode's order. */
export function runFields(caps) {
  const mode = caps.agent ? findMode(caps, 'video') : null
  return mode ? mode.fields.filter((f) => caps.agent.fields.includes(f.key)) : []
}

export const isRunActive = (run) => !RUN_TERMINAL.has(run.state)

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

/**
 * Sizes within this log-aspect distance of the best match count as the same shape, so the two
 * orientations of one shape compete on pixel count instead. ln(16/9) - ln(4/3) is 0.29.
 */
export const ASPECT_TOLERANCE = 0.15

/** '1280x720' → [1280, 720]; anything unparseable or non-positive → null. */
export function parseSize(size) {
  const m = /^\s*(\d+)\s*[x×X]\s*(\d+)\s*$/.exec(String(size ?? ''))
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  return w > 0 && h > 0 ? [w, h] : null
}

/**
 * The offered size shaped like the seed, at the pixel budget `requested` asked for.
 *
 * A gateway that uses the reference as the first frame cannot honour a size of a different
 * shape — it rescales the frame and the clip comes out squashed — so the shape comes from the
 * seed and only the resolution from the request. This mirrors `size_for_seed` in
 * flow_protocol/sizing.py; `protocol/size-vectors.json` holds the cases both must agree on.
 *
 * @param {string[]} options sizes the gateway offers
 * @param {string|null} requested what the caller asked for (often just a UI default)
 * @param {[number, number]|null} seed the reference's pixel dimensions
 * @returns {string|null} the size to use, or `requested` when there is nothing to go on
 */
export function sizeForSeed(options, requested, seed, tolerance = ASPECT_TOLERANCE) {
  const sized = (options ?? []).map((o) => [o, parseSize(o)]).filter(([, d]) => d)
  if (!sized.length || !seed || !(seed[1] > 0)) return requested ?? null
  const target = Math.log(seed[0] / seed[1])
  const req = parseSize(requested)
  const budget = req ? req[0] * req[1] : 0
  const distance = ([, [w, h]]) => Math.abs(Math.log(w / h) - target)
  const best = Math.min(...sized.map(distance))
  const close = sized.filter((entry) => distance(entry) <= best + tolerance)
  close.sort((a, b) => {
    const d = Math.abs(a[1][0] * a[1][1] - budget) - Math.abs(b[1][0] * b[1][1] - budget)
    return d !== 0 ? d : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  })
  return close[0][0]
}

/**
 * What shape the agent will actually render for this seed, if the backend told us it decides
 * that (`agent.shape_from_seed`). Returns null when there is nothing to say — no agent, a
 * backend that does not reshape (the preview would be a lie), no size field, or no
 * measurement yet — so callers render nothing rather than a guess.
 *
 * @param {object} caps normalised capabilities
 * @param {{values: object, videoMode: string}|null} agent editor agent state
 * @param {[number, number]|null} seed the reference's pixel dimensions
 * @returns {{requested: string|null, chosen: string, changed: boolean}|null}
 */
export function shapeForSeed(caps, agent, seed) {
  if (!caps?.agent?.shapeFromSeed || !agent || !seed) return null
  const mode = findMode(caps, agent.videoMode ?? 'video')
  const field = mode ? fieldByRole(mode, 'size') : null
  if (!field?.options?.length) return null
  const options = field.options.map((o) => String(o.value))
  const requested = agent.values?.[field.key] ?? field.default ?? null
  const chosen = sizeForSeed(options, requested == null ? null : String(requested), seed)
  if (!chosen) return null
  return { requested: requested == null ? null : String(requested), chosen, changed: chosen !== String(requested) }
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

/**
 * RFC 4122 v4 id.
 *
 * `crypto.randomUUID` is **secure-context only** in browsers (https or
 * localhost) and was not global in Node before 19. Calling it unguarded broke
 * the editor over plain http on a LAN — the exact failure a self-hosted
 * gateway produces — and this repo's own unit tests on Node 18.
 * `getRandomValues` has neither restriction; the last fallback keeps ids
 * flowing where no WebCrypto exists at all (ids are for local grouping, not
 * for secrets).
 */
export function uuid() {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

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
