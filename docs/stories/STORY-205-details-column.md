# STORY-205 — Per-batch details column

**Phase** 2 · **Source** RECON-04 §6

## Context

**Resolved by RECON-04:** one entry per **batch**, rendered beside that batch, inside the scroll
flow. It is *not* a fixed panel that swaps to the selected tile. Two stacked batches render two
details columns simultaneously.

## Structure, top to bottom

1. Action row — `download`, `undo`, `delete`, 32px each, gap 2px, group padding 4px,
   button padding 6px, radius 10px
2. Prompt text — 12px/400/16 white, `-webkit-line-clamp: 3` (~54px collapsed),
   padding `6px 36px 0 0`
3. Two right-aligned controls: `redo` = **"Reuse text prompt"**, `keyboard_arrow_down` =
   **"Expand prompt"**
4. An `add` button
5. Reference thumbnail **50×50**, radius **12px**
6. Metadata stack, 12px/500/16 `rgba(218,220,224,0.5)`, row gap **2px**

## Metadata lines, in order

`Created Aug 21, 2026` · model name · `crop_16_9` + `16:9` · `Video length: 10s` ·
`Resolution: 720p`

## Acceptance criteria

- [ ] Width **400px**, one per batch, scrolls with the grid
- [ ] "Expand prompt" toggles the 3-line clamp to full text
- [ ] **Uploaded images show only download + delete** — no undo. Action row varies by item type
- [ ] **For images, the resolution line shows pixel dimensions** (`1376x768`) instead of `720p`
- [ ] Empty project renders **no details column at all**
