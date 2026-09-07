import { BrowserRouter, HashRouter, MemoryRouter, Routes, Route } from 'react-router'
import { AdapterProvider } from './adapter/AdapterContext.jsx'
import EditorPage from './features/editor/EditorPage.jsx'
import HomePage from './features/home/HomePage.jsx'
import KitchenSink from './features/kitchen/KitchenSink.jsx'
import StubPage from './features/stubs/StubPage.jsx'

const ROUTERS = { browser: BrowserRouter, hash: HashRouter, memory: MemoryRouter }

/**
 * The whole editor as one component. Hand it an adapter and it runs.
 *
 * @param {Object} props
 * @param {import('./adapter/contract.js').Adapter} props.adapter
 * @param {'browser'|'hash'|'memory'} [props.router='browser']   'hash' needs no server fallback
 * @param {string} [props.basename='']                          when served under a sub-path
 * @param {boolean} [props.kitchenSink=false]                   expose /kitchen-sink (dev only)
 */
export default function FlowEditor({ adapter, router = 'browser', basename = '', kitchenSink = false }) {
  const Router = ROUTERS[router] ?? BrowserRouter
  return (
    <AdapterProvider adapter={adapter}>
      <Router basename={basename || undefined}>
        <Routes>
          {/* STORY-208: `/` is the project gallery. It used to resolve a
              default project id and redirect straight into the editor. */}
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:projectId" element={<EditorPage />} />
          {/* Deferred surfaces (D6) — routes exist, pages are stubs */}
          <Route path="/project/:projectId/characters" element={<StubPage name="Characters" />} />
          <Route path="/project/:projectId/tools" element={<StubPage name="Tools" />} />
          <Route path="/project/:projectId/trash" element={<StubPage name="Trash" />} />
          <Route path="/project/:projectId/edit/:mediaId" element={<StubPage name="Media editor" />} />
          {kitchenSink && <Route path="/kitchen-sink" element={<KitchenSink />} />}
        </Routes>
      </Router>
    </AdapterProvider>
  )
}
