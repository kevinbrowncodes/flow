# STORY-604 — A run is a batch in the grid

**Phase** EPIC-003 · **Source** RECON-10 §2 (generated media lands as ordinary tiles), D21 (runs are backend-owned, mirrored into the project) · **Depends on** STORY-601, STORY-603

A run's clips appear where every other clip does: as tiles in the project
grid, in one batch per run, filling in order as the backend renders them. The
run's step label shows on the batch. The panel (STORY-603) is where you act on
a run; the grid is where you see its output.

## Acceptance criteria

### Mirroring

- [ ] When a run is created (STORY-602's send) a **batch** is added to the project — `type: video`, `prompt: run.title`, `runId`, one item per clip (`clip_count`), each `status: pending` — prepended like a generate (RECON-04 §8)
- [ ] The batch's items track the run: `item[i]` mirrors `clips[i]` — `status` (`pending → running → done | failed`), `progress`, and `assetKey = media_id` when done; `batch.resolution` from the run's `values.size` when known
- [ ] The batch shows the run's **step label** in its details column (`Rendering clip 2 of 6`) while the run is active, and the run's `error` when `paused`/`failed`; on `done` the details read as for any batch
- [ ] Runs are the source of truth: on project load, `adapter.agent.listRuns(projectId)` reconciles — a run with no batch gets one; a batch whose run has advanced gets patched. A run whose batch was deleted is **not** re-added (the user removed it)
- [ ] The mirror is driven by one `adapter.watchRun(projectId, run, onUpdate)` per active run, exactly like `watch()` for generates: polls `agent.run(id)`, stops on `done`/`failed`, resumes after a reload for still-active runs

### Tiles

- [ ] A pending clip whose predecessor is still rendering shows the skeleton with no number; the clip being rendered shows the gateway's percentage; done clips show their poster and play like any video tile
- [ ] Deleting the batch deletes it from the project only — the run keeps rendering on the backend (there is no cancel), and the batch's details column says so before deletion: *"Removing this batch does not stop the render."*

### State

- [ ] `Batch` gains optional `runId`; `MediaItem` gains optional `clipIndex`. `describeBatch` handles a run batch (title as prompt, values from the run's `values`)
- [ ] The editor's reducer handles `RUN_UPSERT` (batch mirror patch from a run) alongside `BATCH_PATCH`

## Deviations from Google

| Google | Here | Why |
|---|---|---|
| The storyboard grid is a single image tile | One batch of N video tiles | Our agent renders clips, not a storyboard image |
| Chat thumbnails of generated media | The grid *is* the output view | No transcript |

## Testing

- **Unit** (`tests/unit/runMirror.test.js`): `batchFromRun`, `patchFromRun` (each state → item patches, progress mirroring, assetKey on done, error placement), reconciliation rules (missing batch added, deleted batch not re-added, advanced run patched).
- **Adapter** (`tests/unit/agent.test.js` additions): `watchRun` on both adapters — patches arrive per poll, stops on terminal, `404 → failed`.
- **Conformance** (STORY-605): a run created in the UI shows as a batch with N tiles, the step label on the batch, tiles filling in order on the mock, delete leaves the run alone.
