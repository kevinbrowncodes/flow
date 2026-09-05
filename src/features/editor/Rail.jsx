import Icon from '../../components/Icon/Icon.jsx'
import styles from './Rail.module.css'

/**
 * Left icon rail (STORY-202). Items and ligature names verbatim from RECON-04 §2.
 * Dynamic: Images / Videos / Uploads appear only when such media exists.
 * Characters, Scenes, Tools and Trash render only where the backend claims the
 * surface (capabilities.surfaces) — and then inert (D6).
 */
const TOP_ITEMS = [
  { key: 'all', icon: 'dashboard', label: 'All Media' },
  { key: 'images', icon: 'image', label: 'Images', conditional: 'images' },
  { key: 'videos', icon: 'videocam', label: 'Videos', conditional: 'videos' },
  { key: 'characters', icon: 'accessibility_new', label: 'Characters', inert: true, surface: 'characters' },
  { key: 'scenes', icon: 'movie', label: 'Scenes', surface: 'scenes' },
  { key: 'uploads', icon: 'drive_folder_upload', label: 'Uploads', conditional: 'uploads' },
]

function RailItem({ icon, label, active, inert, onClick }) {
  return (
    <button
      type="button"
      className={[styles.item, active ? styles.active : '', inert ? styles.inert : ''].filter(Boolean).join(' ')}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={inert ? undefined : onClick}
    >
      <span className={styles.iconChip}>
        <Icon name={icon} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}

export default function Rail({ expanded, presence, surfaces = {}, filter, onFilter, onToggle }) {
  const visible = TOP_ITEMS.filter((it) => (!it.conditional || presence[it.conditional]) && (!it.surface || surfaces[it.surface]))
  return (
    <nav className={[styles.rail, expanded ? '' : styles.collapsed].filter(Boolean).join(' ')} aria-label="Project">
      {visible.map((it) => (
        <RailItem
          key={it.key}
          icon={it.icon}
          label={it.label}
          inert={it.inert}
          active={filter === it.key}
          onClick={() => onFilter(it.key)}
        />
      ))}
      {surfaces.tools && (
        <>
          <div className={styles.separator} />
          <RailItem icon="apps" label="Tools" inert /> {/* V6: apps_spark_2 not in the public font */}
        </>
      )}
      <div className={styles.spacer} />
      {surfaces.trash && <RailItem icon="delete" label="Trash" inert />}
      <RailItem
        icon={expanded ? 'left_panel_close' : 'left_panel_open'}
        label="Collapse"
        onClick={onToggle}
      />
    </nav>
  )
}
