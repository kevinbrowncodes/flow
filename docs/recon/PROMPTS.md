# Recon Prompts — Google Flow UI

**Renumbered 2026-08-21 into execution order.** Run them top to bottom; MVP-blocking missions
come first, post-MVP ones last.

| # | Mission | When | Blocks |
|---|---------|------|--------|
| **RECON-01** | Site map & surface inventory | ✅ **DONE** 2026-08-21 | surface inventory |
| **RECON-02** | Implementation fingerprint | 🔜 **NEXT** · decides our stack (STORY-100) | STORY-100 (stack) |
| **RECON-03** | Design tokens | **highest value** · run `capture-tokens.js` alongside | STORY-101 (tokens) |
| **RECON-04** | Project editor — THE MVP | **the release target** (D8) | STORY-201 → 308 |
| **RECON-05** | States, motion & micro-interactions | before Phase 4 | STORY-401 (motion) |
| **RECON-06** | Accessibility | before Phase 4 | STORY-402 (a11y) |
| **RECON-07** | Home header & app shell | ⏸ post-MVP | post-MVP home |
| **RECON-08** | Project gallery / home | ✅ 2026-09-07 | STORY-208 |
| **RECON-09** | Media editor & timeline | ⏸ post-MVP | post-MVP media editor |

<details>
<summary>Old → new numbering (earlier results keep their original filenames)</summary>

| Old | New |
|---|---|
| RECON-01 site map | **RECON-01** (unchanged) |
| RECON-09 fingerprint | **RECON-02** |
| RECON-02 tokens | **RECON-03** |
| RECON-05-MVP editor | **RECON-04** |
| RECON-07 states/motion | **RECON-05** |
| RECON-08 accessibility | **RECON-06** |
| RECON-03 app shell | **RECON-07** |
| RECON-04 dashboard | **RECON-08** |
| RECON-06 media editor | **RECON-09** |
| RECON-00 / 00b screenshots | **OBS-01 / OBS-02** |

</details>

Copy each block below into the **browser-extension Claude** while it is on the live Flow app.
Paste the reply back to me, or drop it straight into `docs/recon/results/RECON-0N-*.md`.

**Before starting:**
1. Be signed in to Flow.
2. Have **one project open that already contains generated clips** — otherwise RECON-08 → 07
   return empty shells.
3. Run `docs/recon/capture-tokens.js` in DevTools console on each major screen first
   (see `docs/recon/README.md`). That gives measured ground truth; the prompts below give
   the narrative around it.

**Rules to keep in every prompt** (they're embedded already, don't strip them):
- Report **measured** values, not remembered ones.
- Write `UNKNOWN` rather than guessing. A guess that reads as fact costs us a whole story.
- Prefer numbers, hex codes and px over adjectives.

## Capture conditions

Only two things actually matter:

1. **The icon rail must be visible.** Flow has a responsive breakpoint — below roughly 700px CSS
   it switches to a narrow layout with no rail. That's a different page from the one we're
   building, so anything measured there describes the wrong thing.
2. **We must know the exact viewport width and DPR**, because the pixel diff compares our render
   against the reference screenshot. If they're different sizes, every pixel is offset and the
   diff is noise. The specific number is arbitrary; *matching* is not.

**The easy path:** maximize the browser window, close the Claude side panel, and run
`console.log(innerWidth, innerHeight, devicePixelRatio)`. Record those numbers in
`STATUS.md` and configure the diff harness (STORY-104) to match. Kevin's display gives
**1795 × ~1500 at DPR 2**, which is comfortably in the desktop layout.

**The portable path — only if references need to reproduce on another machine:** DevTools device
emulation (`Cmd+Opt+I` → `Cmd+Shift+M` → Responsive → 1440 × 900 → DPR 1 → zoom "Fit to window").
This makes the page compute at 1440×900 on any display, including HiDPI screens where the real
window caps out around 720px CSS. Verify with `innerWidth === 1440`.

Either way:

- **Claude side panel closed** — it takes ~500px off the viewport and reflows the app
- Page **scrolled to top** unless capturing a scrolled state
- Nothing hovered or focused unless that *is* the state being captured
- Filename: `<screen>-<state>.png` → `editor-default.png`, `editor-tile-hover.png`
- Take the matching `capture-tokens.js` dump at the same viewport, same session

A shot taken at a different width than the build renders at is not a reference.

## States a populated account will **not** show you

Recon runs on a paid account with many existing generations. That's ideal for RECON-08 → 07 —
real cards, real timeline, real clip counts. It also makes four states invisible, and every one
of them is a story we'd otherwise ship broken:

| Blind spot | How to get it |
|---|---|
| **Empty project** | Create a brand-new empty project. Screenshot it *before* generating anything — this is the editor's day-one state and it's the first thing anyone sees. |
| **Empty dashboard** | Can't be reached without a fresh account. Capture whatever partial empties exist (a filter with no results, an empty ingredients panel) and note the rest as UNKNOWN. |
| **First-run onboarding** | Already dismissed on this account. Check for a "restart tour"/help-menu entry; if there isn't one, mark UNKNOWN — don't invent it. |
| **Free-tier gating** | A paid account hides upsells, locked models and quota-exhausted states. Record any gating still visible (premium badges, disabled options) and flag the rest as out of reach. |

Do the empty-project capture **first**, while you're creating it — once you generate into it,
that state is gone for good.

**Before pasting dumps into the repo:** `capture-tokens.js` reads visible text and aria-labels,
which on a signed-in account includes your email, display name and project titles. It strips
emails automatically; add anything else to the `REDACT` list at the top of the file.

---

---

## RECON-01 — Site map & surface inventory  ·  ✅ **DONE** 2026-08-21

```text
You are doing UI reconnaissance on the Google Flow app (labs.google/fx/tools/flow) so that a separate
engineer can rebuild its interface from scratch. You are documenting layout and interaction
only — no code is being copied.

Explore the app and produce a complete SITE MAP. For every distinct screen, panel, drawer,
modal, popover and menu you can reach, report:

- Name (what a user would call it)
- URL / route pattern if it has one
- How you got there (exact click path from the app home)
- Its purpose in one sentence
- Whether it is a full page, a panel, an overlay, a popover, or a context menu
- Any state variants you observed (empty, populated, loading, error, first-run)

Then list, separately:
- The top-level navigation items, in visual order
- Anything gated, disabled, or behind a paywall/feature flag, and how that gating is shown
- Any surface you could see referenced but could NOT reach, and why

Rules: report only what you actually observed in this session. Write UNKNOWN where you are
unsure. Do not describe features from memory or from marketing pages. Output as markdown with
a table for the site map. End with a numbered list of the 5 screens you consider most central
to the product.
```

---

## RECON-02 — Implementation fingerprint  ·  🔜 **NEXT** · decides our stack (STORY-100)

> Mostly answered by `capture-tokens.js` §7. Run this prompt for the parts a script can't see.

```text
I need to identify how the Google Flow web app is built, so that a rebuild can use a compatible
architecture rather than fighting it. This is black-box observation of a shipped page — reading
what the browser already exposes. Report only what you can actually verify.

**Framework.** From DevTools (Elements, Sources, Network, and any framework devtools panel that
lights up): which UI framework is this? Look for React roots and hook internals, Angular's
ng-version / _nghost / _ngcontent attributes, Lit or other custom elements with a dash in the tag
name, or Google's internal Wiz/JSAction wiring (jsaction / jscontroller / jsname attributes). Say
which of these you see and quote the actual attributes or globals that led you there. If it looks
like several, say so — Google Labs products often mix.

**CSS architecture.** Inspect the class names on a dozen different elements across screens:
- Are they short hashes (`x8f2q`), utility classes (`flex items-center gap-2`), BEM-ish
  (`card__title--active`), CSS-module style (`Card_title__x8f2q`), or human-readable semantic names?
- Roughly how many classes does a typical element carry?
- Is styling inline on elements, in <style> tags, or in external stylesheets?
- Are CSS custom properties used? If so, quote 10 real ones with their names and values, and say
  where they are defined (:root? a theme wrapper? per-component?).
- Is there any sign of a design-system library — Material Web / MDC class prefixes, shadow DOM
  boundaries, or Google-internal component tags?

**Typography.** From Network → Font, or DevTools → Rendered Fonts: exactly which font files load,
their family names, weights, formats, and where they are served from. State the exact family name
used for UI text and whether it is a Google-proprietary face.

**Layout technique.** For the main app frame and the results grid: is it flexbox, CSS grid, or
absolute positioning? Quote the actual grid-template or flex declarations. Note any container
queries, any `dvh`/`svh` units, and how scroll containers are set up.

**Media.** How is generated video delivered and played — <video> element, canvas, HLS/DASH, blob
URLs? What poster/thumbnail strategy is used? Are there srcset/multiple resolutions?

Output as markdown, one section per heading above. For each conclusion give the evidence you saw.
Where the page is minified past the point of telling, write UNKNOWN — a wrong stack call costs us
the whole design-system phase.
```

---

## RECON-03 — Design tokens  ·  🔜 **NEXT** · run `capture-tokens.js` alongside

> Rewritten after RECON-02. **Already known — do not re-derive:** font is `Google Sans Text`,
> icons are Material Symbols ligatures, layout is flexbox, `--header-height: 76px`,
> `--grid-gap: 16px`, collapsed rail `64px`, glass blur `80px`, tile `aspect-ratio: 1.77778/1`,
> body `16px/400`, buttons `11px/500`. This mission fills the **gaps**: color, the full type
> ramp, radii, shadows, spacing and motion.

**Run the console script first.** On the editor page at 1440×900 DPR 1, Claude panel closed:
open the settings popover, the asset picker and a menu **before** running `capture-tokens.js` —
styled-components only injects CSS for mounted components, so anything closed is invisible to it.
Save as `results/tokens-editor.json`.

```text
I am extracting the exact visual design tokens of one screen in the Google Flow app so it can be
rebuilt pixel-for-pixel: the project editor at labs.google/fx/tools/flow/project/{id} — icon rail,
media grid, right details panel, floating prompt composer.

I already know the font is "Google Sans Text", icons are Material Symbols, the header is 76px, the
grid gap is 16px and the collapsed rail is 64px. Don't re-derive those. I need everything else,
measured from DevTools computed styles rather than estimated by eye.

**COLOR.** Every distinct color on this screen as hex or rgba, each labelled by role:
page background · media-grid background · details-panel background · icon-rail background ·
composer background (including its translucency and exact backdrop-filter value) · top-bar
background · tile background before the video loads · every border and divider color · primary
text · secondary/muted text (the metadata lines) · disabled text · placeholder text · the accent
color used by the send button and any active control, with its hover and disabled variants ·
focus-ring color · any destructive/error color you can surface. State whether the app is
dark-only or themed.

**TYPE RAMP.** Every distinct combination of font-size / weight / line-height / letter-spacing on
this screen, each labelled by what uses it: project title, search placeholder, tile overlay text,
details-panel prompt text, details-panel metadata lines, composer placeholder, model chip label,
button labels, sidebar labels when expanded, footer disclaimer. Give px values, and include
letter-spacing even when it's 0 — under a pixel-exact rebuild that matters.

**SHAPE.** Every border-radius on the screen and what it applies to: media tiles, composer,
popovers, buttons, the model chip, the active rail item, the search field, thumbnails. Every
box-shadow verbatim. Every border-width and color. Note anything using an outline instead of a
border.

**SPACING.** The padding inside: the composer, the details panel, a popover, the top bar, a rail
item, the search field. The gaps between: details-panel metadata lines, composer controls, top-bar
elements, the action-icon group. The page's outer padding on each side. Report actual computed
values, including odd ones — a measured 4.8px is more useful to me than a tidy 5px.

**MOTION.** Time and describe: rail item hover, tile hover, button hover, popover open and close,
the composer's focus transition, and any scroll-fade behavior on the grid (there's a
--mask-gradient variable, so something is masked — what, and does it animate?). For each: duration
in ms, easing function, and exactly which properties animate. Say if anything looks like a spring
rather than a curve.

**GLASS.** The composer and some panels use backdrop-filter with an 80px blur. Report the full
filter value, what background color sits under it, whether there's a border or inner highlight on
those surfaces, and whether any noise or gradient overlay is involved.

Output as markdown, one table per section: Token | Value | Applied to | Confidence. Read real
computed values wherever possible. Prefix estimates with EST:. Write UNKNOWN rather than guessing
— every value here becomes an acceptance criterion.
```

---

## RECON-04 — Project editor — THE MVP  ·  **the release target** (D8)

> Rewritten 2026-08-21 to target one page: `/fx/tools/flow/project/{uuid}`.
> This is the MVP (D8). Everything here becomes an acceptance criterion, so depth beats breadth.

```text
I am rebuilding one screen of the Google Flow app from scratch: the project editor at
labs.google/fx/tools/flow/project/{id} — the page with the left icon rail, the grid of generated
video tiles, the details panel on the right, and the floating prompt box at the bottom. Open a
project that already contains generated clips and document that page exhaustively. Layout and
interaction only — no code is being copied.

Work through these in order. Verbatim labels, measured pixels, UNKNOWN where unsure.

1. REGIONS. The four regions and their exact dimensions: icon rail width, details panel width,
   composer width/height, and the grid area between them. Which regions scroll independently?
   Does the details panel scroll with the grid or on its own? Is the composer fixed to the
   viewport or does it scroll away? Give the page padding and the gaps between regions.

2. ICON RAIL. Its width, background, and every item top to bottom with the icon it uses and
   where it navigates. The ACTIVE item's exact treatment — background color, shape, size, radius,
   and how it differs from inactive. Hover and focus treatment for a rail item. What the
   separator between groups looks like. Then click the expand control: report the expanded
   sidebar's width, the label text for every item, the spacing between icon and label, and how
   the active state renders once there's a label. Screenshot both states.

3. TOP BAR. Height, background, whether it's sticky. Every element left to right with size and
   spacing: back arrow, project title (is it editable inline? what happens on click?), the ⋮ next
   to it, the search field (width, placeholder text, focused appearance), the filter button, then
   the right cluster (+, help, gear, ⋮, ULTRA badge, avatar). Open the ⋮ next to the title and
   list its items verbatim.

4. THE GRID. Tile aspect ratio, exact width and height, corner radius, and the gap between tiles.
   How many columns at your window width — state the width. Then change Grid Size (gear → S/M/L)
   and report the column count and tile size for each. Describe the play button on each tile:
   size, position, background, opacity. Are tiles grouped into batches? If so, what visually
   separates one batch from the next, and how many tiles per batch?

5. TILE INTERACTION — important, I have no data on this. Hover a tile: does it play? Does audio
   start (there's a "Sound on hover" setting)? What controls or overlays appear, and where? Does
   it scale, brighten, or show a border? Click a tile: what is selected, what changes visually,
   and does the details panel change? Right-click it and list any context menu items verbatim.

6. DETAILS PANEL — resolve this first: is there ONE entry per generation batch, or does the panel
   show details for the currently SELECTED tile? Try clicking different tiles and watching the
   panel. Then document one entry completely: the three action icons at the top (what does each
   do — hover for tooltips), the prompt text and its truncation behavior (click the chevron —
   what expands?), the reference-image thumbnail (size, what happens when clicked), and every
   metadata line in order with its exact label format. Note the text sizes and colors used.

7. COMPOSER. Exact size, position, background (is it translucent — what blur?), radius, border.
   The placeholder text verbatim. Does the textarea grow as you type, and to what maximum? Then
   each control: the + button (open it — what's in the asset picker? list every tab and its
   contents), the Agent pill (what changes when toggled on?), the model chip (open it — the full
   output settings popover: Image and Video tabs, every model in EACH tab, every aspect ratio,
   the count options, and where the credit cost appears and how it's worded), and the send button
   in idle, hover, disabled and busy states. What disables send?

8. GENERATION LIFECYCLE — I have no data and this is critical. Submit a real generation and
   describe every stage: what happens the instant you hit send (does the prompt clear? there's a
   "Clear prompt on submit" setting), where the pending item appears in the grid, what a pending
   tile looks like (skeleton? spinner? progress bar? percentage? the prompt text?), how it
   transitions to the finished video, and whether the details panel populates before or after.
   Time it roughly. If you can trigger a failure, document the error state and any retry.

9. EMPTY STATE. Create a NEW empty project and screenshot it before generating anything — the
   grid, the details panel and the composer with no content. Report any illustration, headline or
   body copy verbatim. This state is unreachable once you generate, so capture it first.

10. SCROLLING. Scroll the grid to the bottom. Does anything load lazily? Does the top bar or
    composer change? Report the footer text verbatim.

Screenshots at 1440x900, DPR 1, Claude side panel CLOSED, named per screen-state-1440.png:
editor-default, editor-sidebar-expanded, editor-tile-hover, editor-tile-selected,
editor-settings-open, editor-asset-picker, editor-generating, editor-empty.
```

---

## RECON-05 — Gap closer  ·  🔜 **NEXT** · unblocks STORY-301, resolves C1–C3

> Rewritten after RECON-04. Motion is already measured (RECON-03) — **do not re-derive it**.
> This mission closes 11 specific gaps. Short, targeted, high value.

**Two techniques that get past the frozen mouse:**

1. **DevTools force-state** — Elements panel → right-click the node → *Force state* → `:hover` /
   `:focus` / `:active`. Paints the real CSS state with no mouse required. This resolves every
   *styling* question below.
2. **Kevin does it manually** — for the behavioral questions (does hover play video, does audio
   start, what does clicking select), a human hovering for two seconds answers what no synthetic
   event will. Those are marked 👤 below.

```text
I'm closing specific gaps in an earlier UI recon of the Google Flow project editor
(labs.google/fx/tools/flow/project/{id}). Motion timings and design tokens are already measured —
don't re-derive them. Answer only these eleven items, in order, and say UNKNOWN if a technique
doesn't work rather than inferring.

Use DevTools "Force state" (Elements → right-click node → Force state → :hover / :focus / :active)
wherever a real mouse is needed — it paints the actual CSS state without pointer events.

CONFLICTS TO RESOLVE
1. Rail item hover. One recon read the hover background as rgba(218,220,224,0.15) from a
   --sidebar-item-hover-bg variable; another read the applied rule as 0.25, identical to the
   active state. Force :hover on a NON-active rail item and report the computed background-color.
   Then confirm whether --sidebar-item-hover-bg is actually consumed or overridden. If hover and
   active really are identical, say so explicitly — that would mean the rail has no hover
   feedback, which is worth knowing.
2. Composer placeholder font-size. One recon says 14px, another 16px. Report the computed
   font-size, weight and line-height of the placeholder element specifically, and separately of
   the contenteditable div it sits in — they may differ, which would explain the disagreement.
3. Project title element. Confirm it is a div rather than an input, then click ⋮ → Rename and
   describe exactly what changes: does it become an input in place, what are its dimensions and
   styling while editing, and how is the edit committed (Enter? blur? a button?).

STYLING GAPS — use Force state
4. Send button, enabled + :hover. Type text so it enables, force :hover, report the computed
   background-color and icon color.
5. Send button while a generation is running. Does it show a busy/loading state, become
   disabled, or stay unchanged? Report the computed styles for whatever it does.
6. Focus states. Force :focus-visible on the search input, a rail item and the composer. An
   earlier recon found outline:none globally — confirm whether ANY visible focus indicator
   exists, and if so its exact treatment.
7. Popover open/close animation. Not readable as a transition on the container. Check for a CSS
   @keyframes animation on the popover or its wrapper, or a mount animation in the injected
   styled-components rules. Report the animation-name, duration and timing-function if present.
   If genuinely absent, say UNKNOWN.

MEASUREMENT GAPS
8. Rail group separator. Its color measured as rgb(232,234,237) — full-opacity light grey on
   black, which seems too bright for a divider. Report its computed border-color, opacity, and
   the element's own opacity, so we know what actually paints.
9. Tiles-area arithmetic. The tiles column measured 772px wide, but two 358px tiles with a 16px
   gap totals 732px. Where do the extra 40px go — padding on the column, a margin, a third
   element? Report the box model of the tiles container and of one tile.
10. Composer growth. Paste a very long prompt (300+ words) into the composer. Report the maximum
    height it reaches, whether the input scrolls internally past that, and whether the composer
    stays pinned to the same bottom offset as it grows.
11. Failure state. Only if you can trigger one harmlessly — do NOT waste credits deliberately.
    If a generation has failed in this project's history, describe the failed tile's appearance
    and any retry affordance. Otherwise UNKNOWN.

For each item give the technique used and the computed values you read. Verbatim labels.
```

**👤 Kevin's two-minute manual check** — these need a real human pointer:

```
Hover a media tile for ~3 seconds without clicking, and tell me:
  a. Does the video start playing on hover?
  b. Does audio play? ("Sound on hover" is On in View Settings)
  c. What controls appear, and where on the tile?
  d. Does anything animate in, or does it just appear?

Then click a tile once (not double) and tell me:
  e. Does it navigate away, or select in place?
  f. If it selects — what changes visually? An outline? A checkmark? Does the details column react?

Then right-click a tile:
  g. Native browser menu, or a custom Flow menu? If custom, list the items.
```

---

## RECON-06 — Accessibility  ·  before Phase 4

> Responsive/mobile recon was **cut (D4)** — we're building desktop-only at 1440px.

```text
Document how the Google Flow app behaves for keyboard and assistive-technology users, at a
desktop window width of 1440px.

Tab through the main screens and report: the focus order, whether focus is visible at every
stop and what the focus indicator looks like (color, width, offset, radius), whether focus is
trapped correctly inside dialogs and popovers and returned to the trigger on close, and whether
Escape closes overlays.

Note any aria-labels, roles, or landmark elements you can read on key controls — especially
icon-only buttons, which need accessible names. Report any obvious contrast problems on
secondary text, placeholder text, or against the accent color.

List every keyboard shortcut you can find, and how you discovered it (a shortcuts panel, tooltips,
or trial and error). UNKNOWN where unsure.
```

---

## RECON-07 — Home header & app shell  ·  ⏸ post-MVP

```text
Document the persistent chrome of the Google Flow app — everything that stays on screen as a
user moves around — in enough structural detail that an engineer can rebuild it without seeing it.

For the top bar / header: its exact height, background, border or shadow, whether it is sticky,
and every element in it from left to right. For each element give: what it is (logo, project
name, button, icon, avatar, counter…), its label text verbatim, its icon if any, its size, and
what happens on click and on hover.

Do the same for any sidebar, left rail, or persistent panel: width, whether it collapses, what
the collapsed state looks like, and every item in visual order.

Then, for each menu/popover reachable from the chrome (project switcher, account menu, settings,
help, any overflow "…" menu): list every item in order with its exact label, icon, any keyboard
shortcut shown, any submenu, and any separator or section heading.

Also report: how the credit/quota indicator is presented (exact format of the number and label),
how the project title is edited, whether there is a search, and where notifications or toasts
appear on screen (which corner, what width, how long they stay).

Describe layout structurally — flex row/column, alignment, gaps in px, what grows vs. stays
fixed. Verbatim label text matters; do not paraphrase it. UNKNOWN where unsure.
Take screenshots of the top bar and any sidebar, both in default and expanded/open states.
```

---

## RECON-08 — Project gallery / home  ·  ⏸ post-MVP

```text
Document the Google Flow projects home screen (the grid or list of a user's projects) so it can
be rebuilt from scratch.

Report:
- The page header: title text, any subtitle, buttons on the right, sort/filter/view controls
  (exact labels and default values)
- The layout: grid or list, number of columns at your current window width (state that width),
  card width and height in px, gap between cards, page padding
- The project card, in full: what's inside it, in what order — thumbnail/preview (aspect ratio,
  does it animate on hover?), title, metadata line (exact format, e.g. "Edited 3 days ago"),
  overflow menu, badges. Give the internal padding and the text roles used.
- Card states: default, hover, focus, selected, and the card menu's full item list
- The "new project" affordance: is it a card in the grid, a header button, or both? Exact label,
  icon, position. What happens on click — dialog, or straight into an empty project? If a dialog,
  document every field in it.
- The empty state, if you can see or trigger one: illustration, headline, body copy verbatim, CTA
- Any loading skeleton you catch while the page loads

Take screenshots: full page, one card at default, one card on hover, and the card's open menu.
Report measured px where possible; prefix estimates with EST:. UNKNOWN where unsure.
```

---

## RECON-09 — Media editor & timeline  ·  ⏸ post-MVP

```text
Document Google Flow's scene/timeline surface and its video player so they can be rebuilt.

**Timeline / scenebuilder:** where it sits and its height. Whether clips are shown as thumbnails,
filmstrips, or blocks — and their exact dimensions and spacing. Whether there is a time ruler,
and if so its units and tick labels. Whether there is a playhead, and what it looks like.
Whether clips can be dragged, trimmed, or reordered, and what the drag affordance and drop
indicator look like. What the insertion point between two clips looks like, if there is one.

**Per-clip controls on the timeline:** every button or menu item available on a clip, with exact
labels — especially anything like "extend", "jump to", "add to scene", "remove", "replace",
"duplicate", "download". Describe what each one opens.

**Extend / continuation flow:** if the app can extend a clip or continue from its last frame,
walk through it and document every step, dialog and input.

**Player:** its size and position, the aspect-ratio letterboxing behavior, and every transport
control in order (play/pause, scrub bar, time display format, volume, fullscreen, download,
speed…). Whether controls auto-hide, and after how long. What the scrub bar looks like —
track height, thumb, buffered vs. played colors. Whether hover-scrubbing previews frames.
Any keyboard shortcuts you can discover, with what they do.

Screenshots: the timeline at rest, a clip hovered, a clip's menu open, the player with controls
visible, and any extend dialog.
Measured px where you can. UNKNOWN where unsure.
```

---

## After recon

Paste results back. I will:
1. File them under `docs/recon/results/`.
2. Lock the surface inventory in `EPIC-001` §5.
3. Write `docs/stories/STORY-1xx…` with real acceptance criteria and measured values baked in.

---

## RECON-10 — Agent mode  ·  🔜 requested 2026-09-07

**Why this one is different.** Every other mission documents *appearance*. This one documents
*behaviour*: what the agent can be asked, what it answers, and whether it generates on its own.
The pill's geometry is already measured (RECON-04 §7) — do not re-measure it. Answer the
behaviour questions even if the visual ones are quick.

**Before you start:** open a project that already has clips in it, so the agent has context to
work with, and be prepared to let it actually run at least once.

```text
Document Google Flow's **Agent mode** — the "Agent" pill in the prompt bar — so it can be
rebuilt. I care much more about what it DOES than what it looks like.

Turn it on and report, in this order:

WHAT CHANGES ON SCREEN
- Everything that appears, disappears or moves when the pill is toggled on, and again when it is
  toggled off. I already know the pill fills white and the model chip disappears — confirm that
  and list what else changes.
- The two new controls that appear next to it (one looks like a media icon, one like
  tune/sliders): open each, and list every option inside with exact labels and defaults.
- The fullscreen-expand icon at the composer's top-right: what does the expanded view look like?
  Full page or overlay? What is in it that is not in the collapsed composer? Screenshot it.
- Does the input change (placeholder text, size, multi-line, attachments allowed)?

WHAT IT ACTUALLY DOES — the important part
- Ask it something real, e.g. "make me a 3-shot sequence of a car driving into a tunnel at dusk".
  Paste its FULL reply verbatim.
- Does it reply in prose, a plan, a list of shots, or something structured? Does it ask
  clarifying questions before doing anything?
- Does it generate media itself, or only propose and wait for you to approve? If it generates:
  how many clips, do they appear as normal tiles/batches in the same grid, and is the prompt it
  used for each one visible anywhere?
- Can you correct it mid-conversation ("make shot 2 slower") and does it revise rather than start
  over? Try it and paste what happens.
- Can you attach a reference image or an existing clip to an agent turn? How?
- Does it use the output settings (aspect, model, count) or override them?

THE CONVERSATION ITSELF
- Is there a visible transcript? Where does it live — in the composer, a side panel, the grid?
- Does the conversation persist if you reload the page? If you leave the project and come back?
  Is it per-project or global?
- Can you have more than one conversation? Start a new one? Delete one?
- Is there any indication of which model answers (a name, a badge, a settings entry)?

LIMITS AND FAILURES
- What does it cost in credits, if it says?
- What happens if you ask for something it cannot do? Paste the refusal or error verbatim.
- Is there a rate limit, a turn limit, or a spinner/streaming indicator while it thinks? Does the
  reply stream token by token or arrive at once?

Verbatim text matters everywhere — do not paraphrase its replies. UNKNOWN where unsure.
Screenshots: pill off, pill on, each new control open, the expanded view, and the conversation
mid-reply.
```
