# STORY-606 — Release v0.2.0: projects home + Agent mode

**Phase** EPIC-003 · **Depends on** STORY-208, STORY-601–605

`v0.2.0` was prepared for the projects home (STORY-208) but never tagged, so
Agent mode ships in the same release. `package.json`, `pyproject.toml` and
`flow_protocol.__version__` already read `0.2.0`; the workflow's version check
compares them to the tag.

## Acceptance criteria

- [x] `npm run lint` clean; `npm test` green; `pytest` green in `protocol/python`; `npm run build:all` builds
- [x] `PROTOCOL.md` documents Agent mode as v1.1 (additive); `capabilities.protocol` stays 1
- [x] README names Agent mode and the projects home
- [x] EPIC-002 rows 511/515 and EPIC-003's status reflect what shipped
- [ ] **Kevin:** `git push origin develop && git tag v0.2.0 && git push origin v0.2.0` — the Action publishes `flow-ui-v0.2.0.tar.gz`
- [ ] spark-cosmos3 bumps `FLOW_VERSION=v0.2.0` (their STORY_028 + STORY_032 land together)

## Note

The tag goes at HEAD of `develop`, after the agent commits — not at the
earlier "Release v0.2.0" commit, which predates them.
