# STORY-602 — Agent pill ON state, instruction picker, agent settings

**Phase** EPIC-003 · **Source** RECON-04 §7 (pill geometry), RECON-10 §1 (what changes on screen, the two panels) · **Depends on** STORY-601

The Agent pill stops being inert. Toggling it on turns the composer into the
agent's composer; two new controls open the instruction picker and the agent
settings; a fourth, the expand icon, opens the panel STORY-603 builds.

## Acceptance criteria

### The pill (RECON-04 §7, RECON-10 §1)

- [x] Rendered only when `capabilities.agent` is declared (D19); `aria-pressed` reflects the state
- [x] OFF: `--tint-fill` background, 15px radius (the existing `Chip`); ON: fills **white** with dark text (`Chip.on`)
- [x] ON hides the **model/output chip** and its popover; OFF restores it. Everything reverses exactly
- [x] ON shows, in the control row: **"Agent instructions"** (icon `description`) and **"Agent settings"** (icon `tune`) icon buttons; and an **"Expand"** (icon `open_in_full`) icon button at the composer's **top-right**, absent when OFF
- [x] The prompt placeholder stays `"What do you want to create?"`; typed text is kept but **not** part of a run — the skill is the prompt (see *Deviations*)
- [x] The agent state (on/off, chosen instruction, count, confirm, run values) persists per gateway origin in `localStorage` (`flow:agent:v1`) and survives a reload

### Instruction picker ("Agent instructions")

- [x] A popover listing `adapter.agent.instructions()` as radio rows: name, one-line description, and a `1 clip` badge on `count_locked` skills
- [x] Choosing a locked skill forces count to 1 and disables the count control; choosing an unlocked one restores the previous count
- [x] Read-only — no add/edit/toggle (D22); an empty library shows *"No skills in the library yet"* and the send stays disabled

### Agent settings ("Agent settings")

- [x] **Confirm before rendering**: `Always` / `Never` segmented control, defaulting to `capabilities.agent.confirm`
- [x] **Clips**: a segmented row from `count.min` to `count.max` when the range is ≤ 8 wide, else a number input; default `count.default`
- [x] One control per field in `runFields(caps)` (the video mode's fields the backend listed), rendered with the same `FieldControl` the output-settings popover uses, seeded from the video mode's defaults
- [x] A **Save** button closes the popover (values apply live; Save is the affordance Google has — RECON-10)

### Send in agent mode

- [x] Send is enabled when a reference is attached **and** an instruction is chosen; the composer's `needsReference` hint applies as before, plus *"Pick a skill to start"* when none is chosen
- [x] Send calls `adapter.agent.createRun({projectId, referenceId, instruction, count, values, autostart: confirm === 'never'})` and clears the reference like a generate does; a rejection shows as the composer notice. Showing the run is STORY-603/604; this story only creates it

## Deviations from Google

| Google | Here | Why |
|---|---|---|
| Prompt text is the agent's chat turn | Text is ignored by a run | Our agent is one-shot: the **skill** is the prompt (spark-cosmos3 EPIC_003). The box stays enabled so the user can still switch the pill off and generate normally with what they typed |
| Instruction editor with `+ Reference` per instruction | Read-only list | D22 — skills are versioned in the backend's repo |
| Image *and* video generation defaults | Only the video run fields | A run always renders the backend's video mode |

## Testing

- **Unit** (`tests/unit/agentState.test.js`): reducer actions (`AGENT_TOGGLE`, `AGENT_SET`, `AGENT_INSTRUCTION` locking count to 1 and restoring it), settings persistence helpers (read/write/namespace, tolerates missing storage), `autostart` derived from `confirm`.
- **Conformance** (STORY-605): pill OFF/ON colours, model chip hidden, the three icon buttons present/absent, panels open, radio + segmented controls, send gating.
- **Manual**: mock adapter — toggle, pick `mock-scene`, count 3, send → a run exists (`adapter.agent.listRuns`).
