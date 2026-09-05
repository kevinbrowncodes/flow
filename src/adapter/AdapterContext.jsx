import { AdapterContext } from './useAdapter.js'

export function AdapterProvider({ adapter, children }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
}
