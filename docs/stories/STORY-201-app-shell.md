# STORY-201 — Editor shell & scroll architecture

**Phase** 2 · **Source** RECON-04 §1, §10 · **Depends on** STORY-101, 102

## Context

RECON-04 corrected the layout model: there is **one** scroll container, not three panels.
Getting this wrong makes every later story fight the shell.

## Acceptance criteria

- [ ] `html, body { position: fixed }` — fixed-viewport shell (RECON-02)
- [ ] Exactly **one** `overflow-y: auto` scroller: x=228 (rail expanded), width **1212px**
- [ ] Top bar **76px**, fixed, transparent over black
- [ ] Composer wrapper spans full width, `position: absolute`, composer pinned `bottom: 32px`
- [ ] Footer fixed, bottom-left: `Google Flow can make mistakes, so double check it`
      — 11px/500, `rgb(154,160,166)`
- [ ] Top bar, composer and footer **do not move** when the scroller scrolls
- [ ] Scroll-fade mask on the top **92px** of the scroll area, using `--mask-gradient`,
      animating `opacity/transform/visibility 400ms ease-in-out`
- [ ] Page padding: 16px left (rail gutter), 8px right
- [ ] No lazy pagination — all batches render (RECON-04 §10)

## Out of scope

Rail contents (STORY-202), batch contents (STORY-204).
