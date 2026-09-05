# STORY-307 — Generation lifecycle

**Phase** 3 · **Source** RECON-04 §8 · **The heart of the create loop**

## Observed sequence

Verified live with a real Nano Banana 2 image, x2:

1. Submit → a new batch is inserted at the **top of the grid** (newest first)
2. Prompt field **clears after a slight delay**, not instantly
3. Pending tile: dark **gradient skeleton** + `image` placeholder icon top-left +
   **live percentage counter top-right** (27% → 57% observed)
4. **No spinner, no `<progress>` element** — progress is a text percentage
5. **Details column populates immediately** — prompt, model and aspect render while the media
   is still generating
6. On completion the skeleton is replaced by the finished media, and the **resolution line
   updates to real dimensions** (`1376x768`)
7. End-to-end EST: **20–30s** for an image x2 batch

## Acceptance criteria

- [ ] `src/data/createGeneration()` returns a batch that transitions
      `queued → running → done`, with mock timing in the 20–30s range (configurable for dev)
- [ ] New batch prepends to the list — never appends
- [ ] Pending tile matches the skeleton spec: gradient fill, placeholder icon top-left,
      percentage top-right. **No spinner.**
- [ ] Percentage text: **11px, `rgba(255,255,255,0.5)`** (RECON-05 §5). Counts up; easing
      unobserved, so use linear
- [ ] **Send shows no busy state** — it returns to disabled because the input clears. There is
      **no cancel affordance anywhere** in the composer
- [ ] Details column renders complete metadata from the moment of submit, with the resolution
      line filling in only on completion
- [ ] Prompt clears on a short delay when "Clear prompt on submit" is on (STORY-305)
- [ ] `failed` state is modelled in the data layer and renders **something honest** — a plain
      error tile marked `TODO(RECON-05)`. ⚠️ **UNKNOWN:** Flow's real failure UI was never
      triggered. Do not invent a polished error state and pass it off as measured
