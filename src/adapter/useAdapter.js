import { createContext, useContext } from 'react'

export const AdapterContext = createContext(null)

/** @returns {import('./contract.js').Adapter} */
export function useAdapter() {
  const adapter = useContext(AdapterContext)
  if (!adapter) throw new Error('useAdapter: render inside <FlowEditor adapter={…}> or <AdapterProvider>')
  return adapter
}
