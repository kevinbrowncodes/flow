import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useAdapter } from '../../adapter/useAdapter.js'
import { useEditorState, railPresence, filterBatches } from './editorState.js'
import Rail from './Rail.jsx'
import TopBar from './TopBar.jsx'
import BatchBlock, { MediaTile } from './BatchBlock.jsx'
import Composer from './Composer.jsx'
import AgentPanel from '../agent/AgentPanel.jsx'
import styles from './EditorPage.module.css'

/* Grid view tile heights by size (RECON-04 §4; S/M measured EST, L EST). */
const GRID_HEIGHTS = { S: 158, M: 325, L: 400 }

function Fatal({ error }) {
  return (
    <div className={styles.fatal} role="alert">
      <p className={styles.fatalTitle}>Flow can’t start</p>
      <p className={styles.fatalBody}>{error.message ?? String(error)}</p>
      <button type="button" className={styles.fatalRetry} onClick={() => globalThis.location.reload()}>
        Retry
      </button>
    </div>
  )
}

export default function EditorPage() {
  const { projectId } = useParams()
  const adapter = useAdapter()
  const [project, setProject] = useState(null)
  const [title, setTitle] = useState('')
  const [state, dispatch, actions] = useEditorState(projectId)
  const scrollerRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [agentPanel, setAgentPanel] = useState({ open: false, runId: null }) // STORY-603

  useEffect(() => {
    let live = true
    adapter.getProject(projectId).then((p) => {
      if (!live) return
      setProject(p)
      if (p) setTitle(p.title)
    })
    return () => {
      live = false
    }
  }, [adapter, projectId])

  if (state.error) return <Fatal error={state.error} />
  const caps = state.caps
  if (!caps) return <div className={styles.loading}>Loading…</div>

  const batches = filterBatches(state.batches, state.filter, state.search)
  const presence = railPresence(state.batches)
  const loading = state.batches === null
  const isEmpty = !loading && state.batches.length === 0

  if (!project && !loading) return <div className={styles.loading}>Project not found</div>

  return (
    <div className={styles.page}>
      <Rail
        expanded={state.railExpanded}
        presence={presence}
        surfaces={caps.surfaces}
        filter={state.filter}
        onFilter={(f) => dispatch({ type: 'FILTER', filter: f })}
        onToggle={() => dispatch({ type: 'RAIL_TOGGLE' })}
      />
      <div className={styles.content}>
        <div
          className={styles.scroller}
          ref={scrollerRef}
          onScroll={() => setScrolled(scrollerRef.current.scrollTop > 0)}
        >
          {loading && <div className={styles.loading}>Loading…</div>}
          {!loading && (isEmpty || batches.length === 0) && (
            <div className={styles.empty}>{caps.strings.empty ?? 'Start creating or drop media'}</div>
          )}
          {!loading && batches.length > 0 && state.view.mode === 'batch' && (
            batches.map((b) => (
              <BatchBlock
                key={b.id}
                batch={b}
                showDetails={state.view.showTileDetails}
                onDelete={() => actions.deleteBatch(b.id)}
              />
            ))
          )}
          {!loading && batches.length > 0 && state.view.mode === 'grid' && (
            <div className={styles.gridView}>
              {batches.flatMap((b) =>
                b.items.map((item) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    prompt={b.prompt}
                    showDetails={state.view.showTileDetails}
                    height={GRID_HEIGHTS[state.view.gridSize]}
                  />
                )),
              )}
            </div>
          )}
        </div>
        <div className={[styles.scrollFade, scrolled ? styles.scrollFadeOn : ''].filter(Boolean).join(' ')} />
      </div>

      <TopBar
        title={title}
        onRename={setTitle}
        search={state.search}
        onSearch={(v) => dispatch({ type: 'SEARCH', value: v })}
        view={state.view}
        onView={(key, value) => dispatch({ type: 'VIEW_SET', key, value })}
      />

      {/* Empty project keeps the composer unchanged (RECON-04 §9). */}
      <Composer
        caps={caps}
        projectId={projectId}
        output={state.output}
        onOutput={(mode, key, value) => dispatch({ type: 'OUTPUT_SET', mode, key, value })}
        onMode={(mode) => dispatch({ type: 'OUTPUT_MODE', mode })}
        reference={state.reference}
        onReference={(mediaId) => dispatch({ type: 'REFERENCE', mediaId })}
        onGenerate={actions.generate}
        clearOnSubmit={state.view.clearPromptOnSubmit}
        notice={state.notice}
        agent={state.agent}
        onAgentToggle={() => dispatch({ type: 'AGENT_TOGGLE' })}
        onAgentSet={(key, value, range) => dispatch({ type: 'AGENT_SET', key, value, ...(range ?? {}) })}
        onAgentInstruction={(i) => dispatch({ type: 'AGENT_INSTRUCTION', id: i.id, countLocked: i.count_locked })}
        onAgentRun={async () => {
          const run = await actions.agentRun()
          if (run) setAgentPanel({ open: true, runId: run.id })
          return Boolean(run)
        }}
        onAgentExpand={() => setAgentPanel((p) => ({ ...p, open: true }))}
      />

      {agentPanel.open && caps.agent && (
        <AgentPanel
          caps={caps}
          projectId={projectId}
          runId={agentPanel.runId}
          onClose={() => setAgentPanel((p) => ({ ...p, open: false }))}
          onNewRun={() => setAgentPanel((p) => ({ ...p, open: false }))}
        />
      )}

      <footer className={styles.footer}>{caps.strings.footer ?? `${caps.name} can make mistakes, so double check it`}</footer>
    </div>
  )
}
