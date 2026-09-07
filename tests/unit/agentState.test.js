import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reducer, initialState, seedAgent, readAgentSettings, writeAgentSettings } from '../../src/features/editor/editorState.js'
import { assertCapabilities } from '../../src/adapter/contract.js'
import { FAKE_CAPS } from './fakeGateway.js'

const caps = assertCapabilities(FAKE_CAPS)   // agent: count 1..6 default 3, confirm always, fields size+frames

test('seedAgent: from capabilities, overlaid with saved settings, clamped', () => {
  const fresh = seedAgent(caps, null)
  assert.deepEqual({ on: fresh.on, instruction: fresh.instruction, count: fresh.count, confirm: fresh.confirm }, { on: false, instruction: null, count: 3, confirm: 'always' })
  assert.deepEqual(fresh.values, { size: '1280x720', frames: 189 })
  const saved = seedAgent(caps, { on: true, instruction: 'fake-scene', count: 99, confirm: 'never', values: { size: '720x1280', bogus: 1 } })
  assert.equal(saved.on, true)
  assert.equal(saved.count, 6, 'clamped to max')
  assert.equal(saved.confirm, 'never')
  assert.deepEqual(saved.values, { size: '720x1280', frames: 189 }, 'unknown saved keys dropped, missing ones defaulted')
  assert.equal(seedAgent(assertCapabilities({ ...FAKE_CAPS, agent: false }), null), null)
})

test('reducer: CAPS seeds agent; toggle; set; instruction locking', () => {
  let s = reducer(initialState, { type: 'CAPS', caps, savedAgent: null })
  assert.equal(s.agent.on, false)
  s = reducer(s, { type: 'AGENT_TOGGLE' })
  assert.equal(s.agent.on, true)
  s = reducer(s, { type: 'AGENT_SET', key: 'count', value: 5, min: 1, max: 6 })
  assert.equal(s.agent.count, 5)
  s = reducer(s, { type: 'AGENT_SET', key: 'count', value: 42, min: 1, max: 6 })
  assert.equal(s.agent.count, 6, 'clamped')
  s = reducer(s, { type: 'AGENT_INSTRUCTION', id: 'fake-single', countLocked: true })
  assert.equal(s.agent.count, 1)
  assert.equal(s.agent.lockedCount, true)
  s = reducer(s, { type: 'AGENT_SET', key: 'count', value: 4, min: 1, max: 6 })
  assert.equal(s.agent.count, 1, 'count cannot change while locked')
  s = reducer(s, { type: 'AGENT_INSTRUCTION', id: 'fake-scene', countLocked: false })
  assert.equal(s.agent.count, 6, 'previous count restored')
  s = reducer(s, { type: 'AGENT_SET', key: 'confirm', value: 'never' })
  assert.equal(s.agent.confirm, 'never')
  s = reducer(s, { type: 'AGENT_SET', key: 'values', value: { frames: 121 } })
  assert.deepEqual(s.agent.values, { size: '1280x720', frames: 121 })
  const noAgent = reducer(initialState, { type: 'AGENT_TOGGLE' })
  assert.equal(noAgent.agent, null, 'no-op without capabilities.agent')
})

test('settings persistence tolerates missing and broken storage', () => {
  const backing = new Map()
  const storage = { getItem: (k) => backing.get(k) ?? null, setItem: (k, v) => backing.set(k, v) }
  const agent = seedAgent(caps, null)
  writeAgentSettings({ ...agent, on: true, instruction: 'fake-scene' }, storage)
  assert.equal(readAgentSettings(storage).instruction, 'fake-scene')
  assert.equal(readAgentSettings(storage).on, true)
  assert.equal(readAgentSettings(undefined), null)
  assert.equal(readAgentSettings({ getItem: () => '{not json' }), null)
  writeAgentSettings(agent, { setItem: () => { throw new Error('quota') } })   // must not throw
})
