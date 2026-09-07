/** Pure helpers behind AgentPanel (STORY-603) — unit-tested without React. */
import { isRunActive } from '../../adapter/contract.js'

/** Which run the panel shows: the one asked for if it exists, else the newest. */
export function pickRun(runs, preferredId) {
  if (!runs?.length) return null
  return runs.find((r) => r.id === preferredId) ?? runs[0]
}

/** Poll while the backend is doing something; 0 = don't poll. */
export function pollInterval(run) {
  if (!run) return 0
  return isRunActive(run) && run.state !== 'review' ? 2000 : 0
}

/** The line under Approve: what will be rendered once approved. */
export function approveHint(run, caps) {
  const v = run.values ?? {}
  const size = v.size ?? v.aspect
  const length = v.length ?? v.duration
  const parts = [`${run.count} clip${run.count === 1 ? '' : 's'}`]
  if (size) parts.push(String(size))
  if (length != null) parts.push(`${length} s each`)
  return `Approve and render ${parts.join(' · ')} on ${caps.name}`
}

/** Merge a fresh copy of a run into the history list, newest first. */
export function upsertRun(runs, run) {
  const rest = (runs ?? []).filter((r) => r.id !== run.id)
  return [run, ...rest].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
}

export const canReview = (run) => run?.state === 'review'
export const canResume = (run) => run?.state === 'failed' || run?.state === 'paused'
