import { useCallback, useEffect, useState } from 'react'
import { useAdapter } from '../../adapter/useAdapter.js'
import Icon from '../../components/Icon/Icon.jsx'
import IconButton from '../../components/IconButton/IconButton.jsx'
import { approveHint, canResume, canReview, pickRun, pollInterval, upsertRun } from './agentPanelState.js'
import styles from './AgentPanel.module.css'

const fmt = (t) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t * 1000))

function Thinking() {
  return (
    <span className={styles.dots} aria-label="thinking">
      <i />
      <i />
      <i />
    </span>
  )
}

/**
 * The agent panel (STORY-603): the run is the plan. Review its scripts, approve,
 * then watch the step label and the clip progress; history lists the project's runs.
 */
export default function AgentPanel({ caps, projectId, runId, onClose, onNewRun }) {
  const adapter = useAdapter()
  const [runs, setRuns] = useState(null)
  const [current, setCurrent] = useState(null)
  const [view, setView] = useState('run') // 'run' | 'history'
  const [busy, setBusy] = useState(null) // script index being rewritten
  const [errors, setErrors] = useState({}) // script index → message
  const [notice, setNotice] = useState(null)

  // A new runId (a run just created) wins over whatever was showing; otherwise keep the current one.
  const refresh = useCallback(async () => {
    const list = await adapter.agent.listRuns(projectId)
    setRuns(list)
    setCurrent((cur) => pickRun(list, runId ?? cur?.id))
  }, [adapter, projectId, runId])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        await refresh()
      } catch (e) {
        if (!controller.signal.aborted) setNotice(e.message ?? String(e))
      }
    }
    load()
    return () => controller.abort()
  }, [refresh])

  // Poll the current run while the backend is doing something with it.
  useEffect(() => {
    const every = pollInterval(current)
    if (!every) return undefined
    const controller = new AbortController()
    const poll = async () => {
      try {
        const fresh = await adapter.agent.run(current.id)
        if (controller.signal.aborted) return
        setCurrent(fresh)
        setRuns((list) => upsertRun(list, fresh))
      } catch (e) {
        if (!controller.signal.aborted) setNotice(e.message ?? String(e))
      }
    }
    const timer = setInterval(poll, every)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [adapter, current])

  const apply = (fresh) => {
    setCurrent(fresh)
    setRuns((list) => upsertRun(list, fresh))
    setNotice(null)
  }
  const attempt = async (fn, scriptIndex = null) => {
    try {
      apply(await fn())
      if (scriptIndex != null) setErrors((e) => ({ ...e, [scriptIndex]: null }))
    } catch (e) {
      const message = e.message ?? String(e)
      if (scriptIndex != null) setErrors((er) => ({ ...er, [scriptIndex]: message }))
      else setNotice(message)
    }
  }

  const run = current
  const active = run && !['done', 'failed'].includes(run.state)

  return (
    <aside className={styles.panel} role="dialog" aria-label="Agent" data-testid="agent-panel">
      <div className={styles.head}>
        <span className={styles.title}>{view === 'history' ? 'Run history' : (run?.title ?? 'Agent')}</span>
        <IconButton icon="history" label="Run history" iconSize={20} onClick={() => setView(view === 'history' ? 'run' : 'history')} />
        <IconButton icon="add" label="New run" iconSize={20} onClick={onNewRun} />
        <IconButton icon="close" label="Close" iconSize={20} onClick={onClose} />
      </div>

      {view === 'history' ? (
        <div className={styles.body}>
          {runs?.length === 0 && <div className={styles.empty}>No runs in this project yet.</div>}
          {runs?.map((r) => (
            <button key={r.id} type="button" className={styles.historyRow} onClick={() => { setCurrent(r); setView('run') }}>
              <span className={styles.historyTitle}>{r.title}</span>
              <span className={styles.historyMeta}>{r.step} · {fmt(r.created_at)}</span>
            </button>
          ))}
        </div>
      ) : !run ? (
        <div className={styles.body}>
          <div className={styles.empty}>Attach a seed, pick a skill, and press → to plan a scene.</div>
          {notice && <div className={styles.error} role="alert">{notice}</div>}
        </div>
      ) : (
        <>
          <div className={styles.body}>
            <div className={styles.step} data-testid="run-step">
              {run.state === 'planning' && <Thinking />}
              <span>{run.step}</span>
              <span className={styles.state}>{run.state}</span>
            </div>
            {(run.state === 'rendering' || run.state === 'queued') && (
              <div className={styles.bar} aria-label="clip progress">
                <div className={styles.barFill} style={{ width: `${run.clips[Math.min(run.clip_index, run.count - 1)]?.progress ?? 0}%` }} />
              </div>
            )}
            {(run.state === 'paused' || run.state === 'failed') && run.error && <div className={styles.error} role="alert">{run.error}</div>}
            {notice && <div className={styles.error} role="alert">{notice}</div>}

            {run.titles?.length > 0 && (
              <div className={styles.titles}>
                {run.titles.map((t) => (
                  <span key={t} className={styles.chip}>{t}</span>
                ))}
              </div>
            )}

            {run.scripts.map((script, i) => (
              <div className={styles.script} key={i} data-testid="script">
                <div className={styles.scriptHead}>
                  <span>Script {i + 1} of {run.count}</span>
                  <span className={styles.grow} />
                  {run.clips[i]?.status && run.clips[i].status !== 'pending' && <span className={styles.state}>{run.clips[i].status}</span>}
                  {canReview(run) && (
                    <IconButton
                      icon="refresh"
                      label={`Rewrite script ${i + 1}`}
                      iconSize={18}
                      disabled={busy != null}
                      onClick={async () => {
                        setBusy(i)
                        await attempt(() => adapter.agent.rewriteScript(run.id, i + 1), i)
                        setBusy(null)
                      }}
                    />
                  )}
                </div>
                <textarea
                  className={styles.textarea}
                  aria-label={`Script ${i + 1}`}
                  defaultValue={script}
                  key={`${run.id}-${i}-${script}`}
                  disabled={!canReview(run) || busy === i}
                  onBlur={(e) => {
                    const text = e.target.value.trim()
                    if (canReview(run) && text && text !== script) attempt(() => adapter.agent.editScript(run.id, i + 1, text), i)
                  }}
                />
                {busy === i && <div className={styles.step}><Thinking /> Rewriting…</div>}
                {errors[i] && <div className={styles.error} role="alert">{errors[i]}</div>}
              </div>
            ))}

            {run.summary && <pre className={styles.summary}>{run.summary}</pre>}

            {run.state === 'done' && (
              <div className={styles.clips} data-testid="run-clips">
                {run.clips.map((c) => (
                  <img key={c.n} src={adapter.getMediaUrl(c.media_id, 'THUMBNAIL')} alt={`Clip ${c.n}`} />
                ))}
              </div>
            )}
          </div>

          <div className={styles.foot}>
            {canReview(run) && (
              <>
                <button type="button" className={styles.primary} onClick={() => attempt(() => adapter.agent.approve(run.id))}>
                  Approve
                </button>
                <span className={styles.hint}>{approveHint(run, caps)}</span>
              </>
            )}
            {canResume(run) && (
              <button type="button" className={styles.primary} onClick={() => attempt(() => adapter.agent.resume(run.id))}>
                Resume
              </button>
            )}
            {run.state === 'done' && <span className={styles.hint}>Done — {run.count} clip{run.count === 1 ? '' : 's'} in the grid</span>}
            {active && !canReview(run) && !canResume(run) && (
              <span className={styles.hint}>
                <Icon name="schedule" size={14} /> The agent is working; you can close this panel.
              </span>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
