import { useMemo } from 'react'
import FlowEditor from './FlowEditor.jsx'
import { resolveConfig, createAdapterFromConfig } from './config.js'

/** The app entry: dev server and the standalone release bundle. */
export default function App() {
  const config = useMemo(() => resolveConfig(), [])
  const adapter = useMemo(() => createAdapterFromConfig(config), [config])
  return <FlowEditor adapter={adapter} router={config.router} basename={config.basename} kitchenSink={import.meta.env.DEV} />
}
