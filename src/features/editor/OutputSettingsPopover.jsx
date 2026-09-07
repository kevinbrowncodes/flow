import { Fragment } from 'react'
import Toggle from '../../components/Toggle/Toggle.jsx'
import { findMode, formatValue } from '../../adapter/contract.js'
import styles from './panels.module.css'

function Row({ options, value, onChange, format }) {
  return (
    <div className={styles.segmented} style={{ flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className={[styles.segment, value === opt.value ? styles.segmentOn : ''].filter(Boolean).join(' ')}
          style={{ flex: '0 0 auto', padding: '0 10px' }}
          onClick={() => onChange(opt.value)}
        >
          {format(opt)}
        </button>
      ))}
    </div>
  )
}

export function FieldControl({ field, value, onChange }) {
  switch (field.type) {
    case 'choice':
      return <Row options={field.options} value={value} onChange={onChange} format={(o) => formatValue(field, o.value)} />
    case 'boolean':
      return (
        <label className={styles.toggleRow}>
          {field.label}
          <Toggle checked={Boolean(value)} onChange={onChange} label={field.label ?? field.key} />
        </label>
      )
    case 'number':
      return (
        <input
          type="number"
          className={styles.input}
          aria-label={field.label ?? field.key}
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? field.default : Number(e.target.value))}
        />
      )
    case 'text':
      return (
        <input
          type="text"
          className={styles.input}
          aria-label={field.label ?? field.key}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return null
  }
}

/**
 * Rendered entirely from the backend's capabilities: one tab per mode, one
 * control per field. The mock backend's schema is Google's matrix verbatim
 * (RECON-04 §7); a real gateway declares its own knobs the same way.
 */
export default function OutputSettingsPopover({ caps, output, onOutput, onMode, cost }) {
  const mode = findMode(caps, output.mode)
  const values = output.values[mode.key] ?? {}
  return (
    <div className={styles.panel} style={{ width: 300 }}>
      {caps.modes.length > 1 && (
        <div className={styles.segmented}>
          {caps.modes.map((m) => (
            <button
              key={m.key}
              type="button"
              className={[styles.segment, mode.key === m.key ? styles.segmentOn : ''].filter(Boolean).join(' ')}
              onClick={() => onMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {mode.fields.map((f) => (
        <Fragment key={f.key}>
          {f.label && f.type !== 'boolean' && <span className={styles.sectionLabel}>{f.label}</span>}
          <FieldControl field={f} value={values[f.key]} onChange={(v) => onOutput(mode.key, f.key, v)} />
        </Fragment>
      ))}

      {/* Verbatim wording (RECON-04 §7); hidden when the backend has no credit model. */}
      {cost != null && <span className={styles.count}>Generating will use {cost} credits</span>}
    </div>
  )
}
