# RECON-03 — Design tokens (project editor)

**Captured:** 2026-08-21, DevTools computed styles, dark theme, viewport 1796px CSS / DPR 2.
Everything below is a **measured computed value** unless prefixed `EST:`.

**Theme:** dark-only. No light variant, no `prefers-color-scheme` switch. Pure black surfaces with
translucent light overlays.

---

## 🔑 The system behind the values

Two patterns explain nearly every token. Build `tokens.css` around these, not around a
hand-rolled scale.

### 1. One tint, seven opacities

`rgb(218, 220, 224)` is *the* on-dark tint. Almost every non-black surface, border and muted text
is that colour at a set opacity:

| Opacity | Role |
|---|---|
| `0.05` | surface fill (model chip), borders, popover inner ring |
| `0.10` | tile outline, search field fill |
| `0.15` | ~~rail hover~~ — **not used**, see RECON-05 C1 |
| `0.25` | rail item **active**, disabled text/icon |
| `0.50` | muted metadata text |
| `0.75` | secondary label text (chip label, "Agent") |

### 2. Two blur tiers

| Tier | Value | Used by |
|---|---|---|
| Input | `blur(80px)` | composer, search field, tile hover toolbar |
| Menu | `blur(40px)` | popovers / dropdowns |

### 3. Three motion durations, all `ease-in-out`

`100ms` control hovers · `200ms` tile + search · `400ms` rail expand + scroll mask.
**No spring physics anywhere** — every transition is a cubic curve.

### ⚠️ Radii are NOT a scale

`10 · 12 · 15 · 16 · 17 · 18 · 24 · 9999` — seven distinct arbitrary values. Do **not** normalise
these to a tidy ramp; a 17px tile rendered at 16px is a visible, diffable error.

---

## COLOR

| Token | Value | Applied to |
|---|---|---|
| Page / grid / rail / top-bar / details-panel bg | `rgb(0,0,0)` | everything inherits page black |
| Composer bg | `rgba(22,23,24,0.9)` + `blur(80px)` | floating prompt pill |
| Popover bg | `rgba(22,23,24,0.9)` + `blur(40px)` | dropdown menus |
| Tile bg (pre-load) | `rgb(0,0,0)` | tile before video loads |
| Tile edge | `1px solid rgba(218,220,224,0.1)` as **`outline`, not `border`** | media tile |
| Search field | fill `rgba(218,220,224,0.1)` + `blur(80px)`, border `1px solid rgba(218,220,224,0.05)` | search pill |
| Model chip bg | `rgba(218,220,224,0.05)` | composer chip |
| Rail item — active | `rgba(218,220,224,0.25)` | selected rail row |
| ~~Rail item — hover~~ | ~~`rgba(218,220,224,0.15)`~~ | 🔴 **DEAD (RECON-05 C1)** — overridden by a later `transparent` rule. Rail items have **no hover background** |
| Popover inner ring | `rgba(218,220,224,0.05) 0 0 0 1px inset` | menus |
| Text — primary | `rgb(255,255,255)` | title, prompt, active label |
| Text — secondary | `rgb(232,234,237)` | inactive rail labels |
| Text — muted | `rgba(218,220,224,0.5)` | details metadata |
| Text — label | `rgba(218,220,224,0.75)` | chip label, "Agent" |
| Text — footer | `rgb(154,160,166)` | disclaimer |
| Text — placeholder | `rgba(255,255,255,0.75)` at `opacity:0.333` → effective `rgba(255,255,255,0.25)` | composer |
| Disabled | text/icon `rgba(218,220,224,0.25)`, bg `rgba(218,220,224,0.05)` | send when empty |
| **Accent — send enabled** | bg `rgb(255,255,255)`, icon `rgb(48,48,48)` | send button |
| Destructive | `rgb(254,110,110)` | Delete menu item |
| Tile hover toolbar | bg `rgba(255,255,255,0.5)` + `blur(80px)`, icon `rgba(27,27,27,0.9)` | tile hover controls |
| **Focus ring** | **none — `outline: none` globally.** Focus shown via bg/border change | ⚠️ see V5 |

**UNKNOWN:** enabled-send hover shade.

## TYPE RAMP

`"Google Sans Text"` throughout. **`letter-spacing: normal` (0) on every role** — no tracking
anywhere. Sizes cluster at 11 / 12 / 13 / 14 / 16, weights 400 or 500 only.

| Size / weight / line-height | Applied to |
|---|---|
| `16 / 400 / 24` | project title (an editable `<input>`) |
| `16 / 500 / 20` | search input text |
| `14 / 400 / 20` | composer placeholder + input |
| `14 / 500 / 20` | rail labels (active `#fff`, inactive `rgb(232,234,237)`) |
| `13 / 500 / 16` | tile hover caption, `rgba(255,255,255,0.9)` |
| `12 / 400 / 16` | details-panel prompt text, `#fff` |
| `12 / 500 / 16` | details metadata lines, `rgba(218,220,224,0.5)` |
| `11 / 500 / 16` | model chip, "Agent", footer disclaimer, popover menu items |

## SHAPE

| Radius | Applied to |
|---|---|
| `10px` | action-icon buttons (download / undo / delete) |
| `12px` | tile hover toolbar |
| `15px` | model chip |
| `16px` | search field, rail item |
| `17px` | **media tile** |
| `18px` | popover / menu |
| `24px` | composer |
| `9999px` | send button, round icon buttons |

| Shadow | Value |
|---|---|
| Composer | `rgba(0,0,0,0.4) 0 16px 32px -8px` — no border |
| Popover | `rgba(218,220,224,0.05) 0 0 0 1px inset, rgba(0,0,0,0.6) 0 16px 32px -8px` |
| Tiles, most buttons | `none` |

The tile uses **`outline`** for its hairline so it doesn't affect box size — and that's the
property that animates on hover.

## SPACING

| Value | Applied to |
|---|---|
| `12px 8px 8px 10px` | composer padding (T/R/B/L) |
| `4px` | composer control gap |
| `0 10px` outer, `10px 16px 10px 0` inner | search field padding |
| `40px` | search field height |
| `12px` | top-bar right-cluster gap |
| `4px` | rail item padding |
| `8px` | rail item icon↔label gap |
| `48px` | rail item row height |
| `2px` | details metadata row gap |
| `6px 36px 0 0` | details prompt block padding |
| `2px` / `4px` / `6px` | action-icon group gap / group padding / button padding |
| `4px` / `2px` | tile hover toolbar padding / gap |
| `8px` | popover padding |
| `8px 18px 8px 8px`, height `34px` | popover menu item |
| left `16px`, right `8px` | page outer padding — **asymmetric** |

## MOTION

| Transition | Value |
|---|---|
| Tile hover | `opacity 0.2s ease-in-out, outline 0.2s ease-in-out` — brightens video, reveals outline |
| Rail item hover | `background-color 0.1s ease-in-out, color 0.1s ease-in-out` |
| Icon / action buttons | `background-color, color, box-shadow, filter, backdrop-filter — all 0.1s ease-in-out` |
| Model chip + send hover | `background-color, filter, box-shadow 0.1s ease-in-out` |
| Search focus | `border-color 0.2s ease-in-out` — border brightens, no ring |
| Composer focus | `transition: all 0s` — **no focus transition on the pill itself** |
| Sidebar expand/collapse | `padding-top 0.4s, width 0.4s, opacity — ease-in-out` |
| Grid scroll-fade | `mask-image` on a **92px** strip at the top of the scroll area, animating `opacity 0.4s, transform 0.4s, visibility 0.4s ease-in-out` |

Scroll-fade gradient, verbatim:
`linear-gradient(#000 0%, #000 60%, rgba(0,0,0,.8) 80%, rgba(0,0,0,.4) 90%, rgba(0,0,0,.2) 95%, rgba(0,0,0,.1) 97%, transparent 100%)`

**UNKNOWN:** popover open/close duration (EST: ~150ms fade/scale — treat as unknown).

## GLASS

Flat translucent fills plus blur. **No noise texture, no gradient overlay.** Only the popover
carries an inner 1px highlight ring; the composer separates purely via its drop shadow.
