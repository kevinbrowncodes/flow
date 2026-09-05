import Icon from '../Icon/Icon.jsx'
import styles from './SearchField.module.css'

/** Flow's search has NO placeholder text — icon only (RECON-03/04). */
export default function SearchField({ value, onChange, label = 'Search' }) {
  return (
    <div className={styles.pill}>
      <Icon name="search" />
      <input
        type="text"
        className={styles.input}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
