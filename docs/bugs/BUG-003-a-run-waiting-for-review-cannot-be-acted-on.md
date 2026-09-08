# BUG-003 — A run waiting for review gives you no way to review it

**Status:** Open
**Found:** 2026-09-07, two agent runs sat at "Waiting for review" and the user did not know he was being asked for anything
**Affects:** `src/features/editor/BatchBlock.jsx`, `src/features/editor/EditorPage.jsx` (STORY-603/604)

## Summary

Agent mode defaults to **confirm: always**, so every run stops and waits for a human. The
only sign of this is the words "Waiting for review" rendered as plain grey text inside the
batch's metadata block:

```jsx
<div className={styles.meta} data-testid="run-status">
  {batch.runStep && <span className={styles.metaLine}>{batch.runStep}</span>}
```

That `<div>` is not a control. Clicking it does nothing, clicking the batch does nothing, and
nothing reopens the agent panel where the **Approve** button lives. The panel opens in exactly
two places: automatically when you create a run, and via a small `open_in_full` icon that only
exists while the Agent pill is on in the composer. Close the panel — or reload the page, or
come back tomorrow — and there is no route back to a run that is blocking on you.

Reported as: *"I didn't see anything tell me to review."* Two runs idled for 35 minutes on an
otherwise free GPU.

## Steps to reproduce

1. Start an agent run with confirm set to Always.
2. Close the agent panel (or reload the page).
3. The batch reads "Waiting for review". Try to approve it without knowing about the composer's
   Expand icon.

## Expected vs actual

- **Expected:** a run that needs a decision says so in a way you can act on — the status opens
  the panel, or the batch carries a Review action, and something distinguishes "blocked on you"
  from "working".
- **Actual:** identical grey text either way, and no route back to the panel.

## Fix

Make `run-status` open the panel for that run when the run is in a state that wants input
(`review`, `paused`, `failed`), and give those states a visible affordance rather than the same
`metaLine` as "Rendering clip 2 of 3". The panel already takes a `runId`, so this is wiring an
existing handler to an existing component, not new machinery.

## Acceptance criteria

- [ ] Clicking a batch whose run is `review`, `paused` or `failed` opens the agent panel on that run
- [ ] Those states are visually distinct from a run that is simply working
- [ ] A page reload still leaves a route back to a run that is waiting on you
- [ ] Part D conformance covers: create a run, close the panel, reopen it from the batch, approve
