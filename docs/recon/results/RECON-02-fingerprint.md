# RECON-02 — Implementation fingerprint

**Captured:** 2026-08-21, live DevTools/console on `labs.google/fx/tools/flow/project/...`

## One-line stack

React 18 + Next.js (Pages Router, `assetPrefix:/fx`) · **styled-components v6.4.1** ·
**Google Sans Text** + Material Symbols icon font · **flexbox** everywhere, flex-wrap results
grid with `aspect-ratio` tiles (no CSS Grid, no container queries) · native `<video>` progressive
MP4 via a **tRPC** redirect to `flow-content.google`, `<img>` posters via a `THUMBNAIL` variant.
Supporting libs: **Swiper** (carousel), **Sonner** (toasts).

---

## Framework — React 18 + Next.js Pages Router

- `__reactFiber$…` / `__reactProps$…` on every node; DevTools hook reports **React 18**
- `window.__NEXT_DATA__` → `buildId: "beNiVYnVmTOhNRN-apHhX"`, `page: "/tools/flow"`,
  `assetPrefix: "/fx"`. Canonical Next chunks, `#__next` root, `<next-route-announcer>`
- Dynamic route file is literally `pages/tools/flow/project/[projectId]-*.js` → **Pages Router**
- **Not** Angular, **not** Wiz/JSAction (0 `jsaction`/`jscontroller`/`jsname`), not Lit, not Vue,
  **no shadow DOM anywhere**

## CSS — styled-components v6.4.1, bespoke component library

- Classes like `sc-e8425ea6-0 hOBPaw sc-d3791a4f-0 …` — the styled-components signature
- `<style data-styled>` with `data-styled-version: 6.4.1`; 485 elements carry `sc-*`
- **~3.0 classes per element**, max 11. Not Tailwind, not BEM, not CSS Modules, not semantic
- Styling is runtime-injected via CSSOM `insertRule`. Only two small external sheets (~15KB, ~5KB)
  for resets/third-party. **186 elements carry inline `style=`** for dynamic values
- **No Material Web / MDC.** The only Material footprint is the icon font
- CSS custom properties used **heavily but scoped per-component**, not on `:root` — 67 found,
  almost none global

## 🎯 Confirmed token values

These are measured. They go straight into `tokens.css` in STORY-101.

| Token | Value | Scope |
|---|---|---|
| `--header-height` | **`76px`** | `html, body` — global |
| `--grid-gap` | **`1rem`** (16px) | grid component |
| ~~`--sidebar-item-hover-bg`~~ | ~~`rgba(218,220,224,0.15)`~~ | 🔴 **DEAD (RECON-05 C1)** — not defined in the loaded CSS; the rule that uses it is overridden |
| `--glass-raised-full-blur` | **`80px`** | glass surface |
| `--blur-amount` | **`80px`** | glass surface |
| `--background-color` | **`rgba(218, 220, 224, 0.05)`** | surface fill |
| `--active-color` | **`hsla(200, 12%, 95.1%)`** | nav active |
| `--inactive-color` | **`hsla(0, 0%, 100%, 0.25)`** | nav inactive |
| `--mask-gradient` | `linear-gradient(to bottom, black 0%, black 60%, … transparent 100%)` | scroll fade |
| `--base-scale` | `3` | — |

**Geometry**

| Measurement | Value | Note |
|---|---|---|
| Collapsed sidebar width | **64px** | OBS-02 estimated 44px — **that estimate was wrong** |
| Sidebar layout | `flex-direction: column; gap: 4.8px` | 4.8px is unusual — likely `0.3rem` |
| Tile aspect ratio | `aspect-ratio: 1.77778 / 1` | not a padding hack |
| Grid gap | `16px` | OBS-02 estimated 15px — close |
| Row width (their window) | `1292px` → tile = **638px** | scales with window |
| Type: body | `16px / 400` | Google Sans Text |
| Type: buttons | `11px / 500` | notably small |
| Type: headings | `weight 500` | |
| `backdrop-filter` uses | ~19 | the "glass" panels |

**Structure:** `html`/`body` are `position: fixed` — a fixed-viewport app shell with a single
inner `overflow-y: auto` scroll container. `dvh` used (2×), no `svh`/`lvh`, no `@container`.

## Layout — flexbox, not CSS Grid

170 flex containers vs 8 incidental "grid" nodes. **Zero `grid-template-columns` anywhere.**

The results grid is a **flex-wrap grid built from explicit row containers**: each row is
`display: flex; flex-direction: row; gap: 16px; width: 1292px` holding **two tiles**, and the
parent is `display: flex; flex-wrap: wrap; align-content: flex-start`.

> **This may answer OBS-02 Q1.** Explicit row containers rather than a single wrapping flow
> suggests media is grouped in the DOM — plausibly by generation batch. RECON-04 §6 should
> confirm whether a row container maps to a batch.

## Typography — ⚠️ Google Sans Text, proprietary

UI font resolves to **`"Google Sans Text"`**. All faces `woff2` from `fonts.gstatic.com`.

Families loaded: Google Sans Text, Google Sans, Google Sans Display, Google Sans Flex,
Google Sans Mono · **Fraunces** (serif 300, hero display) · Caveat, Cedarville Cursive,
Just Me Again Down Here, Nanum Myeongjo, Space Grotesk, Space Mono.

**Icons: Material Symbols / Material Icons, rendered as ligatures** — glyph names seen in the
DOM: `keyboard_arrow_down`, `redo`, `crop_16_9`, `crop_free`, `play_circle`.

> ✅ **Material Symbols is Apache-2.0 licensed and freely available.** We can use the real icon
> font rather than hand-drawing an SVG sprite — that kills a whole story's worth of work and
> removes a class of pixel drift.
> ⚠️ **Google Sans Text is not licensed for redistribution.** V1 in the deviation register is
> confirmed real and needs a metric-tuned substitute.

## Media — native `<video>`, progressive MP4

- 8 `<video>`, **0 `<canvas>`**. No HLS, no DASH, no MSE, no blob URLs
- `src="/fx/api/trpc/media.getMediaUrlRedirect?name={uuid}"` → **tRPC**, redirects to
  `flow-content.google`, `video/mp4`, ~2.74 MB. Range/seek behavior UNKNOWN
- `preload="none"`, `playsInline`, not autoplay, not loop
- **No `poster` attribute.** Thumbnails are separate `<img>` hitting the same endpoint with
  `&mediaUrlType=MEDIA_URL_TYPE_THUMBNAIL`
- **No `srcset`, no `<source>`** — one URL per asset, no client-side resolution switching

> Directly shapes the EPIC-002 seam: one media-URL function taking `(id, type)` where type is
> `FULL | THUMBNAIL`. Mocks return local paths; EPIC-002 returns local model server URLs.
> Nothing in the tile component changes.

## Stated UNKNOWNs

Individual font-file hashes · range-request seek behavior · alternate server-side resolutions ·
whether unmounted screens use `display:grid` (styled-components only injects mounted rules).
