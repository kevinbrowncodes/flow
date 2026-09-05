# OBS-01 — Observations from Kevin's screenshot

**Source:** screenshot shared 2026-08-21, mid-RECON-01. Chrome, macOS, Claude side panel docked.
**Confidence:** everything here is read off a scaled screenshot. **Labels are reliable; every
pixel value is UNKNOWN** until `capture-tokens.js` runs. Superseded by RECON-01/03/04.

## Route correction ⚠️

Actual URL: **`labs.google/fx/tools/flow`** — not `labs.google/flow` as the prompts assumed.
(The captured URL carried `?gad_source=…&gclid=…` ad params; those are not part of the route.)
Flow lives under the **Google Labs "FX" tools** umbrella, which likely means shared Labs chrome.
Corrected in `PROMPTS.md`.

## Top bar (left → right)

| Element | Detail |
|---|---|
| `Google Flow` | Wordmark, plain text, far left |
| `▶ Flow Music` | Pill button, outlined, play glyph — **out of scope (D4)** |
| `🖥 Flow TV` | Pill button, outlined, monitor glyph — **out of scope (D4)** |
| Discord / Instagram / X | Three icon-only buttons — **out of scope (D4)** |
| Help | Icon-only circular button; appears **highlighted/active while its popover is open** — capture that active treatment |
| `⋮` | Overflow menu, contents UNKNOWN |
| `ULTRA` | Subscription tier badge, pill, uppercase, light fill |
| Avatar | User account, circular, far right |

Right cluster is pill-shaped buttons + icon buttons in a single row. Gaps UNKNOWN.

## Promo banner

Full-width blue bar directly under the top bar. Bold lead-in + regular body:
`Daily Bonus: Enjoy 50 extra credits until August 31st! (Resets daily)`
Dismiss `✕` at far right. Dismissible → needs a dismissed state in our build.

## Hero carousel

- Large rounded card spanning the content width, video/image background
- Headline `Introducing Gemini Omni Flash` — large, two lines, light weight
- Body `Cinematic realism, powerful editing, world knowledge: try our latest video generation model!`
- CTA `Try Omni now` — white pill, dark text
- Pagination: ~5 short dashes bottom-left, second one active (wider/brighter)
- Auto-advancing? UNKNOWN — RECON-05 should time it

## Project grid

- **3 columns** at the observed width (window was squeezed by the Claude panel — see Warning)
- Landscape thumbnails, roughly 16:9, rounded corners
- **Caption below each card is a timestamp**, not a name: `Aug 21 at 10:58 AM`, `Aug 20 at 10:07 AM`
  → projects appear to be **auto-titled by creation time**. Confirm in RECON-08 whether they can
  be renamed, and what the format is for older items (does it become a date? "3 days ago"?)
- No visible per-card overflow menu at rest → likely hover-only. Confirm in RECON-08.

## New project

Floating pill button, **centered near the bottom of the viewport**, dark translucent fill,
`+ New project`. Not a header button and not a card in the grid — a floating action. Whether it
sits above the grid on scroll (fixed) is UNKNOWN.

## Help popover (open in the screenshot)

Anchored below the help icon, dark rounded panel.

- Header: `Help` centered, `✕` right
- Section label: `Popular help resources`
- Items, each with a document icon, in order:
  1. `Get started with Google Flow`
  2. `Manage your Google Flow credits`
  3. `Create videos in Google Flow`
  4. `Learn about Google Flow models & supported features`
  5. `Edit videos & build scenes in Google Flow`
- `🔍 Search Help` — an input, filled darker than the panel
- Separator, then `Send feedback` with icon, rendered in **blue** (only colored item in the menu)

## Theme

Dark, near-black page. App content sits inside a **large rounded container with a visible warm/
orange-tinted border** inset from the window edge — the page background is *outside* that
container. Unusual and distinctive; confirm the radius, border color and inset in RECON-03.

## Open questions this raises

1. Project titles: auto-generated timestamps, or is a name shown once set?
2. Where do credits appear? The banner mentions them but no counter is visible — behind the
   avatar or `⋮` menu?
3. Does the `ULTRA` badge change per tier, and is it a button or just a badge?
4. Is the rounded-container-with-border frame present on every screen, or only the home page?
