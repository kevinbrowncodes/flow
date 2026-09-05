# STORY-100 — CSS Modules scaffolding  ·  ✅ DONE 2026-08-21

**Phase** 1 · **Blocks** everything · **Depends on** D2

## Context

D2: CSS Modules + `tokens.css`. Vite supports `*.module.css` natively — no dependency to add.
Flow uses styled-components, which emits **per-component CSS variables on hashed selectors**
(`--sidebar-item-hover-bg` defined on the rail item's `:hover` rule). We reproduce that pattern
in module files rather than hoisting everything to `:root`.

## Acceptance criteria

- [ ] `src/styles/tokens.css` imported once in `src/main.jsx`, before any module CSS
- [ ] `src/styles/base.css` holds only: box-sizing reset, `html/body { position: fixed }`
      (RECON-02: Flow uses a fixed-viewport shell with an inner scroll container), margin reset,
      font-family, `color-scheme: dark`
- [ ] A component's styles live in `Component.module.css` beside it
- [ ] Component-scoped variables are declared **on the component's own selector**, not `:root` —
      matching Flow's structure so recon values port across unchanged
- [ ] Material Symbols loaded (D9) and an `<Icon name="play_circle">` ligature renders
- [ ] `npm run build` and `npm run lint` clean

## Delivered

- `src/styles/tokens.css` — tint ladder, surfaces, text, accent, glass, motion. STORY-101 completes it
- `src/styles/base.css` — reset + the fixed-viewport shell
- `src/components/Icon/` — Material Symbols ligature component, self-hosted (Apache-2.0)
- `src/App.jsx` + `App.module.css` — proves the module pattern and component-scoped variables
- Build and lint clean

## Follow-up

⚠️ **The Material Symbols woff2 is 3.96 MB** — the full variable font, thousands of glyphs, of
which we use ~25. Fine for dev, wasteful for a build. Subset it to the glyph set recon actually
named (`dashboard`, `image`, `videocam`, `accessibility_new`, `movie`, `drive_folder_upload`,
`apps_spark_2`, `delete`, `left_panel_close`, `left_panel_open`, `arrow_back`, `more_vert`,
`search`, `filter_list`, `add`, `help`, `settings_2`, `play_arrow`, `download`, `undo`, `redo`,
`keyboard_arrow_down`, `crop_16_9`, `add_2`, `arrow_forward`). Tracked as **STORY-405**.

## Out of scope

Any actual page layout. This story ends when a component can be styled, not when one exists.
