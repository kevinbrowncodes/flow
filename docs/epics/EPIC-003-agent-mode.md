# EPIC-003 — Agent mode: plan, review, render

| | |
|---|---|
| **Status** | ✅ Shipped in `v0.2.0`, 2026-09-07 — STORY-601–606 done (protocol v1.1, pill/picker/settings, panel, runs-as-batches, Part D conformance 4/4; unit 59/59; protocol 14/14), plus BUG-001 (the Expand icon sat under the prompt editor). Consumed by spark-cosmos3 STORY_032, which drove a real agent run through the UI: plan → review → edit → rewrite → approve → rendered clip |
| **Owner** | Kevin Brown |
| **Created** | 2026-09-07 |
| **Predecessor** | EPIC-002 — Flow as a library (the seam this rides on); STORY-208 (projects home) |
| **Repo** | `kevinbrowncodes/flow` — protocol + UI. The backend that fulfils it lives in each model repo (first: `spark-cosmos3` EPIC_003) |
| **Recon** | `docs/recon/results/RECON-10-agent-mode.md`, RECON-04 §7 (pill geometry) |

---

## 1. Goal

Turn the inert Agent pill (D6) into a working surface: the user attaches a
seed, picks an **instruction** (a backend-owned skill), chooses a **count**,
and the agent writes every clip's script, shows the plan for **review**, and —
once approved — renders the clips one after another as ordinary tiles in the
grid. The UI never knows how a backend plans or chains; it renders what the
protocol describes.

Google's Agent mode (RECON-10) is a conversational creative director. Ours
keeps its **shape** and drops the conversation:

| Google (RECON-10) | Flow |
|---|---|
| Agent pill: fills white, model chip hides, ⤢ + two controls appear | Same, measured (RECON-04 §7); rendered only when `capabilities.agent` is declared |
| "Agent instructions" — add/edit/toggle guidelines | A **read-only picker** of the backend's instruction library (the skills are the backend's, versioned there) |
| "Agent settings" — confirm Always/Never, per-mode defaults | Confirm before rendering (Always/Never), default values for the run's fields |
| Storyboard → "Does this look good?" | **Review view**: every script editable, Rewrite per script, arc summary, Approve |
| "make shot 2 slower" via chat | Edit script 2, or Rewrite it. No transcript |
| Sessions: per-project, server-side, auto-named | **Runs**: per-project, server-side (the backend owns them), auto-named from the plan's titles |
| Reasoning-step labels, no token streaming | Step labels on the run: "Writing 6 scripts…", "Rendering clip 2 of 6 · 38 %", "Trimming…" |
| Chat, suggestion chips, thumbs/flag, credits | Not built |

Kevin, 2026-09-07: *"ours will be zero shot essentially"* — the language step
is one shot; the workflow keeps the review gate because a run costs hours of
GPU, not credits.

## 2. Decisions

| # | Decision | Value |
|---|---|---|
| D19 | Where the agent lives | **In the backend.** The protocol describes plans and runs; a backend implements a planner and a chain however it likes (Cosmos: Gemma + Extend). The UI is a client. A backend without a planner declares `agent: false` (LTX today) and the pill never renders |
| D20 | Protocol shape | **Additive v1.x**: `capabilities.agent` + `/flow/agent/*` routes. Unknown to old UIs, ignored by old backends. No major bump |
| D21 | Server-side state | Runs are the protocol's **first server-side records** — a deliberate exception to D14 (client-side projects/batches). A multi-hour chain must outlive a browser tab; the run is owned by the backend and *mirrored* into the project's batch list by the UI so it shows as tiles |
| D22 | Instructions are read-only in the UI | Skills are code-adjacent artefacts that belong in the backend's repo (spark-cosmos3 `data/prompts/`). The UI lists and picks; add/edit/toggle (Google's "Agent instructions" editor) is not built |
| D23 | Revision model | Edit script text in place + **Rewrite one script** (backend regenerates that clip with the others held). No conversation |
| D24 | Confirm gate | `confirm: "always"` by default; `"never"` starts rendering as soon as the plan exists. Stored in the UI's settings, sent per run as `autostart` |
| D25 | Progress vocabulary | A run exposes `step` (a short present-tense label) and `clip_index / clip_count`; the UI shows the label on the run and the gateway's per-clip `progress` on the tile. No streaming |

## 3. Protocol additions (v1.x, additive)

```jsonc
// GET /flow/capabilities
"agent": {
  "instructions": true,               // GET /flow/agent/instructions exists
  "count": { "min": 1, "max": 12, "default": 3 },
  "confirm": "always",                // backend's default; UI may override per run
  "fields": ["size", "length", "steps", "sound", "upsample", "reasoner"]   // which mode fields a run carries
}
```

| Route | Purpose |
|---|---|
| `GET /flow/agent/instructions` | `[{id, name, description, count_locked}]` |
| `POST /flow/agent/plan` | `{reference_id, instruction, count}` → `{scripts[], titles[], summary, attempts, model}` — pure, nothing rendered |
| `POST /flow/agent/runs` | `{project_id, reference_id, instruction, count, values, autostart}` → `Run` (state `review` or `queued`) |
| `GET /flow/agent/runs?project_id=` | `Run[]` newest first |
| `GET /flow/agent/runs/{id}` | `Run` — `{id, project_id, title, state, step, clip_index, clip_count, scripts[], titles[], summary, clips: [{n, job_id, media_id, status, progress}], error, created_at}` |
| `PATCH /flow/agent/runs/{id}/scripts/{n}` | `{text}` — edit before approval |
| `POST /flow/agent/runs/{id}/scripts/{n}/rewrite` | backend regenerates script *n* |
| `POST /flow/agent/runs/{id}/approve` | `review → queued` |
| `POST /flow/agent/runs/{id}/resume` | after a failed clip: continue from that clip |

States: `planning → review → queued → rendering → done | failed | paused` (paused = the backend's own gate, e.g. memory, with `error` naming why).

The reference implementation (`flow_protocol`) ships models, a `FlowAgent` ABC
mixed into `FlowGateway`, router additions, conformance checks that run only
when `agent` is declared, and a fake agent for the mock so the UI is testable
without a GPU.

## 4. What changes in flow

| Area | Change |
|---|---|
| `protocol/PROTOCOL.md`, `flow_protocol/models.py`, `router.py`, `conformance.py`, `examples/fake.py` | The additions above |
| `src/adapter/contract.js`, `http.js`, `data/index.js` | `agent.*` adapter methods on both adapters; mock agent with a fake planner and a fake chain |
| `Composer` | Pill ON state per RECON-04 §7; hides the model chip; ⤢ opens the agent panel; two controls open the instruction picker and agent settings |
| new `features/agent/` | `AgentPanel` (review view, run status, run history), `InstructionPicker`, `AgentSettings` |
| `BatchBlock` / `editorState` | A run mirrors into the project as one batch of `clip_count` tiles that fill in order; run `step` shown on the batch |
| `tests/` | unit for adapter/agent helpers; conformance for pill states, panel geometry, review flow against the mock |

## 5. How a model repo adopts it

Declare `agent` in capabilities and implement `FlowAgent`. spark-cosmos3
already has the backend half under its own `/agent/*` prefix (EPIC_003 there);
STORY-601 gives it the protocol-shaped `/flow/agent/*` mirror. LTX declares
`agent: false` until it has a planner.

## 6. Stories

| Story | Title | Depends on | Status |
|---|---|---|---|
| STORY-601 | Protocol v1.x agent surface: models, `FlowAgent`, router, conformance, fake agent | spark-cosmos3 STORY_030 proving the run model | ✅ |
| STORY-602 | Agent pill ON state, instruction picker, agent settings (confirm, defaults) | RECON-04 §7, RECON-10 §1 | ✅ |
| STORY-603 | The review view: editable scripts, Rewrite, titles, arc summary, Approve, "Writing N scripts…" step | 601 | ✅ |
| STORY-604 | The run in the grid: N tiles filling in order, step labels, paused/failed/resume, run history | 601, 603 | ✅ |
| STORY-605 | Conformance for agent mode against the mock (pill states, panel geometry, review flow) | 602–604 | ✅ |
| STORY-606 | Release **`v0.2.0`** (never tagged for 208, so Agent mode rides along); spark-cosmos3 bumps `FLOW_VERSION` (their STORY_032) | 601–605 | ✅ shipped 2026-09-07 |
| STORY-607 | A clip that has not rendered yet shows its seed instead of a grey tile | 604 | 📝 specced |
| STORY-608 | The composer shows the size your picture will produce (`agent.shape_from_seed`, `size_for_seed` in both languages, shared vectors) | 602, 604 | ✅ built, ships in `v0.2.1` |
| BUG-003 | A run waiting for review cannot be acted on from the grid | 603, 604 | 📝 open |
| BUG-004 | Batch metadata does not follow the run's values | 604 | 📝 open |

Stories land in order; 601 is written against the run model spark-cosmos3's
STORY_030 lands first, so the protocol describes something that exists.

## 7. Risks and open points

| Risk | Handling |
|---|---|
| First server-side state in the protocol (D21) | Scoped to runs only; projects/batches stay client-side. A run mirrors into a batch, it does not replace one |
| Instruction library semantics differ per backend | The protocol only carries `id/name/description/count_locked`; everything else is the backend's |
| RECON-10 measured the expanded panel's *structure*, not its pixels | STORY-602/603 geometry is `EST:` until a token capture with Agent ON is run (`capture-tokens.js`) |
| Google's agent chooses image vs video on its own | Ours does not: a run is always the backend's video mode. Image planning (storyboard grids) is out of scope |
