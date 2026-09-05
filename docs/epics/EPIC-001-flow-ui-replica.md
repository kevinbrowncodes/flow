# EPIC-001 — Google Flow UI Replica

| | |
|---|---|
| **Status** | 🟢 MVP built — 2026-08-22. Conformance suite green (11/11). Remaining: STORY-301 manual check, RECON-06 a11y pass, V5 sign-off, STORY-403 tuning, STORY-405 |
| **Owner** | Kevin Brown |
| **Created** | 2026-08-21 |
| **Repo** | `kevinbrowncodes/flow` (React 19 + Vite) |
| **Successor epic** | EPIC-002 — Local model backend integration (not started) |

---

## 1. Goal

Rebuild the Google Flow web application UI (`labs.google/fx/tools/flow`) as a self-hosted React app
that is **pixel-exact** against the original, running entirely on mock data.

Fidelity bar (decided 2026-08-21): pixel-exact clone. We match Flow's measured type ramp,
spacing, color and motion values rather than normalising them to a scale of our own. Every
deviation is deliberate and recorded in §12.

**How it's verified:** by asserting our computed styles against the measured recon values, not by
diffing screenshots. The recon *is* the specification — a wrong tile radius should report
`expected 17px, got 16px`, not "3.1% of pixels differ".

This epic ends when the clone **is visually indistinguishable from Flow** at the reviewed
viewports. It does not generate video.

## 2. Why

Flow's UI is the target interaction model for a local video-generation stack (Veo-class
prompt composer, ingredient/reference management, scene timeline). Building the shell first
means the later model integration is a data-layer swap rather than a product design exercise.

## 2b. Guiding Principle — build what local models can actually do

Kevin's point, 2026-08-21: *local video generation models don't have the capability of characters
and such.*

This reorders the whole epic. Flow is built on a hosted stack with capabilities our target
backend does not have — reusable characters, a community tool marketplace, avatar capture from
facial video. Cloning those surfaces produces UI that can never be wired to anything.

**Rule:** a surface earns P0 only if a local model stack can plausibly drive it.

| Maps to local capability | Does not |
|---|---|
| text→video, image→video, prompt + reference assets | reusable character identity |
| aspect ratio, output count, seed, duration | community tool marketplace |
| media library, filters, versions, trash | avatar / facial capture |
| extend / continue a clip, upscale | conversational agent mode |

Anything in the right column is deferred (D6) rather than built and left dangling.

## 2c. The MVP — one page

Kevin, 2026-08-21: *this is what I really want, other stuff we can discuss at the end.*

**MVP = the project editor at `/project/{uuid}`.**

> **Corrected by RECON-04.** There is no fixed right-hand details panel. The editor is a fixed
> rail, **one** scroll container, and a pinned composer. Inside the scroller are stacked **batch
> blocks** — each block is *its own tiles + its own 400px details column*, scrolling together.
> The unit of composition is the **batch**, not the grid.

| Region | Measured |
|---|---|
| Icon rail | Fixed, **64px collapsed / 228px expanded**. Active pill `tint/0.25`, radius 16px. **Items are dynamic** — Images/Videos/Uploads appear only when such media exists |
| Scroll container | x=228, **1212px** wide — the only scroller on the page |
| Batch block | tiles area **772px** + 16px gap + details column **400px** |
| Media tile | **358×201** (16:9), radius 17px, gap 16px, play button 32×32 inset 10px |
| Composer | **600×94**, pinned `bottom: 32px`, `blur(80px)`, radius 24px |
| Fixed on scroll | top bar (76px), composer, footer |

Ship that page, faithfully, with mock data. Home page, media editor, and everything deferred by
D6 come after — we discuss them at the end of the epic, not now.

This reorders the phases: the shell we build is only the shell **this page needs**.

## 3. Definition of Done

- [ ] Every **P0 surface** (§5) renders at 1440×900 and is navigable end to end. Desktop only (D4).
- [ ] All design tokens live in **one** source of truth, derived from measured values — not eyeballed.
- [ ] Every interactive control has hover / focus-visible / active / disabled / loading states.
- [ ] Empty, loading, error and in-progress states exist for every async surface.
- [ ] 100% mock data. No network calls to Google. No Google-owned image, font-file, icon or
      logo asset checked into the repo — shapes are re-drawn, wordmark is replaced with ours.
- [ ] **Conformance:** every measured value in `docs/recon/results/` is asserted against our
      rendered output via computed styles (STORY-104). Pixel-exactness is verified as *numbers*,
      not as a diff percentage — a wrong radius reports `expected 17px, got 16px`.
- [ ] **Regression:** our own output is baselined and diffed against itself to catch drift the
      numbers can't see (stacking, overflow, misplacement).
- [ ] **Human review** against `OBS-02` at each phase gate.
- [ ] Every deviation from the original is listed in §12 with a reason — nothing drifts silently.
- [ ] `npm run build` clean, `npm run lint` clean.

## 4. Non-Goals (explicitly out of scope for EPIC-001)

- Real video/image generation, model inference, queues, or GPU orchestration → EPIC-002
- Auth, accounts, billing, credit metering (credit **display** is in scope, as a mock number)
- **Flow TV** and **Flow Music** — the top-bar buttons are rendered for layout fidelity but are
  inert; neither surface is built (D4)
- **Social links** (Discord, Instagram, X) — rendered as icons for layout fidelity, inert (D4)
- **Mobile and responsive layout** — desktop only, ~1440px target. No breakpoint work (D4)
- Marketing/landing pages, legal/ToS pages
- Server-side anything. This is a static SPA until EPIC-002.
- Reproducing Google's proprietary brand assets. Structure and layout only.

## 5. Surface Inventory — locked by `RECON-01` (2026-08-21)

My pre-recon guess was wrong in structure, not just detail. Flow is **not** a prompt bar over a
scene timeline. It is a **media-library workspace**: a left sidebar of asset filters, a media
grid, a right details panel, and a prompt bar — with a *separate* full-page media editor for
refining one clip. Inventory rewritten accordingly.

### Routes

| # | Route | Screen |
|---|---|---|
| R1 | `/fx/tools/flow` | Home / project gallery |
| R2 | `/fx/tools/flow/project/{projectId}` | Project editor — All Media (filters are client-side, same URL) |
| R3 | `/fx/tools/flow/project/{projectId}/characters` | Characters |
| R4 | `/fx/tools/flow/project/{projectId}/tools` | Explore Tools (3 tabs) |
| R5 | `/fx/tools/flow/project/{projectId}/edit/{mediaId}` | Media editor / detail |
| R6 | `/fx/tools/flow/project/{projectId}/trash` | Trash |

### Surfaces

**Global chrome**

| ID | Surface | Pri | Notes |
|----|---------|-----|-------|
| G1 | Home header | P0 | Wordmark · Flow Music · Flow TV · Discord · Instagram · X · Help · ⋮ · ULTRA · avatar. Last four live; the rest inert per D4 |
| G2 | Editor top bar | P0 | back · project name +⋮ · search · filter · + · help · gear · ⋮ · ULTRA · avatar |
| G3 | Editor left sidebar + collapsed rail | P0 | All Media · Images · Videos · Characters · Scenes · Uploads · Tools / Trash · Collapse |
| G4 | Daily-bonus banner | P1 | Dismissible; needs a dismissed state |
| G5 | Help popover | P1 | Skeleton → 5 article links + search + Send feedback |
| G6 | Account / membership popover | P1 | Credits, upgrade, avatar, watermarking toggle, sign out, build string |
| G7 | Header overflow ⋮ menu | P1 | Includes a "Help improve Flow" toggle and "Delete all projects" |

**Home (R1)**

| ID | Surface | Pri | Notes |
|----|---------|-----|-------|
| H1 | Project gallery grid | P0 | Cards captioned by timestamp; hover reveals rename + delete icons; thumbnail animates dark→lit |
| H2 | Gallery skeleton loading | P0 | Observed — real skeleton, not a spinner |
| H3 | New-project floating pill | P0 | Centered near viewport bottom |
| H4 | Promo carousel | P1 | ≥6 rotating slides, dot pager, per-slide CTA, dismissible |

**Project editor (R2) — the core**

| ID | Surface | Pri | Notes |
|----|---------|-----|-------|
| E1 | Batch blocks + rail filters | P0 | Batch = one generation, typically 4 tiles (2×2). Rail items appear conditionally |
| E2 | **Per-batch details column** | P0 | Not a fixed panel — one 400px column per batch, inside the scroll flow (RECON-04) |
| E3 | Prompt bar | P0 | |
| E4 | Output settings popover | P0 | Image/Video tabs · AR 16:9, 4:3, 1:1, 3:4, 9:16 · model · count ×1–×4 · **live credit cost** |
| E5 | Asset picker "Add to Prompt" | P0 | All / Images / Videos / Voices / Characters / Avatar / Uploads + upload |
| E6 | Generation lifecycle | P0 | ✅ RECON-04 §8: new batch at top, skeleton + **live % counter**, details populate immediately, resolution updates on completion |
| E7 | Empty project state | P0 | "Start creating or drop media", 22px muted, **no illustration**, no details column, reduced rail |
| E8 | View/display settings (gear) | P1 | Grid/Batch · size S/M/L · sound on hover · return silent videos · show tile details · clear prompt on submit |
| E9 | Search + filters popover | P1 | Type/aspect/resolution/created/duration + sort, result count, clear |
| E10 | Add/Create menu (+) | P1 | Upload media · Collection · Character · Scene |
| E11 | Project name menu | P1 | Rename · View Trash · Delete |
| ~~E12~~ | ~~Agent mode~~ | — | **Deferred (D6)** — conversational agent has no local analogue |

**Media editor (R5)**

| ID | Surface | Pri | Notes |
|----|---------|-----|-------|
| M1 | Player + timeline | P0 | Timeline "+" add-clip not yet explored |
| M2 | Version history | P0 | Show/hide toggle |
| M3 | Edit prompt | P0 | |
| M4 | Share dialog | P1 | Copy link + "Include inputs" toggle |
| M5 | Media editor overflow ⋮ | P2 | Mostly external destinations |

**Secondary pages — all deferred by D6**

| ID | Surface | Status | Reason |
|----|---------|--------|--------|
| ~~X1~~ | Characters (R3) | Deferred | Local models can't do reusable character identity |
| ~~X2~~ | Explore Tools (R4) | Deferred | Community marketplace; meaningless single-user |
| ~~X3~~ | Trash (R6) | Deferred | Sidebar + project-menu links render **inert** so nothing dangles |
| ~~X4~~ | Create-avatar modal | Deferred | Experimental, needs facial capture, only partly recon-able |

Sidebar items for deferred pages still **render** — removing them would change the sidebar's
height and item spacing, which under D1 breaks the diff.

### Known recon gaps to close

Video-model list · Collections view · Voices & Avatar picker tabs · Batch view mode · grid sizes
S/L · timeline "+" add-clip · **generation lifecycle states** · populated Trash.

## 6. Architecture

**Existing:** React 19.2, Vite 8, Oxlint, plain CSS. Keep.

**Cleared 2026-08-21:** a from-imagination Flow mockup (`src/App.jsx` / `src/App.css`, plus
`src/assets/`) was removed. It invented a sidebar, credits pill and prompt card that Flow may
not have — under a pixel-exact bar, guessed layout is worse than no layout, since it anchors us
to the wrong thing. `src/App.jsx` is now a placeholder; real UI starts in Phase 1 from measured
values only.

**To add:**

| Concern | Decision | Status |
|---|---|---|
| Styling | **CSS Modules + `tokens.css`** (D2). Flow's styled-components emits per-component CSS variables scoped to hashed selectors; we reproduce the same variable names, values and `:hover` scoping in module files | accepted |
| Routing | `react-router` on Vite, mirroring Flow's paths. Flow uses Next Pages Router, but with no SSR need there's nothing to gain from switching | accepted |
| State | Zustand for editor/session state; mocks as plain modules | proposed |
| Motion | Driven by `RECON-05` measurements — CSS transitions unless springs are observed | 🔍 recon |
| Toasts | **Sonner**, same as Flow (open source) | accepted |
| Verification | Playwright **computed-style conformance** against recon values + self-baseline regression. No Google reference screenshots needed | accepted |
| Icons | **Material Symbols** (Apache-2.0) via ligatures, exactly as Flow does — no hand-drawn sprite needed | accepted |
| Video | `<video preload="none" playsInline>` + separate `<img>` poster, matching RECON-02. Local clips in `public/mock/` | accepted |

**Target structure:**

```
src/
  app/          routes, providers, layout shell
  components/   primitives (Button, Menu, Slider, Tooltip, Dialog…)
  features/
    dashboard/  project grid
    editor/     composer, modes, settings, results canvas
    scene/      timeline, clip cards, transport
    assets/     ingredients library
  data/         mock fixtures + the *only* module the backend swap touches
  styles/       tokens.css (generated from recon), base.css
  lib/          hooks, formatters, keyboard map
```

**The EPIC-002 seam:** every component reads from `src/data/` through async functions that
already return promises and already model `queued | running | done | failed`. Swapping mocks
for a local model server must not touch a single component file.

RECON-02 makes the media half of that seam concrete. Flow resolves media through a single
endpoint — `media.getMediaUrlRedirect?name={uuid}&mediaUrlType=FULL|THUMBNAIL`. We mirror the
shape: one `getMediaUrl(id, type)` function. Mocks return `public/mock/…`; EPIC-002 returns local
model server URLs. The tile component never learns the difference.

## 7. Phases — MVP first

| Phase | Name | Exit criteria |
|---|---|---|
| **0** | **Recon** | ✅ complete for the MVP (01–05) |
| 1 | Foundation | ✅ done 2026-08-22 |
| 2 | **MVP page** | ✅ done 2026-08-22 — conformance green |
| 3 | MVP behavior | ✅ done 2026-08-22 (STORY-301 hover-playback pending the manual check) |
| 4 | MVP polish | 🟡 motion done; a11y partial (V5 ring shipped, RECON-06 pending); sign-off pending Kevin |
| — | *discuss* | Home page, media editor, D6 surfaces — scoped at the end of the epic |
| 5 | *(EPIC-002)* | Local model wiring, swap D7 mock strings |

Phase 1 builds **only** what the MVP page consumes. No kitchen-sink component library ahead of
need — a Dialog we don't render on this page is a Dialog we haven't verified against anything.

## 8. Phase 0 Exit Checklist

Missions renumbered into execution order 2026-08-21. Live tracker: `docs/recon/STATUS.md`.

**Blocks the MVP — must land before stories are written**

- [x] `RECON-01` Site map & surface inventory — done 2026-08-21
- [ ] `RECON-02` Implementation fingerprint — decides the stack (STORY-100)
- [ ] `RECON-03` Design tokens + `capture-tokens.js` dump — measured values (STORY-101)
- [ ] `RECON-04` Project editor, the MVP — the other 15 stories

**Needed before Phase 4, not before Phase 1**

- [ ] `RECON-05` States, motion & micro-interactions
- [ ] `RECON-06` Accessibility

**Post-MVP — for the end-of-epic discussion**

- [ ] `RECON-07` Home header & app shell
- [ ] `RECON-08` Project gallery / home
- [ ] `RECON-09` Media editor & timeline

Supporting captures already filed: `OBS-01` (home screenshot), `OBS-02` (editor screenshot).
Prompts: `docs/recon/PROMPTS.md`.

## 9. Story Map — MVP

**Phase 1 stories are written** and live in `docs/stories/` — every value in them is measured.
Phase 2–4 stay unwritten until RECON-04 lands.

**Phase 1 — Foundation**

| Story | Title | Blocked on |
|---|---|---|
| STORY-100 | CSS Modules scaffolding (D2) | ✅ **written** |
| STORY-101 | `tokens.css` from RECON-03 measured values | ✅ **written** |
| STORY-102 | Router + UUID mock fixtures | ✅ **written** |
| STORY-103 | Primitives the MVP page needs | ✅ **written** |
| STORY-104 | Conformance & regression suite | ✅ **written** |

**Phase 2 — MVP page**

| Story | Title | Blocked on |
|---|---|---|
| STORY-201 | Editor top bar: back, title +⋮, search pill, filter button, right cluster | RECON-04 |
| STORY-202 | Collapsed icon rail + active-state treatment | RECON-04 |
| STORY-203 | Expanded sidebar + collapse/expand toggle | RECON-04 |
| STORY-204 | Media grid: 16:9 tiles, play affordance, batch grouping | RECON-04 |
| STORY-205 | Details panel: actions, prompt + truncation, reference thumb, metadata | RECON-04 |
| STORY-206 | Floating composer: placeholder, `+`, Agent pill, model chip, send | RECON-04 |
| STORY-207 | Footer disclaimer + page scaffolding | — |

**Phase 3 — MVP behavior**

| Story | Title | Blocked on |
|---|---|---|
| STORY-301 | Tile hover + selection, details-panel binding | RECON-04 Q1/Q3 |
| STORY-302 | Sidebar filters (All Media / Images / Videos / Scenes / Uploads) | RECON-04 |
| STORY-303 | Output settings popover: Image/Video tabs, AR, model, count, credit cost | RECON-04 |
| STORY-304 | Asset picker (`+` on composer) | RECON-04 |
| STORY-305 | View/display settings (gear) + Add/Create menu (`+`) + project menu (⋮) | RECON-04 |
| STORY-306 | Search + filters popover | RECON-04 |
| STORY-307 | Generation lifecycle: queued/running/done/failed | RECON-04 Q5 |
| STORY-308 | Empty project state | RECON-04 Q7 |

**Phase 4 — Polish**

| Story | Title |
|---|---|
| STORY-401 | Motion pass |
| STORY-402 | Accessibility pass |
| STORY-403 | Font substitution to clear the diff threshold |
| STORY-404 | Full conformance pass & sign-off |

**Deferred to end-of-epic discussion:** home/project gallery, media editor + timeline, share
dialog, account & help popovers, promo carousel, and everything cut by D6.

## 10. Decisions

**Settled**

| # | Decision | Value | Date |
|---|---|---|---|
| D1 | Fidelity target | **Pixel-exact clone**, verified by computed-style conformance against measured recon values (STORY-104) | 2026-08-21 |
| D2 | Styling stack | **CSS Modules + `tokens.css`** (Vite built-in, zero deps). We port Flow's per-component CSS-variable pattern rather than its authoring tool | 2026-08-21 |
| D3 | Recon access | Kevin's paid, signed-in account with many existing generations | 2026-08-21 |
| D4 | Scope cuts | No mobile/responsive, no Flow TV, no Flow Music, no social links — top-bar items rendered inert for layout fidelity | 2026-08-21 |
| D5 | Route | App lives at `labs.google/fx/tools/flow` (Google Labs FX umbrella) | 2026-08-21 |
| D6 | Secondary pages | **Deferred out of initial release** — Characters, Explore Tools, Agent mode, avatar modal. Trash deferred too; its sidebar/menu links render but stay inert (per D4 treatment) | 2026-08-21 |
| D9 | Icons | **Material Symbols** ligature font, as Flow uses. Apache-2.0, so no substitution needed | 2026-08-21 |
| D8 | **MVP** | The **project editor** (`/project/{uuid}`) is the release target: icon rail + media grid + details panel + floating composer. Everything else is post-MVP | 2026-08-21 |
| D7 | Mock strings | Keep Google's verbatim strings (`Nano Banana 2 ×2`, `7375 credits`) through EPIC-001 so text widths don't pollute the pixel diff. Swapped for real local model names in EPIC-002 | 2026-08-21 |

**Still open**

1. **Focus rings (V5).** RECON-03 found `outline: none` applied globally — Flow has no visible
   focus indicator on inputs or buttons; focus is signalled only by a background/border change.
   D1 (pixel-exact) says clone it. STORY-402 (accessibility) says don't. They can't both win.
   *Recommendation: add a `:focus-visible` ring that appears only for keyboard users, and mask
   focus states out of the pixel diff.* Mouse users see an identical page; keyboard users get a
   usable one. Pending Kevin.
2. **Which Flow?** — `labs.google/fx/tools/flow` vs. any newer `flow.google` build. Recon should confirm
   which one you actually have access to; we clone exactly one.
3. **Free-tier states** — a paid account never renders the upsell, quota-exhausted or
   locked-feature states. Do we clone them at all? If yes, we need a second pass or careful
   inference. *Recommendation: capture whatever gating is visible, defer the rest to P2.*

## 11. Risks

| Risk | Mitigation |
|---|---|
| Recon is shallow / paraphrased instead of measured | Console token-dump script (`docs/recon/capture-tokens.js`) gives ground truth |
| Populated paid account hides empty/first-run/free-tier states | `PROMPTS.md` § "States a populated account will not show you" — capture them deliberately |
| Personal data (email, project titles) committed in recon dumps | Auto-redaction in `capture-tokens.js`; skim dumps before committing |
| Flow UI changes mid-build | Freeze on the captures in `docs/recon/results/`; re-recon only on request |
| Trademark/brand copying | Non-goal §4: no Google assets committed; our own wordmark from Phase 2 on |
| Scope creep into generation | Hard boundary at `src/data/`; anything past it is EPIC-002 |

## 12. Deviation Register

Pixel-exact is the bar, but a few things cannot be matched and must not be faked. Each entry
needs a reason and an agreed substitute. Filled in as we hit them.

| # | Original | Our substitute | Reason | Diff impact |
|---|---|---|---|---|
| V1 | **`Google Sans Text`** — confirmed RECON-02 | Nearest freely-licensed match, metrics-tuned via `size-adjust` | Not licensed for redistribution | None on conformance (font-size/weight still assert); visual only |
| V2 | Google / Flow wordmark and logo | Our own mark, same bounding box | Trademark | Header only, small area |
| V3 | Google's generated sample video content | Placeholder clips in `public/mock/` | Not ours to ship | None — conformance tests CSS, not media |
| ~~V4~~ | ~~Icon set~~ | **Not a deviation** — Material Symbols is Apache-2.0, we use the real font | — | none |
| **V5** | `outline: none` global. RECON-05 §6 refines it: **search and rail items have no focus indicator at all**; only the composer has one, via `:focus-within` (`box-shadow: rgba(218,220,224,0.15) 0 0 0 1px inset`) | ⚠️ **pending** — add `:focus-visible` rings to rail + search | Cloning exactly leaves the rail and search keyboard-unusable | Focus states only |

| **V6** | Ligature names `settings_2`, `apps_spark_2`, `add_2` (RECON-04 §2/§3/§7) | `settings`, `apps`, `add` | Those glyphs exist only in Google's internal "Google Symbols" build, not the public Material Symbols font — they render as broken text | Three icons, near-identical shapes |

Anything else that deviates gets a row here **before** it gets committed.
