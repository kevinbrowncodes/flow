# STORY-608 — The composer shows the size your picture will produce

**Epic:** EPIC-003 — Agent mode: plan, review, render
**Downstream:** spark-cosmos3 STORY_033 already corrects the size server-side; this makes the
correction visible before anyone commits 45 minutes to it

As someone attaching a landscape photo to an agent run, I want the settings to tell me I am
about to get a landscape clip, so that I find out before the render rather than after it.

## The gap

A gateway may choose a different size from the one the UI asked for — spark-cosmos3 does,
because the engine conditions on the seed as the first frame, so a portrait request against a
landscape photo renders squashed. The UI shows its own default until the run is created,
which is the wrong moment: by then the plan is written and the only signal is a batch card
that quietly disagrees with the settings panel.

Reported as: *"the ui display should auto update tho letting me know."*

## Acceptance Criteria

- [x] With a reference attached in agent mode, the settings show the size that will actually be
      used, not the raw default
- [x] It updates when the reference changes, and reverts to the plain default when the
      reference is removed
- [x] The change is visible without opening the settings popover — the composer says what shape
      is coming, in the place it already reports the model and count
- [x] A gateway that does not reshape (the mock, an LTX-style backend) shows its size unchanged,
      with no new affordance
- [x] The displayed size matches what the backend records on the created run, checked in
      conformance rather than assumed — `conform:gateway` attaches a 768x1376 seed to the fake gateway's
      1280x720 default, reads `720x1280` off the chip, creates the run and finds `720x1280` recorded;
      spark-cosmos3 STORY_034 repeats it against the real gateway

## Technical Notes

**Measuring the seed needs no protocol change.** `GET /media/{id}?type=THUMBNAIL` preserves the
source aspect — the sidecar posters video with `scale=<width>:-2` and serves images as they are
— so the UI can read `naturalWidth`/`naturalHeight` off the reference thumbnail it already
renders. Verified on the box: a 1376x768 photo thumbnails to 1376x768, and a 720x1280 clip to
640x1138.

**The rule has to live in one place.** The choice — shape from the seed, resolution from the
request — is implemented today in spark-cosmos3's `flow/runs.py`. If the UI reimplements it,
the two drift and the preview becomes a lie, which is worse than no preview. So:

- Promote it into `flow_protocol` as `size_for_seed(options, requested, seed)` and mirror it in
  `src/adapter/contract.js` as `sizeForSeed`.
- Put the cases in one `protocol/size-vectors.json` that both test suites read, so a change to
  either side that breaks agreement fails both.
- spark-cosmos3 then imports the protocol's version and deletes its local copy (its
  STORY_034).

This is the pattern BACKLOG_003 describes — generic sidecar work moving upstream so other
model repos inherit it.

**Where to show it.** The composer already has a chip area reporting the model and output
count. The size belongs there when it differs from the requested default, phrased as a
statement rather than a warning: the correction is the desirable behaviour, not an error.

## Testing Plan

- **Unit** — required. `sizeForSeed` against the shared vectors; the same vectors run in the
  Python suite. A component test: reference attached with a landscape thumbnail shows the
  landscape size, removing the reference reverts it, a gateway whose options contain only one
  shape shows no change.
- **Conformance** — required. Part D: attach a landscape reference, read the size shown in the
  composer, create the run, and assert the run's recorded size equals what was shown. This is
  the check that keeps the two implementations honest against a real backend.
- **E2E** — not applicable. No render is needed to compare a label with a run record.

## Also found on the way

`tests/gateway.spec.js` had been stale since v0.2.0: it expected the editor at `/ui/` (the
home page now comes first) and no Agent pill (the fake declares one). All six tests were
failing before this story touched anything; they pass now. Part B's visual baseline existed
only for macOS; the first Linux run wrote one and it is committed.

## Estimated Complexity

Medium. The rule and its vectors are small; the wiring (thumbnail measurement, where the size
surfaces, keeping the two languages in step) is the work.
