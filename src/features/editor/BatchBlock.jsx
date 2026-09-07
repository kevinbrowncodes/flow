import { useState } from 'react'
import Icon from '../../components/Icon/Icon.jsx'
import IconButton from '../../components/IconButton/IconButton.jsx'
import { useAdapter } from '../../adapter/useAdapter.js'
import styles from './BatchBlock.module.css'

const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function MediaTile({ item, prompt, showDetails, height }) {
  const adapter = useAdapter()
  const pending = item.status !== 'done'
  const thumb = item.assetKey ? adapter.getMediaUrl(item.assetKey, 'THUMBNAIL') : null
  return (
    <div className={styles.tile} data-testid="tile" style={height ? { '--tile-height': `${height}px` } : undefined}>
      {item.status === 'failed' ? (
        // TODO(RECON-05): Flow's real failure UI was never observed. This is honest, not measured (STORY-307).
        <div className={styles.pending} title={item.error ?? undefined}>
          <span className={styles.pendingIcon}>
            <Icon name="error" />
          </span>
          <span className={styles.pct}>Failed</span>
        </div>
      ) : pending ? (
        <div className={styles.pending}>
          <span className={styles.pendingIcon}>
            <Icon name="image" />
          </span>
          {/* Backends without progress (e.g. LTX) show the skeleton alone. */}
          {item.progress != null && <span className={styles.pct}>{item.progress}%</span>}
        </div>
      ) : (
        <>
          {/* Poster is a separate <img>; the <video> mounts on demand (RECON-02).
              Hover playback is UNKNOWN pending the manual check (STORY-301). */}
          <img className={styles.poster} src={thumb} alt={prompt} />
          {item.type === 'video' && (
            <button type="button" className={styles.play} aria-label="Play">
              <Icon name="play_arrow" size={20} filled />
            </button>
          )}
          {showDetails && <span className={styles.caption}>{prompt}</span>}
          <div className={styles.hoverBar}>
            <a className={styles.hoverBtn} aria-label="Download" href={adapter.getMediaUrl(item.assetKey, 'FULL')} download>
              <Icon name="download" size={16} />
            </a>
            <button type="button" className={styles.hoverBtn} aria-label="Delete">
              <Icon name="delete" size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DetailsColumn({ batch, onDelete }) {
  const adapter = useAdapter()
  const [open, setOpen] = useState(false)
  const isUpload = batch.type === 'upload'
  return (
    <aside className={styles.details}>
      <div className={styles.actions}>
        <IconButton variant="action" icon="download" label="Download" />
        {/* Uploads show only download + delete — no undo (RECON-04 §6) */}
        {!isUpload && <IconButton variant="action" icon="undo" label="Re-run" />}
        <IconButton variant="action" icon="delete" label="Delete" onClick={onDelete} />
      </div>
      <div className={styles.promptWrap}>
        <p className={[styles.prompt, open ? styles.promptOpen : ''].filter(Boolean).join(' ')}>{batch.prompt}</p>
        <div className={styles.promptControls}>
          {!isUpload && <IconButton variant="action" icon="redo" label="Reuse text prompt" iconSize={16} />}
          <IconButton
            variant="action"
            icon={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            label="Expand prompt"
            iconSize={16}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
      {!isUpload && <IconButton variant="action" icon="add" label="Add" />}
      {batch.referenceKey && (
        <img className={styles.refThumb} src={adapter.getMediaUrl(batch.referenceKey, 'THUMBNAIL')} alt="Reference" />
      )}
      {batch.runId && (batch.runStep || batch.runError) && (
        <div className={styles.meta} data-testid="run-status">
          {batch.runStep && <span className={styles.metaLine}>{batch.runStep}</span>}
          {batch.runError && batch.runState !== 'done' && <span className={styles.metaLine}>{batch.runError}</span>}
          {batch.runState && !['done', 'failed'].includes(batch.runState) && (
            <span className={styles.metaLine}>Removing this batch does not stop the render.</span>
          )}
        </div>
      )}
      <div className={styles.meta}>
        <span className={styles.metaLine}>Created {batch.createdAt}</span>
        {batch.model && <span className={styles.metaLine}>{batch.model}</span>}
        {batch.aspect && (
          <span className={styles.metaLine}>
            <Icon name="crop_16_9" size={14} />
            {batch.aspect}
          </span>
        )}
        {batch.duration != null && <span className={styles.metaLine}>Video length: {batch.duration}s</span>}
        {/* Resolution fills in only on completion (RECON-04 §8) */}
        {batch.resolution && <span className={styles.metaLine}>Resolution: {batch.resolution}</span>}
      </div>
    </aside>
  )
}

export default function BatchBlock({ batch, showDetails, onDelete }) {
  return (
    <section className={styles.batch}>
      <div className={styles.tiles}>
        {chunk(batch.items, 2).map((row, i) => (
          <div className={styles.row} data-testid="batch-row" key={i}>
            {row.map((item) => (
              <MediaTile key={item.id} item={item} prompt={batch.prompt} showDetails={showDetails} />
            ))}
          </div>
        ))}
      </div>
      <DetailsColumn batch={batch} onDelete={onDelete} />
    </section>
  )
}
