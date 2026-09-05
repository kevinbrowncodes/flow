# STORY-102 — Router + UUID mock fixtures

**Phase** 1 · **Source** `RECON-01`, `OBS-02`, `RECON-02`

## Context

Flow's route is `/fx/tools/flow/project/{uuid}`. We mirror the path shape without the `/fx`
asset prefix. Media resolves through a single endpoint — RECON-02 saw
`media.getMediaUrlRedirect?name={uuid}&mediaUrlType=FULL|THUMBNAIL`. That shape **is** the
EPIC-002 seam.

## Acceptance criteria

- [ ] `react-router` with `/project/:projectId`, `:projectId` a UUID v4
- [ ] Deferred routes (`/characters`, `/tools`, `/trash`, `/edit/:mediaId`) resolve to a stub —
      their nav entries render but stay inert (D6)
- [ ] `src/data/` exposes async functions only, never raw fixtures:
      `getProject(id)` · `listMedia(projectId, filter)` · `getMediaUrl(id, 'FULL'|'THUMBNAIL')` ·
      `createGeneration(prompt, settings)`
- [ ] Media items model `queued | running | done | failed` from day one, even though mocks
      always resolve `done`
- [ ] Fixtures carry every field the details panel shows: prompt, model, aspect ratio,
      video length, resolution, created date, reference-image id
- [ ] Project titles are **timestamps** (`Aug 21 at 10:58 AM`) — that's how Flow names them
- [ ] 3–4 local MP4s in `public/mock/` with separate poster JPGs, since RECON-02 confirms Flow
      uses `<video>` + a separate `<img>` poster rather than a `poster` attribute
- [ ] No component imports from `public/mock/` or a fixture module directly — everything goes
      through `src/data/`

## Why the seam matters

EPIC-002 replaces `src/data/` and nothing else. If a component knows a file path, that promise
is already broken.
