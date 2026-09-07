# STORY-603 — The agent panel: review, approve, and watch a run

**Phase** EPIC-003 · **Source** RECON-10 §1 (the expanded panel), §2 (plan → confirm → generate, revise in place), §3 (sessions) · **Depends on** STORY-601, STORY-602

The expand icon opens the agent panel: a right-side overlay (RECON-10 §1 — not
a full page) that shows the current run — its scripts for review, the arc
summary, the step label while it plans or renders, and a history of runs for
this project.

## Acceptance criteria

### The panel

- [ ] Opens from the composer's **Expand** icon and from the pill's ON state on first run creation; a right-side overlay panel (EST 420px wide, full height, glass surface like the popovers), with a header carrying the run title, **"Run history"** (icon `history`), **"New run"** (icon `add`, closes the panel and focuses the composer) and **Close** (✕)
- [ ] Shows the **newest run for this project** (`adapter.agent.listRuns(projectId)`); with none: *"Attach a seed, pick a skill, and press → to plan a scene."*
- [ ] While `planning`: the step label (`Writing 3 scripts…`) with the three-dot thinking indicator (RECON-10 §4); the panel polls `adapter.agent.run(id)` every 2 s while the run is active
- [ ] Polling stops on `done`/`failed` and restarts when a `paused`/`failed` run is resumed

### Review (`state: review`)

- [ ] Every script is an editable text area, numbered **Script n of N**, with a **Rewrite** button per script (icon `refresh`) that calls `rewriteScript` and shows a spinner on that script only
- [ ] Edits save on blur (`editScript`); a save or rewrite failure shows inline under that script
- [ ] Titles are shown as chips (the first is the run's title); the summary renders as preformatted text below the scripts
- [ ] **Approve** (white pill, bottom of the panel) calls `approve`; a **"…and render now"** hint states the count and size from `values`
- [ ] The panel's copy never claims a cost — no credits line (RECON-10 §4 is Google-only)

### Rendering, paused, failed, done

- [ ] `queued`/`rendering`: step label + `clip_index / clip_count` + the current clip's `progress` as a bar; scripts read-only
- [ ] `paused`: the reason (`error`) and a **Resume** button; `failed`: the reason at the failed clip and **Resume**
- [ ] `done`: *"Done — N clips in the grid"* and the clips' thumbnails (via `getMediaUrl(media_id, 'THUMBNAIL')`) as a row

### History

- [ ] "Run history" lists this project's runs newest first: title, state, step, created date; clicking one shows it in the panel

## Deviations from Google

| Google | Here | Why |
|---|---|---|
| A chat transcript with the plan as a message | The plan *is* the panel | One-shot agent; nothing to converse with |
| "Show thinking" reasoning steps | The step label + the arc summary | The summary is the plan's own explanation |
| Session auto-naming by the model | `run.title` = the plan's first title | Same effect, no extra call |

## Testing

- **Unit** (`tests/unit/agentPanel.test.js`): the panel's state helpers — which run to show, polling on/off by state, the approve hint text, error placement.
- **Conformance** (STORY-605): panel opens/closes, review layout, approve → queued, done thumbnails, history list — on the mock, which advances a run per poll.
