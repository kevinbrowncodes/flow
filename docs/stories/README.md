# Stories — EPIC-001

| Story | Title | Status |
|---|---|---|
| **Phase 1 — Foundation** | | |
| [STORY-100](STORY-100-css-modules-setup.md) | CSS Modules scaffolding | ✅ DONE |
| [STORY-101](STORY-101-tokens.md) | `tokens.css` from measured values | ✅ DONE — `src/styles/tokens.css`, swatches at `/kitchen-sink` |
| [STORY-102](STORY-102-router-fixtures.md) | Router + UUID mock fixtures | ✅ DONE — `src/data/` seam, ffmpeg mock clips |
| [STORY-103](STORY-103-primitives.md) | Primitives the MVP page needs | ✅ DONE — Icon, IconButton, Popover/MenuItem, Chip, SearchField, Toggle |
| [STORY-104](STORY-104-conformance.md) | Conformance & regression suite | ✅ DONE — 11 tests green (`npm run conform`) |
| **Phase 2 — MVP page** | | |
| [STORY-201](STORY-201-app-shell.md) | Editor shell & scroll architecture | ✅ DONE |
| [STORY-202](STORY-202-icon-rail.md) | Icon rail, collapsed & expanded | ✅ DONE — label size 14 vs 11 conflict noted in css |
| [STORY-203](STORY-203-top-bar.md) | Editor top bar | ✅ DONE — inline rename with ✓/✗, Enter/Esc |
| [STORY-204](STORY-204-batch-block.md) | Batch block & media tile | ✅ DONE — height-driven tiles, flex-grow 0 |
| [STORY-205](STORY-205-details-column.md) | Per-batch details column | ✅ DONE |
| [STORY-206](STORY-206-composer.md) | Floating composer | ✅ DONE — 460px growth, :focus-within ring, send hover inversion |
| [STORY-207](STORY-207-empty-state.md) | Empty project state | ✅ DONE — reduced rail + verbatim placeholder |
| [STORY-208](STORY-208-projects-home.md) | Projects home (`/`) | ✅ DONE — grid, rename, delete, New project, About |
| **EPIC-003 — Agent mode** | | |
| [STORY-601](STORY-601-agent-protocol-surface.md) | Agent protocol surface (v1.1) | ✅ DONE — models, `FlowAgent`, router, conformance, fake + mock agents, adapter methods |
| **Phase 3 — MVP behavior** | | |
| [STORY-303](STORY-303-output-settings.md) | Output settings popover | ✅ DONE — full matrix, live cost line |
| [STORY-307](STORY-307-generation-lifecycle.md) | Generation lifecycle | ✅ DONE — prepend, skeleton + %, immediate details, delayed clear |
| [STORY-301/302/304/305/306/308](STORY-30x-remaining.md) | Phase 3 remainder | ✅ DONE except 301 hover-playback (blocked on 2-min manual check) |
| **Phase 4 — Polish** | | |
| STORY-401 | Motion pass | ✅ DONE — measured durations baked into every component |
| STORY-402 | Accessibility pass | 🟡 PARTIAL — V5 `:focus-visible` ring + aria labels shipped; full pass blocked on RECON-06 |
| STORY-403 | Font substitution | 🟡 PARTIAL — DM Sans in place; `size-adjust` metric tuning open |
| STORY-404 | Conformance pass & sign-off | ✅ suite green — sign-off is Kevin's |
| STORY-405 | Subset Material Symbols (3.96 MB → ~25 glyphs) | 📋 backlog |

## Rules

- Every value in these stories is **measured**. Do not substitute tidier numbers.
- UNKNOWNs carry explicit TODOs; nothing invented is presented as measured.
- Radii (10/12/15/16/17/18/24) and the asymmetric page padding (16/8) are real. Do not normalise.

Sources: `docs/recon/results/`.

---

# Stories — EPIC-002

Tracked inside [EPIC-002](../epics/EPIC-002-adapter-library.md) §6 (STORY-501 … 515).
