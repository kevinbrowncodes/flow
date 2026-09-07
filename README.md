# flow

A pixel-exact rebuild of Google Flow's project editor, turned into a **library
with one seam** so local video/image models can host it.

- **EPIC-001** built the editor against measured recon values, on mock data. Still green: `npm run conform`.
- **EPIC-002** made it consumable: an `Adapter` contract, an HTTP adapter speaking the
  [Flow Gateway Protocol](protocol/PROTOCOL.md), and a Python package a backend
  implements in ~60 lines.

```
model repo (Python)                          flow (this repo)
─────────────────────────────                ────────────────────────────────
class MyGateway(FlowGateway) ──/flow/*──▶   createHttpAdapter()  ──▶  <FlowEditor/>
mount_ui(app, "flow-ui/")     ◀─ static ──   dist/  (release tarball, pinned by tag)
```

## Run it

```bash
npm install
npm run dev                 # mock adapter, Flow's real URLs, http://localhost:5173
npm run dev -- --open '/?gateway=http://spark:8002'   # same UI against a real gateway
```

Runtime switches for any build: `?adapter=mock`, `?gateway=URL`, or
`window.FLOW_CONFIG = { adapter, gateway, router, basename }`.

## Use it

**From a Python backend** (the intended path — see [`protocol/python/README.md`](protocol/python/README.md)):

```bash
pip install "flow-protocol[server] @ git+https://github.com/kevinbrowncodes/flow@v0.1.0#subdirectory=protocol/python"
```

```python
from flow_protocol.router import build_router, mount_ui
app.include_router(build_router(MyGateway()))
mount_ui(app, "/app/flow-ui")      # the release tarball, unpacked
```

**From a React app:**

```bash
npm install @kevinbrowncodes/flow      # GitHub Packages
```

```jsx
import { FlowEditor, createHttpAdapter } from '@kevinbrowncodes/flow'
import '@kevinbrowncodes/flow/style.css'

<FlowEditor adapter={createHttpAdapter({ baseUrl: 'http://spark:8002' })} router="hash" />
```

**Try it without a GPU:**

```bash
pip install -e "protocol/python[dev]"
npm run build && (cd protocol/python && flow-fake-gateway --ui ../../dist)
open http://localhost:8765/ui/
```

## Verify

| Command | What it proves |
|---|---|
| `npm run lint` | oxlint clean |
| `npm test` | contract, HTTP adapter (against an in-memory gateway), mock adapter |
| `npm run conform` | EPIC-001 pixel conformance against measured recon values, on the mock |
| `npm run conform:gateway` | the **release bundle** behind the Python fake gateway, end to end |
| `cd protocol/python && pytest` | protocol router + full conformance run against the fake |
| `flow-conformance http://host:port [--generate]` | a real gateway, before bumping its pinned UI |

## Release

Tag `vX.Y.Z` on `main`. The workflow lints, tests, builds, attaches
`flow-ui-vX.Y.Z.tar.gz` to a GitHub Release and publishes the npm package.
Consumers pin that tag for both the tarball and `flow-protocol`.

## Layout

```
src/adapter/      contract.js (the seam) · http.js · store.js · useAdapter.js
src/data/         the mock adapter: fixtures + Google's settings matrix as a capabilities doc
src/features/     editor UI — reads only the adapter
src/FlowEditor.jsx  the library component · src/lib.js  package entry · src/config.js  runtime resolution
protocol/         PROTOCOL.md · python/ (flow-protocol package, reference gateways, conformance CLI)
docs/             epics, stories, recon — EPIC-001 is the spec; EPIC-002 is this refactor
tests/            conformance.spec.js (pixels) · gateway.spec.js (e2e) · unit/ (node --test)
```

## Agent mode (v1.1, additive)

A backend that declares `capabilities.agent` gets a live Agent pill: pick one of
its **instructions** (skills), a clip count, attach a seed, press → — the
backend writes every clip's script, the panel shows them for **review**
(edit, rewrite one, approve), and the run renders clip by clip as a batch of
tiles in the grid. One-shot, not conversational: see `protocol/PROTOCOL.md`
§Agent mode and `docs/epics/EPIC-003-agent-mode.md`. The mock adapter and
`flow-fake-gateway` implement it without a GPU.
