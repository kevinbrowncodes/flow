import styles from './Chip.module.css'

export default function Chip({ children, on = false, onClick, className = '', ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.chip, on ? styles.on : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
