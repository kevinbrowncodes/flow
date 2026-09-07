/**
 * In-memory Flow Gateway for adapter tests. Mirrors protocol/PROTOCOL.md:
 * jobs advance one step per poll so tests can observe progress.
 */
import { PROTOCOL_VERSION } from '../../src/adapter/contract.js'

export const FAKE_CAPS = {
  protocol: PROTOCOL_VERSION,
  name: 'Fake Nano',
  modes: [
    {
      key: 'video',
      label: 'Video',
      fields: [
        { key: 'size', label: 'Size', type: 'choice', role: 'size', options: ['1280x720', '720x1280'], default: '1280x720' },
        { key: 'frames', label: 'Frames', type: 'choice', options: [121, 189], default: 189 },
        { key: 'sound', label: 'Sound', type: 'boolean', default: true },
        { key: 'count', label: 'Outputs', type: 'choice', role: 'count', options: [1, 2], default: 2 },
      ],
    },
  ],
  reference: 'required',
  reference_kinds: ['image'],
  progress: 'percent',
  agent: { instructions: true, count: { min: 1, max: 6, default: 3 }, confirm: 'always', fields: ['size', 'frames'] },
}

const INSTRUCTIONS = [
  { id: 'fake-scene', name: 'fake-scene', description: 'N clips.', count_locked: false },
  { id: 'fake-single', name: 'fake-single', description: 'One clip.', count_locked: true },
]

const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
})

export function fakeGateway({ caps = FAKE_CAPS, stepsToDone = 3 } = {}) {
  const jobs = new Map()
  const media = new Map([['ref-1', { id: 'ref-1', name: 'still.png', kind: 'image', source: 'upload' }]])
  const log = []
  let n = 0

  const fetch = async (url, init = {}) => {
    const u = new URL(url)
    const method = init.method ?? 'GET'
    log.push(`${method} ${u.pathname}`)
    if (u.pathname === '/flow/capabilities') return json(caps)
    if (caps.agent) {
      const agent = agentRoutes(u, method, init, media, stepsToDone)
      if (agent) return agent
    }
    if (u.pathname === '/flow/media' && method === 'GET') return json([...media.values()])
    if (u.pathname === '/flow/uploads' && method === 'POST') {
      const file = init.body.get('file')
      const asset = { id: `up-${++n}`, name: file.name, kind: 'image', source: 'upload' }
      media.set(asset.id, asset)
      return json(asset)
    }
    if (u.pathname === '/flow/generate' && method === 'POST') {
      const req = JSON.parse(init.body)
      if (req.reference_id && !media.has(req.reference_id)) return json({ detail: `unknown reference ${req.reference_id}` }, 404)
      if (!req.prompt) return json({ detail: 'prompt is required' }, 422)
      const id = `job-${++n}`
      jobs.set(id, { id, status: 'queued', progress: 0, polls: 0, req })
      return json({ id, status: 'queued', progress: 0 })
    }
    const m = /^\/flow\/jobs\/(.+)$/.exec(u.pathname)
    if (m) {
      const job = jobs.get(decodeURIComponent(m[1]))
      if (!job) return json({ detail: 'Unknown job' }, 404)
      job.polls += 1
      if (job.req.prompt.includes('FAIL')) return json({ id: job.id, status: 'failed', error: 'boom' })
      if (job.polls >= stepsToDone) {
        const mediaId = `out-${job.id}`
        media.set(mediaId, { id: mediaId, name: `${mediaId}.mp4`, kind: 'video', source: 'output' })
        const [w, h] = job.req.values.size.split('x').map(Number)
        return json({ id: job.id, status: 'done', progress: 100, media_id: mediaId, width: w, height: h, duration_s: 7.9 })
      }
      return json({ id: job.id, status: 'running', progress: Math.round((job.polls / stepsToDone) * 100) })
    }
    return json({ detail: 'not found' }, 404)
  }

  return { fetch, log, jobs, media }
}


// --- agent routes (v1.1), advancing a run one step per poll like the Python fake ---
const runs = new Map()
let runN = 0
const stepOf = (r) => ({
  planning: `Writing ${r.count} scripts…`, review: 'Waiting for review', queued: r.clip_index ? `Caching clip ${r.clip_index}` : 'Queued',
  rendering: `Rendering clip ${r.clip_index + 1} of ${r.count}`, paused: 'Paused', failed: `Failed at clip ${r.clip_index + 1}: ${r.error}`, done: 'Done',
})[r.state]
const view = (r) => json({ ...r, step: stepOf(r), polls: undefined })

function agentRoutes(u, method, init, media, stepsToDone) {
  const body = () => JSON.parse(init.body ?? '{}')
  const instr = (id, count) => {
    const i = INSTRUCTIONS.find((x) => x.id === id)
    if (!i) return json({ detail: `unknown instruction ${id}` }, 404)
    if (i.count_locked && count !== 1) return json({ detail: 'count must be 1' }, 422)
    return null
  }
  if (u.pathname === '/flow/agent/instructions') return json(INSTRUCTIONS)
  if (u.pathname === '/flow/agent/plan' && method === 'POST') {
    const b = body()
    if (!(b.count >= 1)) return json({ detail: 'count must be ≥ 1' }, 422)
    const bad = instr(b.instruction, b.count)
    if (bad) return bad
    if (!media.has(b.reference_id)) return json({ detail: 'unknown reference' }, 404)
    return json({ instruction: b.instruction, count: b.count, scripts: Array.from({ length: b.count }, (_, i) => `clip ${i + 1}`), titles: ['🎨 T'], summary: 'S', attempts: 1, model: 'fake' })
  }
  if (u.pathname === '/flow/agent/runs' && method === 'POST') {
    const b = body()
    const bad = instr(b.instruction, b.count)
    if (bad) return bad
    if (!media.has(b.reference_id)) return json({ detail: 'unknown reference' }, 404)
    if (b.values && Object.keys(b.values).some((k) => !['size', 'frames', 'sound', 'count'].includes(k))) return json({ detail: 'unknown fields' }, 422)
    const r = {
      id: `run_${++runN}`, project_id: b.project_id ?? null, title: 'Untitled run', state: 'planning', clip_index: 0, clip_count: b.count, instruction: b.instruction,
      count: b.count, values: { size: '1280x720', frames: 189, sound: true, count: 1, ...(b.values ?? {}) }, reference_id: b.reference_id, scripts: [], titles: [], summary: null,
      clips: Array.from({ length: b.count }, (_, i) => ({ n: i + 1, script: null, job_id: null, media_id: null, status: 'pending', progress: null, error: null })),
      autostart: Boolean(b.autostart), error: null, created_at: Date.now() / 1000 + runN, polls: 0,
    }
    runs.set(r.id, r)
    return json({ ...r, step: stepOf(r) }, 202)
  }
  if (u.pathname === '/flow/agent/runs' && method === 'GET') {
    const pid = u.searchParams.get('project_id')
    return json([...runs.values()].filter((r) => pid == null || r.project_id === pid).sort((a, b) => b.created_at - a.created_at).map((r) => ({ ...r, step: stepOf(r) })))
  }
  const m = /^\/flow\/agent\/runs\/([^/]+)(?:\/(scripts\/(\d+)(?:\/(rewrite))?|approve|resume))?$/.exec(u.pathname)
  if (!m) return null
  const r = runs.get(m[1])
  if (!r) return json({ detail: 'Unknown run' }, 404)
  const action = m[2]
  if (!action && method === 'GET') {
    if (r.state === 'planning') {
      r.scripts = Array.from({ length: r.count }, (_, i) => `clip ${i + 1}`); r.titles = ['🎨 T']; r.summary = 'S'; r.title = '🎨 T'
      r.clips.forEach((c, i) => { c.script = r.scripts[i] }); r.state = r.autostart ? 'queued' : 'review'
    } else if (r.state === 'queued' || r.state === 'rendering') {
      const c = r.clips[r.clip_index]
      if (!c.job_id) { c.job_id = `job-${r.id}-${c.n}`; c.status = 'running'; c.progress = 0; r.state = 'rendering'; r.polls = 0 }
      else if (c.script.includes('FAIL')) { c.status = 'failed'; c.error = 'boom'; r.state = 'failed'; r.error = 'boom' }
      else if (++r.polls >= stepsToDone) { c.status = 'done'; c.progress = 100; c.media_id = `out:${c.job_id}.mp4`; r.clip_index += 1; r.state = r.clip_index >= r.count ? 'done' : 'queued' }
      else c.progress = Math.round((100 * r.polls) / stepsToDone)
    }
    return view(r)
  }
  if (action === 'approve') { if (r.state !== 'review') return json({ detail: `it is ${r.state}` }, 409); r.state = 'queued'; return view(r) }
  if (action === 'resume') { if (!['failed', 'paused'].includes(r.state)) return json({ detail: `it is ${r.state}` }, 409); Object.assign(r.clips[r.clip_index], { job_id: null, status: 'pending', progress: null, error: null }); r.state = 'queued'; r.error = null; return view(r) }
  if (action?.startsWith('scripts/')) {
    const n = Number(m[3])
    if (r.state !== 'review') return json({ detail: `it is ${r.state}` }, 409)
    if (n < 1 || n > r.count) return json({ detail: 'no such script' }, 404)
    if (m[4] === 'rewrite') { r.scripts[n - 1] = `clip ${n}, rewritten`; r.clips[n - 1].script = r.scripts[n - 1]; return view(r) }
    if (method === 'PATCH') {
      const t = String(body().text ?? '').trim()
      if (!t) return json({ detail: 'text required' }, 422)
      r.scripts[n - 1] = t; r.clips[n - 1].script = t
      return view(r)
    }
  }
  return null
}
