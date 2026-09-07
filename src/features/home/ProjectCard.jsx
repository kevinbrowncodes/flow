import { useState } from 'react'
import { Link } from 'react-router'
import IconButton from '../../components/IconButton/IconButton.jsx'
import styles from './ProjectCard.module.css'

/**
 * One project in the home grid (RECON-08 §3–§4).
 *
 * The thumbnail *is* the link. The footer carries the title plus two icons
 * that only appear on hover or focus — there is no per-card overflow menu and
 * no badges; those simply do not exist in Flow.
 */
export default function ProjectCard({ project, thumbnailUrl, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.title)
  const [loaded, setLoaded] = useState(false)

  const commit = () => {
    // An empty title keeps the old one — never leave a project unnamed.
    onRename(draft.trim() || project.title)
    setEditing(false)
  }
  const cancel = () => {
    setDraft(project.title)
    setEditing(false)
  }

  return (
    <div className={styles.card} data-testid="project-card">
      <Link className={styles.thumb} to={`/project/${project.id}`} aria-label="Open project">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt=""
            className={loaded ? styles.loaded : ''}
            onLoad={() => setLoaded(true)}
          />
        )}
      </Link>

      <div className={styles.footer}>
        <div className={styles.titleLabel}>
          {editing ? (
            <input
              className={styles.input}
              value={draft}
              aria-label="Project title"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') cancel()
              }}
            />
          ) : (
            <span className={styles.title}>{project.title}</span>
          )}
          {editing ? (
            <>
              <IconButton className={styles.footerButton} icon="check" label="Done" iconSize={18} onClick={commit} />
              <IconButton className={styles.footerButton} icon="close" label="Cancel" iconSize={18} onClick={cancel} />
            </>
          ) : (
            <IconButton
              className={styles.footerButton}
              icon="edit"
              label="Edit project title"
              iconSize={18}
              onClick={() => {
                setDraft(project.title)
                setEditing(true)
              }}
            />
          )}
        </div>

        {!editing && (
          <IconButton
            className={styles.footerButton}
            icon="delete"
            label="Delete project"
            iconSize={18}
            /* currentTarget, not a ref: IconButton is a plain function component
               and focus must return here if the dialog is cancelled. */
            onClick={(e) => onDelete(e.currentTarget)}
          />
        )}
      </div>
    </div>
  )
}
