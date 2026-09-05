import { useState } from 'react'
import styles from './panels.module.css'

/**
 * Sort & Filter popover (STORY-306). Section names from RECON-01; option
 * lists are EST — the popover's full contents were not captured verbatim.
 * Filtering is cosmetic for the MVP (search + rail filters do the real work).
 */
const SECTIONS = [
  ['Type', ['Video', 'Image', 'Uploaded']],
  ['Aspect', ['16:9', '9:16', '1:1']],
  ['Resolution', ['720p', '1080p']],
  ['Created', ['Any time', 'Today', 'This week']],
  ['Duration', ['Any', 'Up to 6s', '8s +']],
  ['Sort', ['Recent', 'Oldest']],
]

export default function FiltersPopover() {
  const [checked, setChecked] = useState(() => new Set())
  const toggle = (k) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  return (
    <div className={styles.panel} style={{ width: 240 }}>
      {SECTIONS.map(([name, options]) => (
        <div key={name}>
          <span className={styles.sectionLabel}>{name}</span>
          <div className={styles.segmented} style={{ marginTop: 4, flexWrap: 'wrap' }}>
            {options.map((opt) => {
              const k = `${name}:${opt}`
              return (
                <button
                  key={opt}
                  type="button"
                  className={[styles.segment, checked.has(k) ? styles.segmentOn : ''].filter(Boolean).join(' ')}
                  style={{ flex: '0 0 auto', padding: '0 10px' }}
                  onClick={() => toggle(k)}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className={styles.toggleRow}>
        <span className={styles.count}>{checked.size ? `${checked.size} filters` : 'All results'}</span>
        <button type="button" className={styles.clear} onClick={() => setChecked(new Set())}>
          Clear
        </button>
      </div>
    </div>
  )
}
