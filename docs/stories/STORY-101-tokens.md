# STORY-101 — `tokens.css` from measured values

**Phase** 1 · **Source** `RECON-03-tokens.md` · **Depends on** STORY-100

## Context

RECON-03 found two patterns that should drive the file's structure:

1. **One tint, seven opacities.** `rgb(218,220,224)` at `.05 / .1 / .15 / .25 / .5 / .75`
   covers nearly every non-black surface, border and muted text.
2. **Two blur tiers.** `80px` for inputs/composer/hover chips, `40px` for menus.

## Acceptance criteria

- [ ] Tint ladder defined from a single `--tint: 218 220 224` channel triplet, consumed as
      `rgba(var(--tint) / 0.15)` — one source of truth, six derived steps
- [ ] Surfaces: page `rgb(0,0,0)`; glass `rgba(22,23,24,0.9)`
- [ ] Blur tiers: `--blur-input: 80px`, `--blur-menu: 40px`
- [ ] Text: primary `#fff` · secondary `rgb(232,234,237)` · muted `tint/0.5` ·
      label `tint/0.75` · footer `rgb(154,160,166)` · disabled `tint/0.25`
- [ ] Accent (send enabled): bg `rgb(255,255,255)`, icon `rgb(48,48,48)`
- [ ] Destructive: `rgb(254,110,110)`
- [ ] **Radii declared individually, NOT as a scale:**
      `10` action-icon · `12` tile-hover-toolbar · `15` chip · `16` search & rail-item ·
      `17` tile · `18` popover · `24` composer · `9999` pill.
      A comment in the file must say these are measured and must not be normalised.
- [ ] Shadows verbatim: composer `0 16px 32px -8px rgba(0,0,0,0.4)`;
      popover `inset 0 0 0 1px rgba(218,220,224,0.05), 0 16px 32px -8px rgba(0,0,0,0.6)`
- [ ] Motion: `--dur-fast: 100ms` (control hover) · `--dur-base: 200ms` (tile, search) ·
      `--dur-slow: 400ms` (rail expand, scroll mask). All `ease-in-out`. **No springs.**
- [ ] Type ramp as 8 named roles — 11/12/13/14/16px, weights 400/500 only,
      `letter-spacing: normal` on every one
- [ ] `--header-height: 76px`, `--grid-gap: 16px`, `--rail-width-collapsed: 64px`,
      `--rail-item-height: 48px`, `--search-height: 40px`
- [ ] Scroll-fade `--mask-gradient` stored verbatim, plus `--mask-height: 92px`
- [ ] Rendered at `/kitchen-sink`: every token as a labelled swatch, so drift is visible

## Notes

Page padding is **asymmetric** — left `16px`, right `8px`. Not a typo, don't "fix" it.
