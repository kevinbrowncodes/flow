# RECON-08 — Project gallery / home

**Captured:** 2026-09-07 · browser-extension Claude · `flow.google.com/` · **innerWidth 1796, DPR 2**
(matches the reference viewport in `STATUS.md` — comparable to RECON-03/04/05).
All values are computed CSS px unless prefixed `EST:` or marked `UNKNOWN`.

---

*(verbatim recon output)*

# Google Flow — Projects Home Screen Spec

Measured at window width **1796px** (CSS px; device pixel ratio 2). URL: `flow.google.com/`. All px are measured unless prefixed `EST:` or marked `UNKNOWN`.

## 1. Page header

There is **no dedicated content header** (no page title, no subtitle, no sort/filter/view controls). The projects grid begins immediately under a global top bar.

The top bar (`.flow-header`) is **80px tall, position: sticky, transparent background, padding 16px 24px**. Contents:

- **Left:** "Google Flow" text wordmark (link to `/`).
- **Right (in order):** a "Flow Music" text/pill link → flowmusic.app; a "Flow TV" link with a `tv` icon → labs.google/flow/tv; three social icon links (Discord, Instagram, X); a "Product help" icon button (`help` / "?"); a "More options" kebab icon button (`more_vert`, ⋮); an **"ULTRA"** plan badge; and the circular Google Account avatar (aria-label carries the signed-in account).

**No sort, filter, "view as grid/list", or search control exists anywhere on this page** (confirmed by DOM scan).

## 2. Layout

CSS Grid (`.projects-grid`), `display: grid`.

- **Columns at 1796px: 3.** `grid-template-columns: 572px 572px 572px` (fixed, not fluid).
- **Card slot width: 572px.** Card total height **363.75px** (thumbnail 321.75 + footer 42).
- **Gap: 16px** both directions (`column-gap` 16, `row-gap` 16).
- **Grid padding: `0 16px 16px 24px`** (top 0, right 16, bottom 16, left 24). First card sits at x=24, y=80 (directly under the 80px header).

## 3. The project card (full anatomy)

Wrapper `div.project-card` — **flex column, 572×363.75, border-radius 16px, no padding**. Two stacked regions, no gap between them:

**a) Thumbnail** — `a.project-thumbnail-container` (this element is itself the "Open project" link, aria-label **"Open project"**, href `/project/{uuid}`).
- **Aspect ratio 16/9** (`aspect-ratio: var(--project-card-thumbnail-aspect-ratio, 16/9)`), rendered **572×321.75**, `border-radius: 16px`, `overflow: hidden`, `position: relative`.
- Media is an `<img>` with `object-fit: cover` and `transition: opacity 0.2s` (a load-in fade, **not** a hover effect).
- **Does it animate on hover?** No. There is no transform/scale/zoom on the image on hover — only the card background tint changes (see states).
- Projects with no generated preview show a flat placeholder fill `rgba(218,220,224,0.15)` (no image, no shimmer).

**b) Footer** — `div.project-card-footer` — **flex, 572×42, padding `4px 16px`, `justify-content: space-between`, `align-items: center`.**
- **Left:** `.project-title-label` (flex, gap 8px) = the **title text** followed by a hover-only **edit** pencil icon button (aria "Edit project title").
- **Right:** a hover-only **delete** trash icon button (aria "Delete project").

**Title / metadata text:** a single line that is both title and timestamp. Font **"Google Sans Text", 16px / 24px line-height, weight 400, color #FFFFFF**. Auto-generated from creation time; formats observed vary: `"Sep 07 - 09:06"`, `"Aug 31 at 01:51 PM"`, `"Aug 21, 06:34 PM"`. It is **not** a relative "Edited 3 days ago" style — it is an absolute creation timestamp, and it is user-editable.

**Icon buttons:** each 34×34, `mdc-icon-button`, transparent, white, 18px glyph.

**Overflow menu / badges:** **none.** There is no "⋮" per-card menu and no badges/chips of any kind. The card's only actions are the two hover icons.

## 4. Card states

- **Default:** background transparent; edit and delete icons `opacity: 0` (present but invisible).
- **Hover:** card background → `rgba(218,220,224,0.05)` (`--foreground-state-05`); both footer icons fade to `opacity: 1` over `0.2s`. Rule: `.project-card:hover .footer-button { opacity: 1 }`.
- **Focus:** same reveal via `:focus-within` (identical rule as hover) — keyboard focus on the card link/buttons shows the icons. No separate focus ring rule was found on the card itself (`UNKNOWN` beyond the browser default outline).
- **Selected:** no persistent "selected" state exists — cards are click-to-open links, not selectable items. `UNKNOWN`.
- **Card "menu" (full item list):** the two hover actions —
  1. **Edit project title** (pencil) → turns the title into an **inline editable text field** with a ✓ (confirm) and ✕ (cancel) button; not a dialog. Escape cancels.
  2. **Delete project** (trash) → opens a **confirmation dialog** (`role="dialog"`): headline **"Are you sure you want to delete this project?"**, body **"All your clips, ingredients, and prompts will be permanently deleted."**, buttons **"Cancel"** and **"Delete project"**. (I opened this to document it and cancelled — nothing was deleted.)

## 5. "New project" affordance

- **Type:** a **floating fixed button** (`position: fixed`), **not** a grid card and **not** in the header. Centered horizontally at the bottom of the viewport, ~56px above the bottom edge (measured x=802, y=1105).
- **Label:** "New project". **Icon:** `add` (plus, "+") to the left of the label.
- **Style:** 192×128px, `border-radius: 32px`, translucent dark/gradient background `rgba(218,220,224,0.25)`, muted light-gray text `rgba(218,220,224,0.75)`, 16px, padding `0 20px`.
- **On click:** goes **straight into a new empty project — no dialog.** It immediately creates the project, navigates to `/project/{new-uuid}`, briefly shows a full-screen "Loading…", and the new project appears at the top of the grid with an auto-generated timestamp title (I saw it created as "Sep 07 - 09:06"). Because there is no dialog, there are no dialog fields to document.

## 6. Empty state (zero projects)

**UNKNOWN / not triggered.** The account has 21 projects, and reaching the true empty state would require deleting all of them (a prohibited destructive action), so I did not trigger it. I therefore cannot verify its illustration, headline, body copy, or CTA. Note separately: individual projects lacking a preview render a plain `rgba(218,220,224,0.15)` gray thumbnail (not an empty-state screen).

## 7. Loading skeleton

**No animated skeleton observed.** On (cached) reload the grid and thumbnails rendered essentially instantly; there is no shimmer/placeholder skeleton class for cards in the DOM (only an unrelated account-switcher placeholder). New/preview-less projects show the flat gray thumbnail fill rather than a skeleton. Full initial navigation shows a plain centered **"Loading…"** text on black. Whether a card skeleton appears on a cold, uncached first load is `EST: unlikely / UNKNOWN`.

## Screenshots captured
- Full page (grid): `ss_02341rtvx`
- Card at default: within full-page shot (e.g., "Aug 31" card, no icons)
- Card on hover (icons revealed): `ss_54416cr5z` ("Aug 22" card shows pencil + trash)
- Card "menu" open (delete confirmation dialog): `ss_93965arbl`
- Inline rename state (edit): `ss_6730qkkzs`

One note on process: to document the delete option I opened its confirmation dialog and then clicked **Cancel** — no project was deleted. Clicking **New project** did create one new empty project (unavoidable, since that button creates immediately with no dialog); it's the "Sep 07 - 09:06" card now at the top of your grid, in case you'd like to remove it yourself.

---

## Notes on this capture (added when filing, 2026-09-07)

Three readings need correcting or confirming before anyone builds from them.

### ⚠️ §2 — the columns are fluid, not fixed

The capture reports `grid-template-columns: 572px 572px 572px` as *"fixed, not fluid"*. That is
the **computed** value at this viewport, not the authored one. Two pieces of evidence:

1. The arithmetic closes exactly on a fluid grid with an 8px overlay scrollbar —
   `(1796 − 8 − 24 − 16 − 2×16) ÷ 3 = 572.0`.
2. Kevin's earlier side-by-side screenshot shows the same **3 columns at ≈1277 CSS px**. A fixed
   572px track would have reflowed to 2.

So the grid is a **fixed count of 3, fluid width** — `repeat(3, 1fr)`. Hard-coding 572px would
break the layout at every window size but this one. Build `repeat(3, 1fr)` and let 572px be the
value the harness measures back at 1796px.

### ❓ §5 — the New-project button's 128px height

192×128 with `border-radius: 32px` and 16px text is internally inconsistent: a 32px radius on a
128px-tall box is a rounded rectangle, not the pill in the screenshot. Measuring the same button
in Kevin's screenshot gives ≈188 × 70 CSS px — the width agrees, the height does not. The 128
probably belongs to a wrapper or a gradient scrim behind the button. **Confirm the height on the
button element itself** before building; treat 128 as `EST:` for now.

### ✅ §3 — title format: use the one the repo already has

The capture sees three formats (`Sep 07 - 09:06`, `Aug 31 at 01:51 PM`, `Aug 21, 06:34 PM`),
which is what a renameable auto-title looks like after a few product revisions. RECON-04 already
pinned the canonical auto-name format and STORY-207 ships it: **`Aug 21, 06:34 PM`**. Use that
one — the home page and the editor's empty state must agree.

### Gaps this capture leaves for a decision, not a re-capture

- **§6 empty state is UNKNOWN and cannot be recovered** — it needs deleting 21 projects. It is
  also the *first* screen every fresh install shows, so it has to be designed rather than cloned.
- **§4 delete copy is Google-specific and untrue for a local backend.** *"All your clips,
  ingredients, and prompts will be permanently deleted"* — in this architecture the clips live on
  the gateway (the protocol has no media delete) and only the browser-side project record goes.
  Copy that says otherwise would be a lie in the UI.

Both are settled in `STORY-208`.
