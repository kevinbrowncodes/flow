# STORY-204 — Batch block & media tile

**Phase** 2 · **Source** RECON-04 §1, §4 · **The core layout unit**

## Context

**A batch is one generation.** It owns its tiles *and* its details column. Batches stack
vertically inside the single scroller with no divider between them — spacing only.

## Acceptance criteria

- [ ] Batch block = tiles area **772px** + gap **16px** + details column **400px**
- [ ] Tiles area starts x=244; details column x=1032, ending 8px from the viewport edge
- [ ] Tile **358×201**, `aspect-ratio: 1.77778/1`, radius **17px**, gap **16px**
- [ ] Tile edge is a 1px **`outline`** `rgba(218,220,224,0.1)` — outline, not border, so it
      doesn't affect box size, and it's what animates on hover
- [ ] Play button: **32×32**, inset **10px** top-left, `rgba(218,220,224,0.75)`,
      radius 9999px, `play_arrow` ligature
- [ ] Caption 13px/500/16 `rgba(255,255,255,0.9)`, bottom-left overlay
- [ ] Batch of 4 renders 2×2; a single-item batch (upload) renders one tile
- [ ] **No divider or border between batches**
- [ ] Video is `<video preload="none" playsInline>` with a **separate `<img>` poster** —
      no `poster` attribute (RECON-02)
- [ ] ✅ **Resolved (RECON-05 §9): tiles are sized by ROW HEIGHT × aspect ratio, not by width.**
      The row is `display:flex; width:100%; column-gap:16px` with no padding/margin and exactly
      two children, each `flex: 0 1 auto` (**grow 0 — tiles must not stretch**). With
      `justify-content: flex-start`, the leftover ~40px is **unconsumed free space at the trailing
      right edge**. Do not hardcode 358px; do not let tiles fill the row

## Out of scope

Hover/selection behavior (STORY-301), Grid view modes (STORY-305).
