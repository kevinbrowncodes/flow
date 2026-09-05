import { useRef, useState } from 'react'
import Icon from '../../components/Icon/Icon.jsx'
import IconButton from '../../components/IconButton/IconButton.jsx'
import Chip from '../../components/Chip/Chip.jsx'
import { Popover } from '../../components/Popover/Popover.jsx'
import OutputSettingsPopover from './OutputSettingsPopover.jsx'
import AssetPickerModal from './AssetPickerModal.jsx'
import { useAdapter } from '../../adapter/useAdapter.js'
import { findMode, fieldByRole, valueByRole } from '../../adapter/contract.js'
import styles from './Composer.module.css'

export default function Composer({ caps, projectId, output, onOutput, onMode, reference, onReference, onGenerate, clearOnSubmit, notice }) {
  const adapter = useAdapter()
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef(null)

  const mode = findMode(caps, output.mode)
  const values = output.values[mode.key] ?? {}
  const empty = text.trim().length === 0
  const needsReference = caps.reference === 'required' && !reference
  const disabled = empty || needsReference

  const chipModel = valueByRole(mode, values, 'model') ?? caps.name
  const chipCount = valueByRole(mode, values, 'count')
  const hasAspect = Boolean(fieldByRole(mode, 'aspect') || fieldByRole(mode, 'size'))
  const cost = caps.credits && adapter.estimateCost ? adapter.estimateCost(mode.key, values) : null

  const clear = () => {
    setText('')
    if (inputRef.current) inputRef.current.textContent = ''
  }

  const submit = async () => {
    if (disabled) return // only an empty prompt disables send (RECON-04 §7) — or a missing required reference
    const ok = await onGenerate(text.trim())
    // Prompt clears after a slight delay, not instantly (RECON-04 §8)
    if (ok && clearOnSubmit) setTimeout(clear, 400)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.column}>
        {notice && (
          <div className={styles.notice} role="alert">
            {notice}
          </div>
        )}
        <div className={styles.composer} data-testid="composer">
          <div className={styles.inputScroll}>
            <div
              ref={inputRef}
              className={styles.input}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Prompt"
              onInput={(e) => setText(e.currentTarget.textContent ?? '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            {empty && <span className={styles.placeholder}>{caps.strings.placeholder ?? 'What do you want to create?'}</span>}
          </div>
          <div className={styles.controls}>
            {caps.reference !== 'none' && (
              <IconButton icon="add" /* V6: add_2 not in the public font */ label="Add assets" onClick={() => setPickerOpen(true)} />
            )}
            {/* Agent mode is deferred (D6) — renders, stays inert. Only where the backend claims the surface. */}
            {caps.surfaces.agent && (
              <Chip aria-pressed="false" style={{ cursor: 'default' }}>
                Agent
              </Chip>
            )}
            {reference && (
              <button type="button" className={styles.refButton} aria-label="Remove reference" onClick={() => onReference(null)}>
                <img className={styles.refChip} src={adapter.getMediaUrl(reference, 'THUMBNAIL')} alt="Reference" />
              </button>
            )}
            {needsReference && <span className={styles.hint}>Add a reference to start</span>}
            <span className={styles.grow} />
            {!empty && <IconButton icon="close" label="Clear prompt" iconSize={20} onClick={clear} />}
            <Popover
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              place="up"
              align="end"
              trigger={
                <Chip onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Output settings">
                  {mode.icon && <span aria-hidden="true">{mode.icon}</span>}
                  {chipModel}
                  {hasAspect && <Icon name="crop_16_9" size={14} />}
                  {chipCount != null && `x${chipCount}`}
                </Chip>
              }
            >
              <OutputSettingsPopover caps={caps} output={output} onOutput={onOutput} onMode={onMode} cost={cost} />
            </Popover>
            <button
              type="button"
              className={[styles.send, disabled ? styles.sendDisabled : ''].filter(Boolean).join(' ')}
              aria-label="Generate"
              aria-disabled={disabled}
              onClick={submit}
            >
              <Icon name="arrow_forward" size={20} />
            </button>
          </div>
        </div>
      </div>
      {pickerOpen && (
        <AssetPickerModal
          caps={caps}
          projectId={projectId}
          onClose={() => setPickerOpen(false)}
          onAdd={(mediaId) => {
            onReference(mediaId)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
