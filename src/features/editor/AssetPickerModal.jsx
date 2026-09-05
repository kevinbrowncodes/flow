import { useEffect, useRef, useState } from 'react'
import SearchField from '../../components/SearchField/SearchField.jsx'
import { useAdapter } from '../../adapter/useAdapter.js'
import styles from './AssetPickerModal.module.css'

const KIND_LABEL = { image: 'Image', video: 'Video' }

function tabsFor(caps) {
  // Tabs verbatim (RECON-04 §7). Voices/Characters/Avatar only where the backend claims them (D6).
  return ['All', 'Images', 'Videos', ...(caps.surfaces.characters ? ['Voices', 'Characters', 'Avatar'] : []), 'Uploads']
}

function inTab(asset, tab) {
  switch (tab) {
    case 'All':
      return true
    case 'Images':
      return asset.kind === 'image' && asset.source !== 'upload'
    case 'Videos':
      return asset.kind === 'video' && asset.source !== 'upload'
    case 'Uploads':
      return asset.source === 'upload'
    default:
      return false // Voices / Characters / Avatar: rendered, empty (D6)
  }
}

export default function AssetPickerModal({ caps, projectId, onClose, onAdd }) {
  const adapter = useAdapter()
  const [tab, setTab] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [assets, setAssets] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let live = true
    adapter
      .listMedia(projectId)
      .then((list) => live && setAssets(list))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [adapter, projectId])

  const allowed = new Set(caps.reference_kinds)
  const rows = (assets ?? []).filter(
    (a) => allowed.has(a.kind) && inTab(a, tab) && a.name.toLowerCase().includes(query.toLowerCase()),
  )
  const accept = caps.reference_kinds.map((k) => `${k}/*`).join(',')

  const upload = async (file) => {
    if (!file) return
    try {
      const asset = await adapter.uploadMedia(projectId, file)
      setAssets((prev) => [asset, ...(prev ?? [])])
      setSelected(asset.id)
      setTab('Uploads')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-label="Add to Prompt">
        <div className={styles.head}>
          <SearchField value={query} onChange={setQuery} label="Search assets" />
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 500, color: 'var(--text-label)' }}>
            Recent ▾
          </span>
        </div>
        <div className={styles.body}>
          <div className={styles.tabs}>
            {tabsFor(caps).map((t) => (
              <button
                key={t}
                type="button"
                className={[styles.tab, tab === t ? styles.tabOn : ''].filter(Boolean).join(' ')}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            {error && <span className={styles.previewEmpty}>{error}</span>}
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={[styles.rowItem, selected === r.id ? styles.rowOn : ''].filter(Boolean).join(' ')}
                onClick={() => setSelected(r.id)}
              >
                <img className={styles.rowThumb} src={adapter.getMediaUrl(r.id, 'THUMBNAIL')} alt="" />
                {r.name}
                <span className={styles.rowType}>{KIND_LABEL[r.kind] ?? r.kind}</span>
              </button>
            ))}
          </div>
          <div className={styles.preview}>
            {selected ? (
              <img src={adapter.getMediaUrl(selected, 'THUMBNAIL')} alt="Preview" />
            ) : (
              <span className={styles.previewEmpty}>Select an asset</span>
            )}
          </div>
        </div>
        <div className={styles.foot}>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            hidden
            onChange={(e) => {
              upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
            Upload media
          </button>
          <button type="button" className={styles.addBtn} disabled={!selected} onClick={() => onAdd(selected)}>
            Add to Prompt
          </button>
        </div>
      </div>
    </div>
  )
}
