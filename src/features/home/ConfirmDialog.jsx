import { useEffect, useRef } from 'react'
import styles from './ConfirmDialog.module.css'

/**
 * A modal confirmation (RECON-08 §4). Escape and a scrim click both cancel,
 * and focus returns to whatever opened it — the card's trash button.
 */
export default function ConfirmDialog({ headline, body, confirmLabel = 'Delete project', onConfirm, onCancel, returnFocusTo }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    const opener = returnFocusTo
    confirmRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // The opener may have been removed from the DOM by a confirmed delete;
      // focusing a detached node is a no-op, so no guard beyond existence.
      opener?.focus?.()
    }
  }, [onCancel, returnFocusTo])

  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={headline}>
        <p className={styles.headline}>{headline}</p>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" ref={confirmRef} className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
