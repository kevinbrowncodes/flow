/**
 * Mock fixtures — EPIC-001.
 *
 * Shapes mirror what the details column renders (RECON-04 §6) and what the
 * generation lifecycle needs (RECON-04 §8). Project titles are timestamps —
 * that is how Flow names them (RECON-01, OBS-01).
 *
 * IDs are UUID v4: Flow's projectId route param is a UUID (OBS-02).
 */

export const PROJECT = {
  id: 'a88beb70-4eb5-454a-8e3e-51ec771e5419',
  title: 'Aug 21 at 10:58 AM',
  createdAt: '2026-08-21T10:58:00',
}

// assetKey → files under public/mock/
const A = {
  lagoon: { full: '/mock/clip-lagoon.mp4', thumb: '/mock/clip-lagoon.jpg' },
  ember: { full: '/mock/clip-ember.mp4', thumb: '/mock/clip-ember.jpg' },
  meadow: { full: '/mock/clip-meadow.mp4', thumb: '/mock/clip-meadow.jpg' },
  dusk: { full: '/mock/clip-dusk.mp4', thumb: '/mock/clip-dusk.jpg' },
  refEmber: { full: '/mock/ref-ember.jpg', thumb: '/mock/ref-ember.jpg' },
}
export const ASSETS = A

export const MOCK_POOL = ['lagoon', 'ember', 'meadow', 'dusk']

let n = 0
const uuid = () =>
  `bb${(n++).toString(16).padStart(2, '0')}be70-4eb5-454a-8e3e-${(n * 7919).toString(16).padStart(12, '0')}`

const media = (assetKey, type) => ({ id: uuid(), type, status: 'done', progress: 100, assetKey })

/**
 * batch.type: 'video' | 'image' | 'upload'
 * Newest first — the grid prepends new batches (RECON-04 §8).
 */
export const BATCHES = [
  {
    id: uuid(),
    type: 'video',
    prompt:
      'A slow aerial drift over a turquoise lagoon at dawn, mist curling off the water, cinematic, shot on 35mm.',
    model: 'Omni Flash',
    aspect: '16:9',
    duration: 10,
    resolution: '720p',
    createdAt: 'Aug 21, 2026',
    referenceKey: 'refEmber',
    items: [media('lagoon', 'video'), media('ember', 'video'), media('meadow', 'video'), media('dusk', 'video')],
  },
  {
    id: uuid(),
    type: 'video',
    prompt:
      'Golden-hour meadow, tall grass rippling in wind, a single tree on the horizon, painterly light, gentle push-in.',
    model: 'Veo 3.1 - Fast',
    aspect: '16:9',
    duration: 8,
    resolution: '720p',
    createdAt: 'Aug 20, 2026',
    referenceKey: null,
    items: [media('meadow', 'video'), media('dusk', 'video'), media('lagoon', 'video'), media('ember', 'video')],
  },
  {
    id: uuid(),
    type: 'image',
    prompt: 'Ember-lit canyon wall at dusk, layered sandstone, volumetric haze, ultra detailed.',
    model: 'Nano Banana 2',
    aspect: '16:9',
    duration: null,
    resolution: '1376x768',
    createdAt: 'Aug 20, 2026',
    referenceKey: null,
    items: [media('ember', 'image'), media('dusk', 'image')],
  },
  {
    id: uuid(),
    type: 'upload',
    prompt: '01.jpg',
    model: null,
    aspect: '16:9',
    duration: null,
    resolution: '1280x720',
    createdAt: 'Aug 19, 2026',
    referenceKey: null,
    items: [media('lagoon', 'upload')],
  },
]
