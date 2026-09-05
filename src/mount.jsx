import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FlowEditor from './FlowEditor.jsx'

/**
 * Imperative mount for hosts that aren't React apps.
 * Returns an unmount function.
 */
export function mountFlow(element, props) {
  const root = createRoot(element)
  root.render(
    <StrictMode>
      <FlowEditor {...props} />
    </StrictMode>,
  )
  return () => root.unmount()
}
