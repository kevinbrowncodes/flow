# STORY-206 — Floating composer

**Phase** 2 · **Source** RECON-04 §7

## Acceptance criteria

- [ ] **600×94**, centered (x=420), `position: absolute`, pinned `bottom: 32px`
- [ ] Background `rgba(22,23,24,0.9)` + `backdrop-filter: blur(80px)`, radius **24px**,
      **no border**, shadow `0 16px 32px -8px rgba(0,0,0,0.4)`
- [ ] Padding `12px 8px 8px 10px`, control gap **4px**
- [ ] Input is a **contenteditable `<div>`**, not a textarea
- [ ] ✅ **C2 resolved (RECON-05): placeholder is 14px/400/lh 20px**, `rgba(255,255,255,0.75)`
      at element `opacity: 0.333`. The contenteditable matches (14/400/20). The 16px reading was
      the outer wrapper, not the text
- [ ] Controls L→R: `add_2` · **Agent** pill · model chip · `arrow_forward` send
- [ ] A **× clear** button appears once text is entered
- [ ] Model chip: `tint/0.05`, radius **15px**, label 11px/500/16 at `tint/0.75`,
      format `{model} ▭ x{count}`
- [ ] Agent pill: off `tint/0.05` radius 15px `aria-pressed=false`. Renders but **inert** (D6)
- [ ] Send disabled: bg `tint/0.05`, icon `tint/0.25`, `aria-disabled=true`.
      Enabled: bg `rgb(255,255,255)`, icon `rgb(48,48,48)`, radius 9999px
- [ ] **Only an empty prompt disables send**
- [ ] Hover transitions `background-color, filter, box-shadow 100ms ease-in-out`
- [ ] ✅ **Send hover (enabled):** background `rgba(218,220,224,0.9)`, icon `rgb(255,255,255)` —
      it *dims* from white and **inverts the icon**. Not a brightening hover
- [ ] ✅ **No busy state.** On submit the input clears, so send returns to its disabled
      appearance. **No spinner and no cancel affordance in the composer** — progress lives on
      the tiles (STORY-307)
- [ ] ✅ **Growth:** grows **upward from a fixed bottom offset** to `max-height: 460px`
      (wrapper `overflow: hidden`), then the inner scroller (`overflow-y: auto`) scrolls
      internally. Custom scrollbar `width: 0.125rem`, thumb `rgba(218,220,224,0.15)`
- [ ] ✅ **Focus:** the composer is the **only** element with a focus indicator — `:focus-within`
      on the wrapper raises background to `rgba(22,23,24,0.9)` and `::after` paints
      `box-shadow: rgba(218,220,224,0.15) 0 0 0 1px inset`. Note it's `:focus-within`, not
      `:focus-visible`

## Out of scope

Asset picker (STORY-304), output settings (STORY-303), submit behavior (STORY-307).
