import { useEffect, useState } from 'react'
import { useAdapter } from '../../adapter/useAdapter.js'
import panels from '../editor/panels.module.css'
import styles from './agent.module.css'

/**
 * "Agent instructions" (RECON-10 §1) — read-only here (D22): the skills are the
 * backend's, versioned in its repo. One radio row per instruction.
 */
export default function InstructionPicker({ selected, onSelect }) {
  const adapter = useAdapter()
  const [instructions, setInstructions] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    adapter.agent
      .instructions()
      .then((rows) => !controller.signal.aborted && setInstructions(rows))
      .catch((e) => !controller.signal.aborted && setError(e.message ?? String(e)))
    return () => controller.abort()
  }, [adapter])

  return (
    <div className={panels.panel} style={{ width: 320 }} data-testid="instruction-picker">
      <div className={styles.sectionTitle}>Agent instructions</div>
      {error && <div className={styles.empty} role="alert">{error}</div>}
      {instructions && instructions.length === 0 && <div className={styles.empty}>No skills in the library yet</div>}
      {instructions?.map((i) => (
        <button
          key={i.id}
          type="button"
          role="radio"
          aria-checked={selected === i.id}
          className={[styles.radioRow, selected === i.id ? styles.radioOn : ''].filter(Boolean).join(' ')}
          onClick={() => onSelect(i)}
        >
          <span className={styles.radioDot} aria-hidden="true" />
          <span className={styles.radioBody}>
            <span className={styles.radioName}>{i.name}</span>
            {i.description && <span className={styles.radioDesc}>{i.description}</span>}
          </span>
          {i.count_locked && <span className={styles.badge}>1 clip</span>}
        </button>
      ))}
    </div>
  )
}
