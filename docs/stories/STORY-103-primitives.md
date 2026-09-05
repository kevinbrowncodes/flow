# STORY-103 — Primitives the MVP page needs

**Phase** 1 · **Source** `RECON-03-tokens.md` · **Depends on** STORY-101

## Context

Only what the editor page actually renders. A primitive we don't use is a primitive we haven't
verified against anything.

## Components

| Component | Measured spec |
|---|---|
| `IconButton` | radius `9999px` or `10px` (action variant); padding `6px`; hover transitions `background-color, color, box-shadow, filter, backdrop-filter` all `100ms ease-in-out` |
| `IconButtonGroup` | gap `2px`, padding `4px` — the download/undo/delete cluster |
| `Popover` | bg `rgba(22,23,24,0.9)`, `blur(40px)`, radius `18px`, padding `8px`, shadow `inset 0 0 0 1px rgba(218,220,224,0.05), 0 16px 32px -8px rgba(0,0,0,0.6)` |
| `MenuItem` | `11px/500/16`, padding `8px 18px 8px 8px`, height `34px`; destructive variant `rgb(254,110,110)` |
| `Chip` | bg `tint/0.05`, radius `15px`, label `11px/500/16` at `tint/0.75` |
| `SearchField` | height `40px`, radius `16px`, fill `tint/0.1` + `blur(80px)`, border `1px solid tint/0.05`, focus animates `border-color 200ms ease-in-out` — **no ring** |
| `Toggle` | the "Agent" pill; label `11px/500/16` |
| `Icon` | Material Symbols ligature (D9) |

## Acceptance criteria

- [ ] Every component consumes `tokens.css` variables — **zero literal colors or radii** in
      module files
- [ ] Hover/active/disabled states implemented from the measured values, not invented
- [ ] Disabled: bg `tint/0.05`, content `tint/0.25`
- [ ] All render on `/kitchen-sink` in every state
- [ ] ✅ **Popover mount animation (RECON-05 §7)** — a keyframes animation, not a transition:
      `slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)`, from `opacity:0; translateY(4px)` to
      `opacity:1; translateY(0)`. **No close animation is defined** — it unmounts immediately

## Out of scope

Dialog, Toast, Tooltip, Slider — not on this page. Sonner comes later if the MVP needs toasts.
