# STORY-208 — Projects home

**Phase** 2 (post-MVP) · **Source** RECON-08 · **Route** `/` (replaces the redirect stub)

The landing page: a grid of the user's projects, a floating **New project** button, inline
rename, and delete. Replaces `FlowEditor`'s `Home` component, which today resolves a default
project id and `<Navigate>`s straight into the editor.

## Acceptance criteria

### Layout (RECON-08 §2)

- [ ] Grid is **3 columns, fluid** — `repeat(3, 1fr)`, **not** the computed `572px` the capture
      reported. At 1796px wide with an 8px scrollbar the tracks measure back to **572px**
- [ ] **16px** gap, row and column
- [ ] Grid padding **`0 16px 16px 24px`**; first card at x=24, y=80 (directly under the header)
- [ ] Newest project first

### Header (RECON-08 §1, trimmed per D4)

- [ ] **80px** tall, `position: sticky`, transparent, `padding: 16px 24px`
- [ ] Left: the wordmark — **`capabilities.name`**, not "Google Flow". Links to `/`
- [ ] Right: a single **overflow `⋮`** button. Flow Music / Flow TV / Discord / Instagram / X /
      ULTRA / avatar are **not rendered** — they have no local meaning (see *Deviations*)
- [ ] Overflow menu items: **About** and **Delete all projects…**
- [ ] **About** shows: UI version, protocol version, gateway origin, and `capabilities.name` —
      the four things needed to identify a bad deploy
- [ ] **Delete all projects…** goes through the same confirmation as a single delete

### Project card (RECON-08 §3)

- [ ] Wrapper: flex column, `border-radius: 16px`, no padding
- [ ] Thumbnail is the **link** (`aria-label="Open project"`, href `/project/{id}`),
      `aspect-ratio: 16/9`, `border-radius: 16px`, `overflow: hidden`
- [ ] Image `object-fit: cover`, `transition: opacity 0.2s` — a **load-in fade, not a hover effect**
- [ ] **No zoom/scale on hover** — only the card background tints
- [ ] A project with no media shows a flat `--tint-hover` fill, no shimmer
- [ ] Thumbnail source: the newest done item in the project's newest batch, via
      `getMediaUrl(assetKey, 'THUMBNAIL')`
- [ ] Footer: `42px`, `padding: 4px 16px`, `justify-content: space-between`
- [ ] Title `.type-title` (16/24/400, `--text-primary`), then a hover-only pencil
      (`aria-label="Edit project title"`); trash on the right (`aria-label="Delete project"`)
- [ ] Icon buttons **34×34**, 18px glyph
- [ ] **No overflow menu on the card. No badges.** Two hover actions, nothing else

### Card states (RECON-08 §4)

- [ ] Default: transparent background, both icons `opacity: 0`
- [ ] Hover **and** `:focus-within`: background `--tint-fill`, icons to `opacity: 1` over `0.2s`
- [ ] Icons are reachable by keyboard (they exist in the DOM at all times, not conditionally rendered)

### Rename (RECON-08 §4)

- [ ] Pencil turns the title into an **inline text field** with ✓ confirm and ✕ cancel — not a dialog
- [ ] **Enter** confirms, **Escape** cancels, blur keeps editing (no silent save)
- [ ] An empty or whitespace-only title is rejected — the project keeps its previous name
- [ ] The new title persists across reload

### Delete (RECON-08 §4, copy per *Deviations*)

- [ ] Trash opens a `role="dialog"` with **"Delete this project?"**
- [ ] Body: **"Its prompts and layout will be removed from this browser. The clips stay on the box and remain available in the asset picker."**
- [ ] Buttons **Cancel** / **Delete project**; Escape and scrim-click cancel
- [ ] Confirm removes the project **and its batches** from the store; **no media is deleted**
- [ ] Focus returns to the card's trash button on cancel

### New project (RECON-08 §5)

- [ ] `position: fixed`, horizontally centred, **56px** above the viewport bottom
- [ ] Label **"New project"**, `add` icon to its left, `border-radius: 32px`,
      background `--tint-active`, text `--tint-label`, 16px, `padding: 0 20px`
- [ ] **Width 192px**; height is **`EST: 48px`** — the capture's 128px is inconsistent with a
      32px radius and 16px text, and measures ≈70px in the reference screenshot (RECON-08 note)
- [ ] Click creates the project and navigates **straight to `/project/{new-uuid}` — no dialog**
- [ ] The new project is titled by `formatProjectTitle` (**`Aug 21 at 10:58 AM`**), the format
      already shipped by STORY-207 — not the three variants the capture saw

### Empty state (designed, not cloned — RECON-08 §6)

- [ ] Zero projects shows one centred line, **"No projects yet"**, 22px, `--tint-muted`,
      **no illustration** — the same treatment STORY-207 gives the editor
- [ ] The New project button remains visible; it is the only call to action

### Adapter surface

- [ ] `listProjects()`, `createProject()`, `renameProject(id, title)`, `deleteProject(id)` exist on
      **both** adapters (http and mock) and on `BatchStore`
- [ ] `deleteProject` drops the project **and** its batches in one write
- [ ] No new gateway call: projects stay client-side (`PROTOCOL.md` — *"Projects and batches live
      in the browser"*). A gateway that later grows `/flow/projects` swaps the store, not this page

## Deviations from the capture — and why

| Capture says | We do | Why |
|---|---|---|
| `grid-template-columns: 572px 572px 572px` | `repeat(3, 1fr)` | 572px is the *computed* value at 1796px. The same 3 columns appear at ≈1277px in the reference screenshot, and `(1796−8−24−16−32)/3 = 572.0` closes exactly. A fixed track breaks at every other width |
| New project button `128px` tall | `EST: 48px` | 32px radius + 16px text + 128px height is internally inconsistent; measures ≈70px in the screenshot. Flagged for re-measure |
| Title formats vary (`Sep 07 - 09:06`, `Aug 31 at 01:51 PM`, …) | `Aug 21 at 10:58 AM` | `formatProjectTitle` already ships this; home and editor must agree |
| Header carries Flow Music/TV, socials, ULTRA, avatar | Dropped | D4 renders Google-only chrome inert *for pixel fidelity*; on a local single-user backend there is no account, no subscription and no social product. Keeping the **shape** (80px sticky bar, right-aligned cluster) preserves the layout; keeping dead Discord links would be furniture |
| Delete: *"All your clips, ingredients, and prompts will be permanently deleted"* | *"Its prompts and layout will be removed from this browser. The clips stay on the box…"* | The protocol has **no media delete**. Clips live on the gateway and survive. Google's copy would be false here — see BACKLOG_004 in spark-cosmos3 |
| Empty state UNKNOWN | Designed: one muted line | Unrecoverable without deleting 21 real projects, and it is the first screen a fresh install shows |

## Notes

**This page is the first thing that makes project storage visible.** Projects live in
`localStorage`, namespaced per gateway origin, so the gallery lists *this browser's* projects.
Two machines pointed at the same box show two different galleries. That is existing behaviour,
not a regression — but the home page is where a user will notice it.

**Not in scope:** the promo carousel (H4), the Daily Bonus bar, and the loading skeleton (H2 —
RECON-08 §7 found none; the store is synchronous from `localStorage`).

## Testing

- **Unit** (`tests/unit/projects.test.js`, `node:test`): store `deleteProject` removes batches
  too; `listProjects` ordering; `createProject` titles by `formatProjectTitle`; `renameProject`
  rejects empty/whitespace; both adapters implement the same four methods.
- **Conformance** (`tests/conformance.spec.js`): home at 1440×900 against the mock —
  3 columns, 16px gaps, card radius 16, footer 42px, thumbnail 16/9, hover reveals both icons,
  focus-within does too, New project centred and fixed, empty state copy.
- **Manual:** rename → reload → name persists; delete → the clip is still in the asset picker.
