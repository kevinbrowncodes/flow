import Toggle from '../../components/Toggle/Toggle.jsx'
import styles from './panels.module.css'

function Segmented({ options, value, onChange }) {
  return (
    <div className={styles.segmented} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={[styles.segment, value === opt.value ? styles.segmentOn : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Contents per RECON-04 §4; panel measured 292×344. */
export default function ViewSettingsPopover({ view, onView }) {
  const toggles = [
    ['soundOnHover', 'Sound on hover'],
    ['returnSilentVideos', 'Return silent videos'],
    ['showTileDetails', 'Show tile details'],
    ['clearPromptOnSubmit', 'Clear prompt on submit'],
  ]
  return (
    <div className={styles.panel} style={{ width: 260 }}>
      <span className={styles.sectionLabel}>View Mode</span>
      <Segmented
        options={[{ value: 'grid', label: 'Grid' }, { value: 'batch', label: 'Batch' }]}
        value={view.mode}
        onChange={(v) => onView('mode', v)}
      />
      <span className={styles.sectionLabel}>Grid Size</span>
      <Segmented
        options={[{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }]}
        value={view.gridSize}
        onChange={(v) => onView('gridSize', v)}
      />
      {toggles.map(([key, label]) => (
        <label key={key} className={styles.toggleRow}>
          {label}
          <Toggle checked={view[key]} onChange={(v) => onView(key, v)} label={label} />
        </label>
      ))}
    </div>
  )
}
