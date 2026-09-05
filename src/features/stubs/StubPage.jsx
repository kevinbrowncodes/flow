import { Link, useParams } from 'react-router'

/** Deferred surfaces (D6) resolve here if visited directly. */
export default function StubPage({ name }) {
  const { projectId } = useParams()
  return (
    <div style={{ display: 'grid', placeContent: 'center', gap: 12, height: '100dvh', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 16 }}>{name}</p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Deferred (D6) — post-MVP</p>
      <Link to={`/project/${projectId ?? ''}`} style={{ fontSize: 12, color: 'var(--text-label)' }}>
        Back to editor
      </Link>
    </div>
  )
}
