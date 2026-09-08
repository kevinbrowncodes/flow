# BUG-004 — A batch keeps its original resolution when the run's values change

**Status:** Open
**Found:** 2026-09-07, after a run's size was corrected server-side (spark-cosmos3 BUG_012)
**Affects:** `src/adapter/runMirror.js` — `patchFromRun`

## Summary

`batchFromRun` builds a batch from a run and copies its `values`, including `resolution` and
`aspect`. `patchFromRun`, which keeps an existing batch in step with its run, copies only clip
status, progress, asset key and error. Nothing refreshes the batch's own metadata.

So when a run's `values.size` changes after the batch exists, the card keeps claiming the old
one — it showed `720x1280` and `9:16` for runs the backend had already moved to `1280x720`.
The render is correct; the card is not, which is worse than either being wrong on its own.

## Steps to reproduce

1. Create an agent run; note the resolution on the batch card.
2. Change that run's `values.size` on the backend.
3. Reload the editor. `reconcileRuns` patches the clips and leaves the resolution stale.

## Expected vs actual

- **Expected:** reconciling a batch against its run makes the card describe the run.
- **Actual:** clip state follows, batch metadata does not.

## Fix

Have `patchFromRun` return the batch-level fields alongside the item patches when
`run.values` disagrees — `resolution`, `aspect`, and anything else `batchFromRun` derives from
`values` — so one function defines what a batch takes from a run.

## Acceptance criteria

- [ ] `patchFromRun` refreshes `resolution` and `aspect` when the run's values have moved
- [ ] A unit test covers a run whose size flips orientation after the batch exists
- [ ] `batchFromRun` and `patchFromRun` derive batch metadata from one shared helper
