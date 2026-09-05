import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import IconButton from '../../components/IconButton/IconButton.jsx'
import SearchField from '../../components/SearchField/SearchField.jsx'
import { Popover, MenuItem } from '../../components/Popover/Popover.jsx'
import ViewSettingsPopover from './ViewSettingsPopover.jsx'
import FiltersPopover from './FiltersPopover.jsx'
import styles from './TopBar.module.css'

export default function TopBar({ title, onRename, search, onSearch, view, onView }) {
  const navigate = useNavigate()
  const [menu, setMenu] = useState(null) // 'title' | 'add' | 'gear' | 'filter'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef(null)

  const commit = () => {
    onRename(draft.trim() || title)
    setEditing(false)
  }
  const cancel = () => {
    setDraft(title)
    setEditing(false)
  }
  const startRename = () => {
    setMenu(null)
    setEditing(true)
    // Rename focuses the SAME input in place (RECON-05 C3)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <IconButton icon="arrow_back" label="Go Back" iconSize={20} onClick={() => navigate('/')} />
        <input
          ref={inputRef}
          className={styles.title}
          value={editing ? draft : title}
          aria-label="Project title"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            setDraft(title)
            setEditing(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit() // Enter commits, Escape cancels (RECON-05 C3)
            if (e.key === 'Escape') cancel()
          }}
        />
        {editing && (
          <>
            <IconButton icon="check" label="Done" onClick={commit} />
            <IconButton icon="close" label="Cancel" onClick={cancel} />
          </>
        )}
        <Popover
          open={menu === 'title'}
          onClose={() => setMenu(null)}
          width={192} /* RECON-04 §3 */
          trigger={
            <IconButton icon="more_vert" label="Project options" iconSize={20} onClick={() => setMenu(menu === 'title' ? null : 'title')} />
          }
        >
          <MenuItem icon="edit" onClick={startRename}>Rename</MenuItem>
          <MenuItem icon="delete" onClick={() => setMenu(null)}>View Trash</MenuItem>
          <MenuItem icon="delete" destructive onClick={() => setMenu(null)}>Delete</MenuItem>
        </Popover>
      </div>

      <div className={styles.center}>
        <SearchField value={search} onChange={onSearch} />
        <Popover
          open={menu === 'filter'}
          onClose={() => setMenu(null)}
          align="end"
          trigger={<IconButton icon="filter_list" label="Sort & Filter" onClick={() => setMenu(menu === 'filter' ? null : 'filter')} />}
        >
          <FiltersPopover />
        </Popover>
      </div>

      <div className={styles.right}>
        <Popover
          open={menu === 'add'}
          onClose={() => setMenu(null)}
          align="end"
          trigger={<IconButton icon="add" label="Add Media" onClick={() => setMenu(menu === 'add' ? null : 'add')} />}
        >
          <MenuItem icon="upload" onClick={() => setMenu(null)}>Upload media</MenuItem>
          <MenuItem icon="folder" onClick={() => setMenu(null)}>Create Collection</MenuItem>
          <MenuItem icon="accessibility_new" onClick={() => setMenu(null)}>Create Character</MenuItem>
          <MenuItem icon="movie" onClick={() => setMenu(null)}>Create Scene</MenuItem>
        </Popover>
        <IconButton icon="help" label="Product Help" />
        <Popover
          open={menu === 'gear'}
          onClose={() => setMenu(null)}
          align="end"
          trigger={<IconButton icon="settings" /* V6: settings_2 not in the public font */ label="View Settings" onClick={() => setMenu(menu === 'gear' ? null : 'gear')} />}
        >
          <ViewSettingsPopover view={view} onView={onView} />
        </Popover>
        <IconButton icon="more_vert" label="More" />
        <span className={styles.plan}>
          <span className={styles.ultra}>ULTRA</span>
          <span className={styles.avatar} aria-label="Account">KB</span>
        </span>
      </div>
    </header>
  )
}
