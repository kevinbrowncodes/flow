import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon/Icon.jsx'
import IconButton from '../../components/IconButton/IconButton.jsx'
import Chip from '../../components/Chip/Chip.jsx'
import { Popover } from '../../components/Popover/Popover.jsx'
import OutputSettingsPopover from './OutputSettingsPopover.jsx'
import AssetPickerModal from './AssetPickerModal.jsx'
import InstructionPicker from '../agent/InstructionPicker.jsx'
import AgentSettings from '../agent/AgentSettings.jsx'
import { useAdapter } from '../../adapter/useAdapter.js'
import { findMode, fieldByRole, valueByRole, shapeForSeed } from '../../adapter/contract.js'
import styles from './Composer.module.css'

export default function Composer({
  caps, projectId, output, onOutput, onMode, reference, onReference, onGenerate, clearOnSubmit, notice,
  agent = null, onAgentToggle, onAgentSet, onAgentInstruction, onAgentRun, onAgentExpand,
}) {
  const adapter = useAdapter()
  const [text, setText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [agentMenu, setAgentMenu] = useState(null) // 'instructions' | 'settings'
  const inputRef = useRef(null)

  const mode = findMode(caps, output.mode)
  const values = output.values[mode.key] ?? {}
  const empty = text.trim().length === 0
  // Agent mode (STORY-602): the skill is the prompt, so text is not required — a seed and a skill are.
  // A run always needs a seed (the planner reads it), whatever the backend says about plain generates.
  const agentOn = Boolean(caps.agent && agent?.on)
  const needsReference = agentOn ? !reference : caps.reference === 'required' && !reference
  const needsSkill = agentOn && !agent.instruction
  const disabled = agentOn ? needsReference || needsSkill : empty || needsReference

  // STORY-608: the reference thumbnail keeps the source's aspect, so its natural size tells us
  // the seed's shape without a protocol change. Only used when the backend says it reshapes.
  // The measurement is keyed by the reference it came from, so a stale one is simply ignored
  // rather than cleared with a synchronous setState (which the React Compiler lint flags).
  const [seed, setSeed] = useState(null) // { ref, dims } | null
  useEffect(() => {
    if (!reference || !caps.agent?.shapeFromSeed) return undefined
    const url = adapter.getMediaUrl(reference, 'THUMBNAIL')
    if (!url || typeof Image === 'undefined') return undefined
    let live = true
    const img = new Image()
    img.onload = () => {
      if (live && img.naturalWidth > 0 && img.naturalHeight > 0) setSeed({ ref: reference, dims: [img.naturalWidth, img.naturalHeight] })
    }
    img.src = url
    return () => {
      live = false
    }
  }, [reference, adapter, caps.agent?.shapeFromSeed])
  const seedDims = seed && seed.ref === reference ? seed.dims : null
  const shape = agentOn && reference ? shapeForSeed(caps, agent, seedDims) : null

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
    if (agentOn) {
      await onAgentRun()
      return
    }
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
        <div className={styles.composer} data-testid="composer" data-agent={agentOn ? 'on' : 'off'}>
          {agentOn && (
            <IconButton className={styles.expand} icon="open_in_full" label="Expand" iconSize={18} onClick={onAgentExpand} />
          )}
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
            {/* The Agent pill: live when the backend declares capabilities.agent (STORY-602), inert otherwise (D6). */}
            {caps.surfaces.agent && (
              <Chip
                on={agentOn}
                aria-pressed={agentOn ? 'true' : 'false'}
                style={caps.agent ? undefined : { cursor: 'default' }}
                onClick={caps.agent ? onAgentToggle : undefined}
              >
                Agent
              </Chip>
            )}
            {agentOn && (
              <>
                <Popover
                  open={agentMenu === 'instructions'}
                  onClose={() => setAgentMenu(null)}
                  place="up"
                  trigger={<IconButton icon="description" label="Agent instructions" iconSize={20} onClick={() => setAgentMenu(agentMenu === 'instructions' ? null : 'instructions')} />}
                >
                  <InstructionPicker
                    selected={agent.instruction}
                    onSelect={(i) => {
                      onAgentInstruction(i)
                      setAgentMenu(null)
                    }}
                  />
                </Popover>
                <Popover
                  open={agentMenu === 'settings'}
                  onClose={() => setAgentMenu(null)}
                  place="up"
                  trigger={<IconButton icon="tune" label="Agent settings" iconSize={20} onClick={() => setAgentMenu(agentMenu === 'settings' ? null : 'settings')} />}
                >
                  <AgentSettings caps={caps} agent={agent} onSet={onAgentSet} onClose={() => setAgentMenu(null)} />
                </Popover>
              </>
            )}
            {reference && (
              <button type="button" className={styles.refButton} aria-label="Remove reference" onClick={() => onReference(null)}>
                <img className={styles.refChip} src={adapter.getMediaUrl(reference, 'THUMBNAIL')} alt="Reference" />
              </button>
            )}
            {shape && (
              <Chip
                data-testid="agent-size"
                aria-label="Clip size"
                title={shape.changed ? `Shape follows your picture: ${shape.chosen} (asked ${shape.requested})` : `Clip size ${shape.chosen}`}
                style={{ cursor: 'default' }}
              >
                <Icon name="crop_16_9" size={14} />
                {shape.chosen}
              </Chip>
            )}
            {needsReference && <span className={styles.hint}>Add a reference to start</span>}
            {!needsReference && needsSkill && <span className={styles.hint}>Pick a skill to start</span>}
            <span className={styles.grow} />
            {!empty && <IconButton icon="close" label="Clear prompt" iconSize={20} onClick={clear} />}
            {/* The model chip disappears while the agent is on (RECON-04 §7, RECON-10 §1). */}
            {!agentOn && (
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
            )}
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
