# STORY-607 — A clip that has not rendered yet shows its seed

**Epic:** EPIC-003 — Agent mode: plan, review, render
**Related:** BUG-003 (a waiting run gives you nothing to act on)

As someone watching a run that will take 45 minutes, I want each tile to show the picture the
clip grows out of, so that a project I come back to reads as *my scene, not yet rendered*
rather than a grid of blank grey boxes.

## The gap

`BatchBlock` shows a poster only once a clip is finished:

```jsx
const thumb = item.assetKey ? adapter.getMediaUrl(item.assetKey, 'THUMBNAIL') : null
…
) : pending ? (
  <div className={styles.pending}>
    <span className={styles.pendingIcon}><Icon name="image" /></span>
```

Until then every tile is the same grey rectangle with a generic image glyph — for the whole
render, which on this hardware is 30 to 45 minutes per clip. The batch already knows the seed
(`batch.referenceKey`, rendered as a 28px `refThumb` beside the metadata), so the picture is
in hand and simply unused at tile size.

Reported as: *"why don't see a still image for the video generations its just a grey box."*

## Acceptance Criteria

- [ ] A pending clip shows the run's seed as its poster, dimmed or otherwise marked so it is
      not mistaken for a finished render
- [ ] The percentage and the pending glyph stay legible over it
- [ ] A finished clip still shows its own poster; a failed one still shows the failure state
- [ ] An Extend clip shows the clip it continues, which is its reference, so a chain reads in
      order rather than as one repeated image
- [ ] A batch with no reference (a text-only backend) keeps today's grey placeholder — nothing
      regresses for a gateway that has no seed
- [ ] The seed is fetched at thumbnail size, not full resolution

## Technical Notes

`referenceKey` is on the batch, `assetKey` on the item, so the tile needs the batch's key
passed down or read from context. Prefer passing it: `Tile` is already given what it renders.

For an agent run the per-clip reference differs — clip 1 seeds from the upload, clip *n* from
clip *n-1* — and the run record has that. The batch's `items` do not carry it today, so either
`batchFromRun`/`patchFromRun` start recording each clip's reference, or the tile falls back to
the batch's own reference for every clip. **Falling back is acceptable for a first cut** and is
the smaller change; the per-clip version is the criterion above and should follow the same
mirror path the statuses use.

Out of scope: any change to what the gateway serves. `GET /media/{id}?type=THUMBNAIL` already
returns a poster for both images and videos.

## Testing Plan

- **Unit** — required. `Tile` with a pending item and a reference renders a poster; with no
  reference renders the placeholder; a done item still uses its own asset; a failed item is
  unchanged.
- **Conformance** — required. Part D gains an assertion that a batch created by an agent run
  shows a poster on its tiles while the run is still planning, not a blank tile.
- **E2E** — not applicable. No render is needed to show a seed, and the conformance run covers
  the rendered-poster case already.

## Estimated Complexity

Small for the fallback version; medium if per-clip references go through the mirror.
