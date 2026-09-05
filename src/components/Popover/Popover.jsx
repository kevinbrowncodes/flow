import { useEffect, useRef } from 'react'
import Icon from '../Icon/Icon.jsx'
import styles from './Popover.module.css'

/**
 * Anchored popover. Mounts with Flow's measured `slideUp` animation and
 * unmounts immediately — RECON-05 §7 found no close animation, so we add none.
 */
export function Popover({ open, onClose, place = 'down', align = 'start', width, children, trigger }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className={styles.wrap} ref={ref}>
      {trigger}
      {open && (
        <div
          role="menu"
          className={[styles.panel, styles[place], styles[align]].join(' ')}
          style={width ? { width } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, children, destructive = false, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[styles.item, destructive ? styles.destructive : ''].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}
