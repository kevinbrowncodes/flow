import { runFields } from '../../adapter/contract.js'
import { FieldControl } from '../editor/OutputSettingsPopover.jsx'
import panels from '../editor/panels.module.css'
import styles from './agent.module.css'

function Segmented({ options, value, onChange, label }) {
  return (
    <div className={panels.segmented} role="radiogroup" aria-label={label} style={{ flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={[panels.segment, value === o.value ? panels.segmentOn : ''].filter(Boolean).join(' ')}
          style={{ flex: '0 0 auto', padding: '0 10px' }}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * "Agent settings" (RECON-10 §1): confirm-before-rendering, the clip count, and
 * the run's fields — the video mode's fields the backend listed — with the same
 * control per field the output-settings popover uses.
 */
export default function AgentSettings({ caps, agent, onSet, onClose }) {
  const { min, max } = caps.agent.count
  const wide = max - min + 1 > 8
  return (
    <div className={panels.panel} style={{ width: 300 }} data-testid="agent-settings">
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Confirm before rendering</div>
        <Segmented
          label="Confirm before rendering"
          value={agent.confirm}
          onChange={(v) => onSet('confirm', v)}
          options={[{ value: 'always', label: 'Always' }, { value: 'never', label: 'Never' }]}
        />
        <div className={styles.hint}>
          {agent.confirm === 'always' ? 'The agent shows you every script and waits for your approval.' : 'The agent renders as soon as the scripts exist.'}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Clips{agent.lockedCount ? ' — this skill writes one clip' : ''}</div>
        {wide ? (
          <input
            type="number"
            className={panels.input}
            aria-label="Clips"
            min={min}
            max={max}
            value={agent.count}
            disabled={agent.lockedCount}
            onChange={(e) => onSet('count', Number(e.target.value), { min, max })}
          />
        ) : (
          <div style={agent.lockedCount ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
            <Segmented
              label="Clips"
              value={agent.count}
              onChange={(v) => onSet('count', v, { min, max })}
              options={Array.from({ length: max - min + 1 }, (_, i) => ({ value: min + i, label: String(min + i) }))}
            />
          </div>
        )}
      </div>
      {runFields(caps).map((f) => (
        <div className={styles.section} key={f.key}>
          {f.label && f.type !== 'boolean' && <div className={styles.sectionTitle}>{f.label}</div>}
          <FieldControl field={f} value={agent.values[f.key]} onChange={(v) => onSet('values', { [f.key]: v })} />
        </div>
      ))}
      <div className={styles.actions}>
        <button type="button" className={styles.save} onClick={onClose}>
          Save
        </button>
      </div>
    </div>
  )
}
