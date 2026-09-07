import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickRun, pollInterval, approveHint, upsertRun, canReview, canResume } from '../../src/features/agent/agentPanelState.js'

const r = (id, state, created_at = 1) => ({ id, state, created_at, count: 3, values: { size: '832x480', length: 10 } })

test('pickRun prefers the asked-for run, else the newest', () => {
  const runs = [r('b', 'done', 2), r('a', 'review', 1)]
  assert.equal(pickRun(runs, 'a').id, 'a')
  assert.equal(pickRun(runs, 'zzz').id, 'b')
  assert.equal(pickRun([], 'a'), null)
  assert.equal(pickRun(null, 'a'), null)
})

test('pollInterval: poll while the backend works, not in review or terminal states', () => {
  assert.equal(pollInterval(null), 0)
  for (const s of ['planning', 'queued', 'rendering', 'paused']) assert.equal(pollInterval(r('x', s)), 2000, s)
  for (const s of ['review', 'done', 'failed']) assert.equal(pollInterval(r('x', s)), 0, s)
})

test('approveHint names count, size and length', () => {
  assert.equal(approveHint(r('x', 'review'), { name: 'Cosmos 3 Nano' }), 'Approve and render 3 clips · 832x480 · 10 s each on Cosmos 3 Nano')
  assert.equal(approveHint({ ...r('x', 'review'), count: 1, values: {} }, { name: 'M' }), 'Approve and render 1 clip on M')
  assert.equal(approveHint({ ...r('x', 'review'), values: { aspect: '16:9', duration: 8 } }, { name: 'M' }), 'Approve and render 3 clips · 16:9 · 8 s each on M')
})

test('upsertRun replaces by id and keeps newest first', () => {
  const list = upsertRun([r('a', 'review', 1), r('b', 'done', 2)], r('a', 'queued', 1))
  assert.deepEqual(list.map((x) => `${x.id}:${x.state}`), ['b:done', 'a:queued'])
  assert.equal(upsertRun(null, r('c', 'planning', 5))[0].id, 'c')
})

test('canReview / canResume', () => {
  assert.equal(canReview(r('x', 'review')), true)
  assert.equal(canReview(r('x', 'queued')), false)
  assert.equal(canResume(r('x', 'failed')), true)
  assert.equal(canResume(r('x', 'paused')), true)
  assert.equal(canResume(r('x', 'done')), false)
  assert.equal(canResume(null), false)
})
