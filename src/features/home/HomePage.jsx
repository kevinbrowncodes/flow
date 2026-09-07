import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAdapter } from '../../adapter/useAdapter.js'
import { PROTOCOL_VERSION } from '../../adapter/contract.js'
import Icon from '../../components/Icon/Icon.jsx'
import IconButton from '../../components/IconButton/IconButton.jsx'
import { Popover, MenuItem } from '../../components/Popover/Popover.jsx'
import ProjectCard from './ProjectCard.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import styles from './HomePage.module.css'

const UI_VERSION = typeof __FLOW_VERSION__ === 'string' ? __FLOW_VERSION__ : 'dev'

const DELETE_BODY =
  'Its prompts and layout will be removed from this browser. The clips stay on the box and remain available in the asset picker.'

/** The newest finished item in a project's newest batch, or null. */
function posterKey(batches) {
  for (const batch of batches ?? []) {
    const item = (batch.items ?? []).find((i) => i.status === 'done' && i.assetKey)
    if (item) return item.assetKey
  }
  return null
}

/**
 * The projects home (STORY-208 / RECON-08).
 *
 * Projects live in the browser (`adapter/store.js`), so this lists the
 * projects of *this* browser, not of the backend. A gateway that later grows
 * `/flow/projects` swaps the store underneath and this page is unchanged.
 */
export default function HomePage() {
  const adapter = useAdapter()
  const navigate = useNavigate()
  const [projects, setProjects] = useState(null)
  const [posters, setPosters] = useState({})
  const [caps, setCaps] = useState(null)
  const [error, setError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { projectId | 'all', opener }

  /** Projects plus the poster for each, in one pass. All reads are local
   *  (localStorage), so the N+1 costs nothing worth batching away. */
  const load = useCallback(
    async (signal) => {
      const list = await adapter.listProjects()
      const entries = await Promise.all(
        list.map(async (p) => [p.id, posterKey(await adapter.listBatches(p.id))]),
      )
      if (signal?.aborted) return
      setProjects(list)
      setPosters(Object.fromEntries(entries))
    },
    [adapter],
  )

  useEffect(() => {
    const controller = new AbortController()
    const run = async () => {
      try {
        const [c] = await Promise.all([adapter.capabilities(), load(controller.signal)])
        if (!controller.signal.aborted) setCaps(c)
      } catch (e) {
        if (!controller.signal.aborted) setError(e)
      }
    }
    run()
    return () => controller.abort()
  }, [adapter, load])

  const newProject = async () => {
    const project = await adapter.createProject()
    navigate(`/project/${project.id}`) // §5: straight in, no dialog
  }

  const confirmDelete = async () => {
    const target = confirm
    setConfirm(null)
    if (target.projectId === 'all') await Promise.all(projects.map((p) => adapter.deleteProject(p.id)))
    else await adapter.deleteProject(target.projectId)
    await load()
  }

  if (error) return <div className={styles.fatal}>{error.message ?? String(error)}</div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.wordmark}>
          {caps?.name ?? 'Flow'}
        </Link>
        <Popover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          align="end"
          width={260}
          trigger={<IconButton icon="more_vert" label="More options" iconSize={20} onClick={() => setMenuOpen(!menuOpen)} />}
        >
          <div className={styles.about}>
            <div className={styles.aboutRow}>
              <span>Flow UI</span>
              <span className={styles.aboutValue}>{UI_VERSION}</span>
            </div>
            <div className={styles.aboutRow}>
              <span>Protocol</span>
              <span className={styles.aboutValue}>v{PROTOCOL_VERSION}</span>
            </div>
            <div className={styles.aboutRow}>
              <span>Gateway</span>
              <span className={styles.aboutValue}>{adapter.gatewayUrl ?? 'unknown'}</span>
            </div>
            <div className={styles.aboutRow}>
              <span>Model</span>
              <span className={styles.aboutValue}>{caps?.name ?? '—'}</span>
            </div>
          </div>
          <MenuItem
            icon="delete"
            destructive
            onClick={() => {
              setMenuOpen(false)
              setConfirm({ projectId: 'all', opener: null })
            }}
          >
            Delete all projects…
          </MenuItem>
        </Popover>
      </header>

      {projects && projects.length === 0 ? (
        <p className={styles.empty}>No projects yet</p>
      ) : (
        <div className={styles.grid} data-testid="projects-grid">
          {(projects ?? []).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              thumbnailUrl={posters[project.id] ? adapter.getMediaUrl(posters[project.id], 'THUMBNAIL') : null}
              onRename={async (title) => {
                await adapter.renameProject(project.id, title)
                await load()
              }}
              onDelete={(opener) => setConfirm({ projectId: project.id, opener })}
            />
          ))}
        </div>
      )}

      <button type="button" className={styles.newProject} onClick={newProject}>
        <Icon name="add" size={20} />
        New project
      </button>

      {confirm && (
        <ConfirmDialog
          headline={confirm.projectId === 'all' ? 'Delete all projects?' : 'Delete this project?'}
          body={DELETE_BODY}
          confirmLabel={confirm.projectId === 'all' ? 'Delete all' : 'Delete project'}
          returnFocusTo={confirm.opener}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
