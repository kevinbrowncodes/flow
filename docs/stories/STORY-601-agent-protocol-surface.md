# STORY-601 — Agent protocol surface (v1.x, additive)

**Phase** EPIC-003 · **Source** RECON-10, spark-cosmos3 EPIC_003 / STORY_029–031 (the backend that already exists)

The protocol half of Agent mode: how a UI discovers that a backend can plan
and render scenes, and the routes it drives to do so. Written against the run
model spark-cosmos3 has **already landed and exercised** (its `/agent/*`
routes), so the protocol describes something real rather than something hoped for.

## Acceptance criteria

### Capabilities

- [x] `capabilities.agent` is optional. Absent or `false` → the Agent pill is not rendered (D19). Present →
  ```jsonc
  "agent": {
    "instructions": true,                       // GET /flow/agent/instructions exists
    "count": { "min": 1, "max": 12, "default": 3 },
    "confirm": "always",                        // "always" | "never" — the backend's default; the UI may override per run
    "fields": ["size", "length", "steps", "sound", "upsample", "reasoner"]   // which mode fields a run carries (a subset of the video mode's fields)
  }
  ```
- [x] `assertCapabilities` (JS) and `Capabilities` (pydantic) validate it: `count.min ≥ 1`, `default` inside `[min, max]`, every `fields` entry a real field of the default mode; unknown keys ignored

### Routes (all under the protocol prefix, JSON, `{"detail"}` errors)

| Route | → | Notes |
|---|---|---|
| `GET /flow/agent/instructions` | `Instruction[]` `{id, name, description, count_locked}` | |
| `POST /flow/agent/plan` `{reference_id, instruction, count}` | `Plan` `{instruction, count, scripts[], titles[], summary, attempts, model}` | pure — renders nothing; 422 count on a locked skill; 404 unknown instruction/reference; 502 with the reason after retries |
| `POST /flow/agent/runs` `{project_id?, reference_id, instruction, count, values?, autostart?}` | `202 Run` | `values` are validated like `/flow/generate`'s; 422 on unknown keys |
| `GET /flow/agent/runs?project_id=` | `Run[]` newest first | |
| `GET /flow/agent/runs/{id}` | `Run` | 404 unknown |
| `PATCH /flow/agent/runs/{id}/scripts/{n}` `{text}` | `Run` | 409 unless `review`; 404 bad n |
| `POST /flow/agent/runs/{id}/scripts/{n}/rewrite` | `Run` | 409 unless `review` |
| `POST /flow/agent/runs/{id}/approve` | `Run` | 409 unless `review` |
| `POST /flow/agent/runs/{id}/resume` | `Run` | 409 unless `failed` or `paused` |

- [x] `Run` = `{id, project_id, title, state, step, clip_index, clip_count, instruction, count, values, reference_id, scripts[], titles[], summary, clips: [{n, script, job_id, media_id, status, progress, error}], autostart, error, created_at, updated_at}`; `state ∈ planning | review | queued | rendering | done | failed | paused`; `step` is a short present-tense label the UI shows verbatim
- [x] `flow_protocol` ships the pydantic models, a `FlowAgent` ABC (`instructions()`, `plan()`, `create_run()`, `list_runs()`, `run()`, `edit_script()`, `rewrite_script()`, `approve()`, `resume()`), and `build_router` mounts the agent routes **only when the gateway implements `FlowAgent`**
- [x] `flow-conformance` gains agent checks that run only when `agent` is declared: instructions shape, plan validation (422/404 paths without calling a model), run lifecycle on a fake, 409 guards
- [x] `examples/fake.py` implements `FlowAgent` with a canned planner and a fake chain that advances on each poll, so `npm run dev` and the conformance suite exercise the whole flow without a GPU
- [x] `src/adapter/contract.js` gains the `agent.*` adapter methods and the `Run` typedef; `http.js` implements them over the routes; `data/index.js` mirrors the fake
- [x] `PROTOCOL.md` documents all of the above under **v1.1 (additive)**; `capabilities.protocol` stays `1`

## Deviations / decisions

| Question | Decision |
|---|---|
| Server-side state | Runs are the protocol's first backend-owned records (D21). The UI **mirrors** a run into the project as one batch whose items are the clips; it never stores the run itself |
| Naming | `/flow/agent/*` mirrors spark-cosmos3's `/agent/*` one-to-one so that backend mounts the same handlers under both prefixes (their STORY_032). No renamed fields |
| Cancel | Not in this story — the Cosmos gateway cannot stop GPU work (their CLAUDE.md §6). `paused`/`failed` + `resume` is the whole failure vocabulary for now |

## Testing

- **Unit** (`tests/unit/agent.test.js`): capabilities validation (each rule), `Run` helpers, the http adapter's agent methods against the fake gateway.
- **Protocol** (`protocol/python/tests/test_agent.py`): models, `FlowAgent` on the fake, the router (every status code in the table), conformance's agent checks green on the fake and **skipped** on a gateway without `agent`.
- **Conformance** (`tests/conformance.spec.js`): unchanged — the UI stories add the visual checks.

## Note

This story changes no pixels. STORY-602 (pill, picker, settings) and STORY-603
(review view) build on it; STORY-604 mirrors runs into the grid.
