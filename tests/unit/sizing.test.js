// STORY-608: the JS half of the size-from-seed rule, driven by the same vectors the Python
// suite reads. If these two ever disagree, the composer's preview starts lying about what the
// gateway will do — which is the failure this shared file exists to prevent.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseSize, sizeForSeed, shapeForSeed, assertCapabilities, ASPECT_TOLERANCE } from '../../src/adapter/contract.js'

const VECTORS = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../protocol/size-vectors.json', import.meta.url)), 'utf8'),
)

test('shared vectors: every case matches flow_protocol.sizing', () => {
  for (const c of VECTORS.cases) {
    const got = sizeForSeed(VECTORS.sets[c.set], c.requested, c.seed, VECTORS.tolerance)
    assert.equal(got, c.expected, `${c.set} ${c.requested} + ${JSON.stringify(c.seed)}: ${c.why}`)
  }
})

test('the tolerance matches the one the vectors were written for', () => {
  assert.equal(ASPECT_TOLERANCE, VECTORS.tolerance)
})

test('both incidents are covered', () => {
  const opts = VECTORS.sets.cosmos3
  assert.equal(sizeForSeed(opts, '720x1280', [1376, 768]), '1280x720')
  assert.equal(sizeForSeed(opts, '832x480', [768, 1376]), '480x832')
})

test('parseSize rejects nonsense and accepts what a gateway sends', () => {
  for (const bad of ['', 'x', '1280', '1280x', '0x720', 'axb', null, undefined, 720]) {
    assert.equal(parseSize(bad), null, String(bad))
  }
  assert.deepEqual(parseSize('1280x720'), [1280, 720])
  assert.deepEqual(parseSize('1280X720'), [1280, 720])
})

test('a seed with no height is ignored rather than dividing by zero', () => {
  assert.equal(sizeForSeed(['1280x720', '720x1280'], '720x1280', [100, 0]), '720x1280')
})

test('no options or no seed leaves the request alone', () => {
  assert.equal(sizeForSeed([], '720x1280', [1376, 768]), '720x1280')
  assert.equal(sizeForSeed(['1280x720'], '720x1280', null), '720x1280')
  assert.equal(sizeForSeed([], null, null), null)
})

const CAPS = (shape) =>
  assertCapabilities({
    name: 'T',
    protocol: 1,
    modes: [{ key: 'video', fields: [{ key: 'size', type: 'choice', role: 'size', options: ['1280x720', '720x1280', '960x960'], default: '720x1280' }] }],
    agent: { fields: ['size'], count: { min: 1, max: 3, default: 1 }, ...(shape == null ? {} : { shape_from_seed: shape }) },
  })
const AGENT = { values: { size: '720x1280' }, videoMode: 'video' }

test('shapeForSeed: a backend that reshapes previews the landscape size for a landscape seed', () => {
  assert.deepEqual(shapeForSeed(CAPS(true), AGENT, [1376, 768]), { requested: '720x1280', chosen: '1280x720', changed: true })
  assert.deepEqual(shapeForSeed(CAPS(true), AGENT, [768, 1376]), { requested: '720x1280', chosen: '720x1280', changed: false })
})

test('shapeForSeed: says nothing for a backend that does not reshape — the preview would be a lie', () => {
  assert.equal(shapeForSeed(CAPS(false), AGENT, [1376, 768]), null)
  assert.equal(shapeForSeed(CAPS(null), AGENT, [1376, 768]), null)
})

test('shapeForSeed: says nothing without a measurement, an agent, or a size field', () => {
  assert.equal(shapeForSeed(CAPS(true), AGENT, null), null)
  assert.equal(shapeForSeed(CAPS(true), null, [1376, 768]), null)
  const noSize = assertCapabilities({
    name: 'T', protocol: 1,
    modes: [{ key: 'video', fields: [{ key: 'aspect', type: 'choice', role: 'aspect', options: ['16:9', '9:16'], default: '16:9' }] }],
    agent: { fields: ['aspect'], count: { min: 1, max: 3, default: 1 }, shape_from_seed: true },
  })
  assert.equal(shapeForSeed(noSize, { values: { aspect: '16:9' }, videoMode: 'video' }, [1376, 768]), null)
})

test('shape_from_seed normalises to a boolean and rejects junk', () => {
  assert.equal(CAPS(true).agent.shapeFromSeed, true)
  assert.equal(CAPS(false).agent.shapeFromSeed, false)
  assert.equal(CAPS(null).agent.shapeFromSeed, false)
  assert.throws(() => assertCapabilities({
    name: 'T', protocol: 1,
    modes: [{ key: 'video', fields: [{ key: 'size', type: 'choice', role: 'size', options: ['1280x720'], default: '1280x720' }] }],
    agent: { shape_from_seed: 'yes' },
  }), /shape_from_seed must be a boolean/)
})
