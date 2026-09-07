# STORY-605 — Conformance for Agent mode

**Phase** EPIC-003 · **Source** RECON-04 §7, RECON-10 · **Depends on** STORY-602–604

Agent mode gets its own part of the conformance suite, run against the mock
(which advances a run per poll), so a future change to the pill, the panel or
the mirror fails a test rather than a user.

## Acceptance criteria

- [ ] `tests/conformance.spec.js` gains **Part D — Agent mode** with, at 1440×900 on the mock:
  - pill OFF is `--tint-fill` / 15px radius; ON is white and stays white under hover; `aria-pressed` tracks it
  - ON hides the model chip and shows Agent instructions, Agent settings and Expand (exact names); OFF reverses all three
  - the picker lists both mock skills with the `1 clip` badge on the locked one; choosing it locks the count control
  - settings: Confirm Always/Never, Clips 1–6 segmented, one control per run field (`aspect`, `duration` on the mock), Save closes
  - send is disabled without a seed even when the backend's `reference` is optional; enabled with seed + skill
  - a run: panel opens on `Writing 3 scripts…`, reaches review, three editable scripts, Rewrite changes one, Approve → `Queued` → `Rendering clip n of 3` → `Done` with three thumbnails; history lists it
  - the grid: the run is one batch of three tiles that fill in order; the details column shows the step and the "does not stop the render" note while active and nothing once done; the batch survives a reload
- [ ] `tests/recon-values.js` gains an `AGENT` block naming its sources (RECON-04 §7 for the pill; RECON-10 §1/§4 for structure; `EST:` for panel geometry)
- [ ] The whole suite stays green on the mock; Part D adds no new snapshot baselines

## Testing

This story *is* tests. `npm run conform` on the mock build.
