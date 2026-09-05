import Icon from '../Icon/Icon.jsx'
import styles from './IconButton.module.css'

export default function IconButton({
  icon,
  label,
  variant = 'round', // 'round' | 'action'
  iconSize,
  filled = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[styles.btn, variant === 'action' ? styles.action : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <Icon name={icon} filled={filled} size={iconSize ?? (variant === 'action' ? 20 : 24)} />
    </button>
  )
}
