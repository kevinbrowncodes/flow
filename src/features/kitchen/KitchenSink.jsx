import IconButton from '../../components/IconButton/IconButton.jsx'
import Chip from '../../components/Chip/Chip.jsx'
import SearchField from '../../components/SearchField/SearchField.jsx'
import Toggle from '../../components/Toggle/Toggle.jsx'
import { MenuItem } from '../../components/Popover/Popover.jsx'
import { useState } from 'react'
import styles from './KitchenSink.module.css'

const COLORS = [
  ['--surface-page', 'page'],
  ['--surface-glass', 'glass'],
  ['--tint-fill', 'tint/0.05 fill'],
  ['--tint-line', 'tint/0.1 line'],
  ['--tint-hover', 'tint/0.15 hover'],
  ['--tint-active', 'tint/0.25 active'],
  ['--tint-muted', 'tint/0.5 muted'],
  ['--tint-label', 'tint/0.75 label'],
  ['--accent-bg', 'accent'],
  ['--destructive', 'destructive'],
]

const RADII = [
  ['--radius-action', '10 action'],
  ['--radius-hover-toolbar', '12 toolbar'],
  ['--radius-chip', '15 chip'],
  ['--radius-field', '16 field/rail'],
  ['--radius-tile', '17 tile'],
  ['--radius-popover', '18 popover'],
  ['--radius-composer', '24 composer'],
]

const TYPES = [
  ['type-title', '16/400/24 title'],
  ['type-search', '16/500/20 search'],
  ['type-input', '14/400/20 input'],
  ['type-nav', '14/500/20 nav'],
  ['type-caption', '13/500/16 caption'],
  ['type-body', '12/400/16 body'],
  ['type-meta', '12/500/16 meta'],
  ['type-label', '11/500/16 label'],
]

export default function KitchenSink() {
  const [q, setQ] = useState('')
  const [on, setOn] = useState(true)
  return (
    <div className={styles.page}>
      <h1 className={styles.h}>Kitchen sink — every token, visible</h1>

      <section>
        <h2 className={styles.h}>Color</h2>
        <div className={styles.row}>
          {COLORS.map(([v, name]) => (
            <div key={v} className={styles.swatch}>
              <div className={styles.chipBox} style={{ background: `var(${v})` }} />
              {name} · {v}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.h}>Radii (measured, not a scale)</h2>
        <div className={styles.row}>
          {RADII.map(([v, name]) => (
            <div key={v} className={styles.radiusBox} style={{ borderRadius: `var(${v})` }}>
              {name}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.h}>Type roles</h2>
        {TYPES.map(([cls, name]) => (
          <div key={cls} className={styles.typeRow}>
            <span className={styles.typeName}>{name}</span>
            <span className={cls}>What do you want to create?</span>
          </div>
        ))}
      </section>

      <section>
        <h2 className={styles.h}>Primitives</h2>
        <div className={styles.row}>
          <IconButton icon="settings_2" label="Round" />
          <IconButton variant="action" icon="download" label="Action" />
          <IconButton variant="action" icon="download" label="Disabled" disabled />
          <Chip>Nano Banana 2</Chip>
          <Chip on>Agent on</Chip>
          <SearchField value={q} onChange={setQ} />
          <Toggle checked={on} onChange={setOn} label="Demo" />
        </div>
        <div className={styles.row} style={{ marginTop: 12, maxWidth: 200, flexDirection: 'column', alignItems: 'stretch' }}>
          <MenuItem icon="edit">Rename</MenuItem>
          <MenuItem icon="delete" destructive>Delete</MenuItem>
        </div>
      </section>
    </div>
  )
}
