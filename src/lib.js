/**
 * @kevinbrowncodes/flow — library entry.
 *
 *   import { FlowEditor, createHttpAdapter } from '@kevinbrowncodes/flow'
 *   import '@kevinbrowncodes/flow/style.css'
 *
 *   <FlowEditor adapter={createHttpAdapter({ baseUrl: 'http://spark:8002' })} router="hash" />
 */
import './styles/index.js'

export { default as FlowEditor } from './FlowEditor.jsx'
export { mountFlow } from './mount.jsx'
export { AdapterProvider } from './adapter/AdapterContext.jsx'
export { useAdapter } from './adapter/useAdapter.js'
export { createHttpAdapter, GatewayError } from './adapter/http.js'
export { createMockAdapter } from './data/index.js'
export { memoryStore, localStorageStore } from './adapter/store.js'
export {
  PROTOCOL_VERSION,
  ContractError,
  assertCapabilities,
  defaultValues,
  describeBatch,
  buildPendingBatch,
  applyPatch,
  isPending,
} from './adapter/contract.js'
