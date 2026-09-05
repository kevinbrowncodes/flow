# STORY-104 — Conformance & regression suite

**Phase** 1 · **Source** D1, RECON-02/03/04 · **Replaces** the reference-screenshot pixel diff

## Why this instead of a pixel diff

D1 (pixel-exact) needs enforcing, but diffing our render against a *Google* screenshot is the
wrong instrument:

- It fails on the substituted font (V1) and on mock media (V3) — neither is our CSS
- It reports "3.1% of pixels differ" without saying **which value is wrong**
- It requires reference captures we don't have and don't need

Recon already gave us the ground truth as **numbers**. Assert against the numbers directly.
A wrong tile radius then reads as `expected 17px, got 16px` instead of a diff percentage.

## Part A — Computed-style conformance

Playwright renders our app; assertions read `getComputedStyle` / `getBoundingClientRect` and
compare against values transcribed from `docs/recon/results/`.

- [ ] A single `recon-values.js` fixture holds every measured value, each tagged with its source
      (`RECON-04 §2`) so a failure points back to the evidence
- [ ] Geometry: rail 64/228 · scroller 1212 · tiles area 772 · details 400 · composer 600×94 ·
      top bar 76 · tile 358×201 · rail pill 48×48 / 212×48 · search 370×38
- [ ] Shape: every radius (10/12/15/16/17/18/24/9999) asserted on the element that owns it
- [ ] Color: backgrounds, text colors and the tint ladder asserted as computed rgba
- [ ] Type: size / weight / line-height for all 8 roles, and `letter-spacing: normal` everywhere
- [ ] Spacing: composer padding `12px 8px 8px 10px`, control gap 4px, metadata row gap 2px,
      rail gap 8px, page padding 16 left / 8 right
- [ ] Motion: transition durations 100/200/400ms and `ease-in-out` on the elements that carry them
- [ ] Glass: `blur(80px)` on composer/search/hover-toolbar, `blur(40px)` on popovers
- [ ] Values marked UNKNOWN or in conflict (C1–C3) are **skipped with a reason**, never asserted
      against a guess
- [ ] `npm run conform` runs it; failures name the token, the expected value, the actual value,
      and the recon section

## Part B — Self-baseline visual regression

Catches drift the numbers can't — stacking order, overflow, a correctly-styled element in the
wrong place.

- [ ] Playwright screenshots **our own** output at a fixed viewport and compares to a committed
      baseline of **our previous output**, not Google's
- [ ] `npm run baseline` updates it deliberately
- [ ] Fails on unintended change; no masking needed since both sides are ours

## Part C — Human review

- [ ] Side-by-side against `OBS-02` (the editor screenshot Kevin already provided) at each
      phase gate. Judgement, not automation — "does this read as Flow?"

## Not needed

Reference screenshots from Google. Mask regions. `pixelmatch`.
