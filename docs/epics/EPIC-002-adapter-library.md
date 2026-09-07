# EPIC-002 — Flow as a library: one seam, many backends

| | |
|---|---|
| **Status** | 🟢 Built 2026-09-05 — contract, mock + HTTP adapters, schema-driven UI, `flow-protocol` Python package, library + standalone builds, release workflow. Conformance 11/11, unit 23/23, protocol 10/10, gateway e2e green. **Not yet done:** wiring into spark-cosmos3 / spark-ltx2 on the Spark, first tagged release |
| **Owner** | Kevin Brown |
| **Created** | 2026-09-05 |
| **Predecessor** | EPIC-001 — pixel-exact Flow editor on mock data |
| **Repo** | `kevinbrowncodes/flow` |

---

## 1. Goal

Make the EPIC-001 editor consumable by every local-model repo (spark-cosmos3,
spark-ltx2, the coming MiniMax and WAN stacks) such that:

1. **flow can change freely** — components, CSS, fixtures, recon fidelity work — without any of those repos noticing.
2. **each repo updates on its own schedule** by bumping one pinned version, and a mechanical check says whether the bump is safe.
3. **each repo takes or leaves surfaces** (characters, scenes, agent, credits, progress %) without forking the UI.

## 2. Decision — library, not framework; HTTP, not JavaScript

Kevin, 2026-09-05: *"I'd like an approach where I can update this and they can update as well without breaking anything on their end."*

Source-level modification downstream and painless upstream updates are mutually
exclusive. We chose: **no downstream source edits, ever.** Customisation happens
only through the contract. If a repo needs a UI change, it lands in flow behind
a capability flag and everyone gets it.

The seam is **HTTP**, implemented **server-side in Python**, because every
consumer is a FastAPI/Docker stack on the DGX Spark. A JS adapter would have
forced a Node toolchain and an untyped file into each of them; a `/flow/*`
router is their native language and pytest-able.

| # | Decision | Value |
|---|---|---|
| D10 | Distribution | **npm package** (`@kevinbrowncodes/flow`, GitHub Packages) for React hosts **and** a **standalone bundle** (`flow-ui-<tag>.tar.gz`, GitHub Release) for Python hosts. Same tag versions both plus `flow-protocol`. |
| D11 | Seam | The `Adapter` shape in `src/adapter/contract.js`. Two implementations ship: mock (`src/data/`) and HTTP (`src/adapter/http.js`). Components only ever see an adapter. |
| D12 | Wire contract | **Flow Gateway Protocol v1** — `protocol/PROTOCOL.md`. Integer major in `capabilities.protocol`; additive-only within a major; UI refuses a mismatched major on screen. |
| D13 | Backend self-description | `GET /flow/capabilities` declares modes, a **settings schema** (fields with type/options/default/role), reference rules, progress support, strings and surfaces. The output-settings popover renders from it; Google's matrix is now just the mock's schema. |
| D14 | Persistence | Projects and batches live **client-side** (localStorage, per gateway origin). Gateways stay stateless apart from jobs and files. Pluggable store; a `/flow/batches` endpoint is a future additive change. |
| D15 | Standalone routing | Hash router + relative asset base, so a gateway mounts `dist/` at any sub-path with no catch-all. Dev server and the conformance suite keep Flow's real `/project/{uuid}` URLs (browser router, `build:mock`). |
| D16 | Python delivery | `flow-protocol` lives **in this repo** (`protocol/python/`), installed from the git tag. Ships pydantic models, `FlowGateway` ABC + `build_router`, a directory `MediaStore`, ffmpeg poster thumbnails, reference gateways (fake / cosmos3 / ltx2) and the `flow-conformance` CLI. |
| D17 | Progress | Optional. LTX reports state only → `progress: "none"` → the pending tile shows the skeleton without a number. Cosmos → `percent`. |
| D18 | Reference assets | `reference: none \| optional \| required`. Both Spark stacks are I2V-first → `required`; send stays disabled until an asset is attached. |

## 3. What changed in flow

| Area | Before | After |
|---|---|---|
| `src/data/index.js` | mock functions imported directly by components | `createMockAdapter()` — same contract as HTTP |
| `src/features/editor/editorState.js` | owned the 22 s fake ticker | subscribes to `adapter.watch()`; ticker moved into the mock; resumes pending batches after reload |
| `OutputSettingsPopover` | hardcoded Google matrix + credit cost | renders `capabilities.modes[*].fields`; cost line only when `credits` |
| `Composer` | 🍌 chip, Agent pill, always-on `+` | all driven by capabilities (`mode.icon`, `surfaces.agent`, `reference`); required-reference gating; gateway rejections shown as a notice |
| `AssetPickerModal` | read fixtures | `adapter.listMedia()` / `uploadMedia()`; real file upload |
| `BatchBlock` | `progress%` always | no-number skeleton when progress is null; honest **Failed** tile (TODO(RECON-05) stays) |
| `Rail` | Characters/Scenes/Tools/Trash always | only where `surfaces` claims them |
| `App.jsx` | fixtures + routes | `FlowEditor` (library component) + `config.js` (runtime resolution) |
| build | one app build | `build` (standalone, `./` base, hash) · `build:mock` (conformance) · `build:lib` (`dist/lib/flow.js` + `flow.css`) |
| tests | Playwright conformance | + `node --test` unit (contract, HTTP adapter against an in-memory gateway, mock) · + `conform:gateway` e2e (release bundle behind the Python fake) · + pytest for the protocol package |

The EPIC-001 conformance suite is untouched and green — the pixel work is preserved under the mock adapter.

## 4. How a model repo adopts it

```
# 1. Python side — subclass, ~60 lines (see protocol/python/flow_protocol/examples/)
pip install "flow-protocol[server] @ git+https://github.com/kevinbrowncodes/flow@v0.1.0#subdirectory=protocol/python"
app.include_router(build_router(Cosmos3Gateway(...)))
mount_ui(app, "/app/flow-ui")

# 2. Dockerfile — pin the UI
ARG FLOW_VERSION=v0.1.0
ADD https://github.com/kevinbrowncodes/flow/releases/download/${FLOW_VERSION}/flow-ui-${FLOW_VERSION}.tar.gz /tmp/flow-ui.tgz
RUN mkdir -p /app/flow-ui && tar -xzf /tmp/flow-ui.tgz -C /app/flow-ui

# 3. Before every bump
flow-conformance http://localhost:8002 --generate --reference still.png
```

Nothing else in the repo changes. There is no Node anywhere in it.

## 5. Update model

| Change in flow | Version | Consumer action |
|---|---|---|
| CSS / component / fixture / recon work | patch or minor | none; bump whenever |
| New optional capability or job field | minor (protocol stays 1) | none; the UI ignores what the gateway doesn't send |
| Removed or renamed wire field | **major + protocol 2** | update the router (pydantic tells you what), re-run conformance |

## 6. Stories

| Story | Title | Status |
|---|---|---|
| STORY-501 | `Adapter` contract + `assertCapabilities` + batch helpers | ✅ `src/adapter/contract.js`, unit-tested |
| STORY-502 | Mock adapter owns the fake engine; editor subscribes via `watch()` | ✅ |
| STORY-503 | Schema-driven output settings; capabilities-driven chrome (chip, rail, footer, agent, reference gating) | ✅ |
| STORY-504 | HTTP adapter + client-side batch store | ✅ localStorage, 12 unit tests against an in-memory gateway |
| STORY-505 | `FlowEditor` component, `mountFlow`, library build, standalone entry + runtime config | ✅ |
| STORY-506 | Flow Gateway Protocol v1 doc | ✅ `protocol/PROTOCOL.md` |
| STORY-507 | `flow-protocol` Python package: models, router, MediaStore, thumbs, conformance CLI, fake gateway, tests | ✅ 10 tests |
| STORY-508 | Reference gateways for spark-cosmos3 and spark-ltx2 | ✅ written from their docs; **untested against the Spark** |
| STORY-509 | Release workflow: tag → lint/test/build → GitHub Release tarball + npm publish | ✅ `.github/workflows/release.yml`, inert until pushed |
| STORY-510 | End-to-end: release bundle behind the fake gateway, Playwright | ✅ `npm run conform:gateway` |
| STORY-511 | Wire `Cosmos3Gateway` into spark-cosmos3, pin `v0.1.0`, run `--generate` conformance on the box | ✅ spark-cosmos3 STORY_023–025 (2026-09-06); the `--generate` render is held on that box's memory gate |
| STORY-512 | Same for spark-ltx2 (uploads must land in ComfyUI's input volume) | 📋 |
| STORY-513 | Subset Material Symbols (STORY-405) — `flow.css` is 5.4 MB because lib mode inlines the font | 📋 |
| STORY-514 | Optional `/flow/batches` so history follows the box, not the browser | 📋 backlog |
| STORY-515 | Cosmos V2V: `reference_kinds: ["image","video"]` + `condition_seconds` field | ✅ spark-cosmos3 STORY_026 (2026-09-06) — done in the backend's forked gateway, not the example |

## 7. Risks and open points

| Risk | Note |
|---|---|
| cosmos3/ltx2 reference gateways were written from their READMEs and `docs/responses.md`, not run | STORY-511/512 will surface field-name drift; `flow-conformance --generate` is the check |
| Cosmos output is fetched lazily from `/jobs/{id}/content` on first media access | if the engine forgets the job before the UI fetches, the tile 404s — copy on completion inside `job()` if that bites |
| localStorage history is per browser | acceptable for a single-user box; STORY-514 otherwise |
| `flow.css` 5.4 MB | font inlining in lib mode; the standalone bundle is unaffected (font is a separate asset) |
| Repo has **no commits yet** | everything, EPIC-001 included, is untracked — commit before tagging |
