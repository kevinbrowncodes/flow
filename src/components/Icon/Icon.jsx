import 'material-symbols/outlined.css'
import styles from './Icon.module.css'

/**
 * Material Symbols ligature icon.
 *
 * The glyph name is the text content — `<Icon name="play_circle" />` renders
 * the play_circle glyph. Names come straight from recon, e.g. `dashboard`,
 * `videocam`, `crop_16_9`, `arrow_forward`, `keyboard_arrow_down`.
 */
export default function Icon({ name, size, filled = false, className = '' }) {
  const classes = [
    'material-symbols-outlined',
    styles.icon,
    filled ? styles.filled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={classes}
      style={size ? { '--icon-size': `${size}px` } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
