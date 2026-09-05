# RECON-05 — Gap closer

**Captured:** 2026-08-21. Technique: real mouse hover + authoritative cascade reads of matched
rules (specificity + source order) from the live stylesheets. All 11 items resolved except #11.

---

## Conflicts — all three resolved

### C1 ❌ The rail has **no hover feedback at all**

Two equal-specificity rules (0,3,0) exist for a non-active rail item:

```
.hGbzYr:not(:disabled):hover { background-color: rgba(218,220,224,0.15) }  /* source order 189 */
.fqbaql:not(:disabled):hover { background-color: transparent }             /* source order 341 — WINS */
```

Later source order wins → **computed hover background is `transparent`**, identical to base.
Active is a separate class: `.lnCuH { background-color: rgba(218,220,224,0.25) }`.

🔴 **`--sidebar-item-hover-bg` is not defined anywhere in the loaded CSS** — computed value is an
empty string. It is authored but dead. RECON-03's token table lists it; that entry is wrong.

Both earlier readings were partly mistaken: RECON-03 read the *losing* rule, RECON-04 conflated
the *active* class. The truth is that non-active rail items don't respond to hover.

### C2 ✅ Composer placeholder is **14px** — RECON-03 was right

The placeholder is an absolutely-positioned unclassed `<span>`: **14px / 400 / lh 20px**,
`rgba(255,255,255,0.75)` at element `opacity: 0.333`. The contenteditable is identical (14/400/20).
The 16px/24px readings belong to the **outer composer wrapper divs**, not the text.

### C3 ✅ The title is **already an `<input type="text">`** — RECON-04 was wrong

Always an input, styled to look like plain text:

```css
background: transparent; border: 0; outline: 0;
font: inherit;                    /* 16px/400 white */
field-sizing: content;
max-width: min(20vw, 500px);
text-overflow: ellipsis;
cursor: text;
```

**⋮ → Rename focuses that same input in place** — no new element. It reveals two **40px** icon
buttons beside it: **✓ "Done"** and **✗ "Cancel"**. While editing: height **24px**, width
auto-fits content up to ~359px.
**Enter commits · ✓ commits · Escape cancels · ✗ cancels** (both revert without saving).

## Styling gaps

| # | Finding |
|---|---|
| **4** | **Send hover (enabled):** background `rgba(218,220,224,0.9)`, icon `rgb(255,255,255)`. Note it *dims* from pure white and **inverts the icon** — not a brightening hover |
| **5** | **No busy state.** The send button does not become stop/spinner. On submit the input clears, so send simply returns to its disabled appearance (`aria-disabled=true`, bg `tint/0.05`, icon `tint/0.25`, glyph still `arrow_forward`). **No in-composer cancel affordance.** Progress lives on the tiles: percentage text **11px, `rgba(255,255,255,0.5)`** |
| **6** | **Focus:** global `:focus:not(:focus-visible) { outline: none }` plus per-element `outline: none`. **Search input — no indicator. Rail item — no indicator.** **Composer — has one**, via `:focus-within` on the wrapper: background raises to `rgba(22,23,24,0.9)` and `::after` paints `box-shadow: rgba(218,220,224,0.15) 0 0 0 1px inset`. The only true `:focus-visible` rings in the entire stylesheet are on Sonner toasts |
| **7** | **Popover animation is a keyframes mount, not a transition:** `animation-name: slideUp`, `0.2s`, `cubic-bezier(0.16, 1, 0.3, 1)`. `@keyframes slideUp { 0% { opacity:0; transform: translateY(4px) } 100% { opacity:1; transform: translateY(0) } }`. **No close animation defined** |

## Measurements

### 8 ✅ Separator carries a 35% element opacity

A 1px-tall `<div>` with `background-color: rgb(232,234,237)` and **`opacity: 0.35`** — no border
at all. Effective painted line ≈ `rgba(232,234,237,0.35)`. The "too bright" reading missed the
element opacity.

### 9 ✅ The 40px is unconsumed flex free space — and tiles size from HEIGHT

The tiles row is `display:flex; width:100%; column-gap:16px; padding:0; margin:0`, with **exactly
two children, no third element, no padding, no margin**.

Each tile is **`flex: 0 1 auto`** (grow 0 → does not stretch) and is **sized by a fixed row height
× aspect ratio**. Because the row is `width: 100%` with `justify-content: normal` (flex-start),
the aspect-ratio-sized tiles leave **unconsumed free space at the trailing right edge**.

> 🔑 **Tile width is derived from row height, not from the container width.** Do not hardcode
> 358px and do not make tiles grow to fill. Reproduced independently: at a 1128px row,
> 536 + 536 + 16 = 1088, leftover exactly 40px — the same delta as 772 vs 732.

### 10 ✅ Composer grows upward to 460px, then scrolls internally

- Grows **upward from a fixed bottom** — the wrapper's bottom offset is unchanged before/after
- **`max-height: 460px`**, wrapper `overflow: hidden`
- Past that the inner scroller (`overflow-y: auto`) scrolls internally.
  At 316 words: scrollHeight 476 vs clientHeight 402
- Custom scrollbar: **`width: 0.125rem`** (2px), thumb `rgba(218,220,224,0.15)`

### 11 ⬜ Failure state — **UNKNOWN**

Not triggered deliberately (per instruction). Checked this project plus older projects with many
generations: every one succeeded. No failed tiles, no error/retry text, no warning icons, no retry
buttons anywhere in the DOM. Genuinely unobserved.

## Still open — needs a human pointer

The 👤 manual check was not run. These remain UNKNOWN and block STORY-301:

- Does hover start video playback? Does audio play?
- What controls appear on hover, and where?
- What does a single click do — navigate, or select in place? What changes visually?
- Right-click: native menu or custom?

## Account artifacts from this session

One image generation was run (needed to observe the enabled/busy send states), and the project was
temporarily renamed then restored to "Aug 21, 06:34 PM".
