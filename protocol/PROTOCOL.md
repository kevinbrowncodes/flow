# Flow Gateway Protocol — v1

The HTTP contract between the Flow UI and a model backend. A backend that
implements these six routes can host the UI unchanged; the UI can be upgraded
without touching the backend for as long as the protocol major stays at 1.

Reference implementation: [`python/`](python/) (pydantic models, FastAPI
router, conformance CLI). JavaScript client: `src/adapter/http.js` in the
flow repo.

## Versioning rules

| Who | Rule |
|---|---|
| **Protocol** | `capabilities.protocol` is an integer major. Within a major, changes are **additive only**: new optional fields, new optional endpoints. Removing or renaming anything, or making an optional field required, bumps the major. |
| **UI (flow)** | Semver. Refuses to boot against a gateway whose `protocol` differs from the one it was built for, with a readable message on screen. |
| **Gateway** | Pins one flow release (`FLOW_VERSION` in its Dockerfile/.env). Bumps by changing the pin and running `flow-conformance`. |
| **Both** | A git tag of the flow repo (`v0.4.0`) versions the UI bundle **and** `flow-protocol` together. Pin the same tag for both. |

Unknown JSON keys are ignored by both sides, so a newer peer never breaks an older one.

## Routes

All routes live under one prefix, `/flow` by default. Errors are JSON
`{"detail": "<human readable>"}` with an appropriate 4xx/5xx status; the UI
shows `detail` verbatim to the user.

### `GET /flow/capabilities` → `Capabilities`

What this backend can do. Fetched once at boot; drives the whole chrome.

```jsonc
{
  "protocol": 1,
  "name": "Cosmos 3 Nano",             // composer chip + details column when no `model` field
  "default_mode": "video",
  "modes": [
    {
      "key": "video",                    // "image" | "video" — also the batch/tile type
      "label": "Video",
      "icon": null,                      // optional emoji on the composer chip
      "fields": [
        { "key": "size", "label": "Size", "type": "choice", "role": "size",
          "options": ["720x1280", "1280x720"], "default": "720x1280" },
        { "key": "frames", "label": "Frames", "type": "choice", "options": [121, 189, 300], "default": 189 },
        { "key": "sound", "label": "Sound", "type": "boolean", "default": true },
        { "key": "seed", "label": "Seed", "type": "number", "role": "seed", "min": 0, "default": 42 },
        { "key": "count", "label": "Outputs", "type": "choice", "role": "count", "options": [1, 2], "default": 1 }
      ]
    }
  ],
  "reference": "required",             // "none" | "optional" | "required"
  "reference_kinds": ["image"],        // what may be attached
  "progress": "percent",               // "percent" | "none" — whether jobs report 0–100
  "credits": false,                    // true only if the UI should show a cost line
  "strings": { "footer": "…", "placeholder": "…", "empty": "…" },   // all optional
  "surfaces": { "agent": false, "characters": false, "scenes": false, "tools": false, "trash": false }
}
```

**Fields.** `type` is one of `choice` (options; scalar values are fine, `{value,label}` also accepted),
`boolean`, `number` (`min`/`max`/`step`), `text`. `default` is required and, for
`choice`, must be one of the options. `label: null` renders the control with no heading.

**Roles** tell the UI how to *interpret* a field regardless of its key:

| role | used for |
|---|---|
| `model` | composer chip label, details column "model" line |
| `aspect` | aspect line + icon (value like `16:9`) |
| `size` | aspect derived from `WxH` |
| `duration` | "Video length: Ns" line (seconds) |
| `count` | `xN` on the chip **and the number of `/generate` calls per submit** |
| `seed` | reserved for a future "reuse seed" affordance |

**Surfaces** the backend does not claim are not rendered (rail items, the
inert Agent pill). This is how a repo "leaves" Flow features that have no
local analogue.

### `POST /flow/generate` → `202 Job`

Submit **one** output. The UI calls this `count` times per submit and shows
one tile per job.

```json
{ "mode": "video", "prompt": "…", "values": { "size": "720x1280", "frames": 189, "sound": true, "seed": 42, "count": 1 },
  "reference_id": "in:7f3a-still.png" }
```

Server rules (the reference router enforces them): unknown `mode` → 422;
unknown keys in `values` → 422; missing keys take the field's default;
values are coerced to the field's type; `reference_id` required/forbidden per
`capabilities.reference`; unknown `reference_id` → 404.

### `GET /flow/jobs/{id}` → `Job`

```jsonc
{ "id": "video_gen_…", "status": "running",          // queued | running | done | failed
  "progress": 42,                                     // 0–100 or null (null when progress: "none")
  "media_id": null,                                   // set when done
  "width": 704, "height": 1280, "duration_s": 7.9,    // optional; width×height fills the Resolution line
  "error": null }                                     // set when failed
```

Unknown id → 404. The UI turns a 404 into a failed tile ("job not found"),
so it is fine to forget terminal jobs after a while. Transient 5xx are
retried on the next poll.

### `GET /flow/media` → `MediaAsset[]`

Everything the asset picker can attach, newest first.

```json
[{ "id": "in:7f3a-still.png", "name": "still.png", "kind": "image", "source": "upload", "created_at": "2026-09-05T13:02:11+00:00" }]
```

### `POST /flow/uploads` (multipart, field `file`) → `201 MediaAsset`

### `GET /flow/media/{id}?type=FULL|THUMBNAIL` → bytes

`FULL` returns the file. `THUMBNAIL` **must return an `image/*`** — for a
video, a poster frame (the reference router extracts one with ffmpeg and
caches it). The UI renders thumbnails in `<img>`; a video body there is a
broken tile.

Media ids are opaque strings chosen by the gateway; the reference store uses
`<root>:<filename>`. They are URL-encoded by the client — avoid `/`.

## What the gateway does not do

- **Projects and batches** live in the browser (localStorage, namespaced per
  gateway origin). The gateway is stateless apart from jobs and files. A
  `/flow/batches` endpoint would be an additive v1.x change.
- **Auth, multi-user, quotas.** Single-user box.
- **Cost estimation.** `credits: false` hides the line; a future optional
  `/flow/estimate` can add it back.

## Serving the UI

The release bundle (`flow-ui-<tag>.tar.gz` on the flow GitHub release) is a
static folder with a **hash router** and **relative asset paths**. Mount it at
any sub-path (`/ui`) with `html=True`; no catch-all route needed. It talks to
the origin that served it unless `window.FLOW_CONFIG.gateway` or
`?gateway=URL` says otherwise. `?adapter=mock` switches the same bundle to the
built-in fixtures for a demo.

## Conformance

```bash
flow-conformance http://localhost:8002                                  # contract only
flow-conformance http://localhost:8002 --generate --reference still.png  # + one real render
```

Run the first in CI on every change to the router; run the second by hand
before bumping the pinned UI. Both exit non-zero naming the failing line.
