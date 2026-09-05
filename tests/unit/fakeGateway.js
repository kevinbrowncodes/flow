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
}

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
