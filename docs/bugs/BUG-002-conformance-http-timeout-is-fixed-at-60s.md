# BUG-002 — `flow-conformance --generate` cannot pass against a gateway that takes over 60 s to answer

**Status:** Fixed on `develop` 2026-09-07; ships in the next release
**Found:** 2026-09-07, running `flow-conformance --generate` against the Cosmos 3 gateway (spark-cosmos3 STORY_025)
**Affects:** `protocol/python/flow_protocol/conformance.py` CLI (`main`), any gateway that upsamples or queues synchronously

## Summary

The CLI builds its client as `httpx.Client(base_url=..., timeout=60.0)` — a hardcoded
60-second timeout on every request. `--timeout` is separate: it only bounds how long the
run waits for the job to reach a terminal state.

A gateway is allowed to take its time answering `POST /generate`; nothing in PROTOCOL.md
says it must return quickly. The Cosmos 3 gateway upsamples the prompt with a local
26B model before it answers — 102 to 145 s measured — so `--generate` fails every time
with `httpx.ReadTimeout` about a minute in, *while the job it just created runs on
happily*. The operator sees a conformance failure and an occupied GPU.

## Steps to reproduce

```bash
flow-conformance http://localhost:8003 --generate --reference still.jpg --timeout 3600
# ~60 s later: httpx.ReadTimeout: timed out
# meanwhile the gateway has accepted the job and is rendering it
```

## Expected vs actual

- **Expected:** `--timeout 3600` means the run is willing to wait an hour; a slow but valid
  `/generate` is not a conformance failure.
- **Actual:** any `/generate` slower than 60 s fails the run regardless of `--timeout`.

## Fix

Give the client its own flag rather than a constant, defaulting generously, and say in the
help what it covers:

```python
ap.add_argument("--http-timeout", type=float, default=300.0,
                help="per-request timeout; a gateway may take minutes to answer /generate")
...
with httpx.Client(base_url=args.base_url, timeout=args.http_timeout) as client:
```

## Acceptance criteria

- [x] `--http-timeout` exists, defaults to 300 s, and is what the CLI's client uses
- [ ] `flow-conformance --generate` passes against a gateway whose `/generate` takes ~2 min
- [x] The in-process `run_checks(TestClient(app))` path is unchanged — protocol suite 14/14
