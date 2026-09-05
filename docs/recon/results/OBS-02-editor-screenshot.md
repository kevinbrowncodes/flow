# OBS-02 — Project editor screenshot (THE MVP)

**Source:** screenshot shared 2026-08-21. Claude side panel **closed** — this is a clean capture.
**URL:** `labs.google/fx/tools/flow/project/a88beb70-4eb5-454a-8e3e-51ec771e5419`
→ `projectId` is a **UUID v4**. Mock data must use UUIDs, not slugs or ints.

**Geometry confidence:** original 3590px wide at DPR 2 → window ≈ **1795 CSS px**. All px below
are **EST**, derived by scaling from that assumption. They're a sanity check for the
`capture-tokens.js` dump, *not* a substitute for it. Authoritative capture still needed at 1440×900.

---

## Layout — three columns + floating composer

```
┌──┬────────────────────────────────────┬──────────────┐
│  │  top bar: ← title ⋮  [search] [⚲]   + ? ⚙ ⋮ ULTRA ●│
│ra├────────────────────────────────────┼──────────────┤
│il│  ┌────────┐  ┌────────┐            │ ⤓ ↺ 🗑        │
│  │  │ tile   │  │ tile   │            │ prompt text… │
│  │  └────────┘  └────────┘            │ [thumb]      │
│  │  ┌────────┐  ┌────────┐            │ Created …    │
│  │  │ tile   │  │ tile   │            │ Omni Flash   │
│  │  └────────┘  └────────┘            │ 16:9 / 10s   │
│  │       ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁              │ 720p         │
│🗑 │      │ composer (float) │          │              │
│▣ │       ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔              │              │
└──┴────────────────────────────────────┴──────────────┘
```

| Region | EST width | Notes |
|---|---|---|
| Icon rail | ~44px | **Collapsed** in this capture — expanded state not yet seen |
| Media grid | fills remaining | 2 columns at this window width |
| Details panel | ~400px | Fixed right column, dark, no visible divider |
| Composer | ~600px | Floating, horizontally centered **over the grid**, not full width |

## Top bar (left → right)

`←` back · **`Aug 21 at 10:58 AM`** (project title, timestamp-named) · `⋮` ·
— centered — search pill (magnifier, no visible placeholder) · filter button (funnel, separate
rounded button) ·
— right — `+` · `?` help · `⚙` gear · `⋮` · `ULTRA` badge · avatar

Confirms RECON-01's ordering exactly. Search is a **pill, dark fill**, EST ~480px wide.

## Icon rail (top → bottom)

| # | Icon | Target | State |
|---|------|--------|-------|
| 1 | grid / squares | All Media | **ACTIVE — filled rounded-square background** |
| 2 | image | Images | |
| 3 | video camera | Videos | |
| 4 | person, arms out | Characters | deferred (D6), renders inert |
| 5 | clapperboard | Scenes | |
| 6 | folder + up-arrow | Uploads | |
| — | *separator rule* | | |
| 7 | sparkle / dots | Tools | deferred (D6), renders inert |
| … | *(spacer)* | | |
| 8 | trash | Trash | deferred (D6), renders inert |
| 9 | panel-expand | Expand sidebar | Toggles to labeled sidebar |

Active state = **filled rounded-square behind the icon**, lighter than the rail. That's the one
selected-state treatment we must get exactly right — it repeats on every nav item.

## Media grid

- **2 columns** at ~1795px. Column count vs. width UNKNOWN — the gear's Grid Size S/M/L also
  affects this.
- Tiles 16:9, rounded corners (EST ~12px), EST ~619px wide, gap EST ~15px (likely 16)
- Small **circular play button, top-left** of each tile — inset EST ~12px
- No visible per-tile overflow menu at rest → hover-only. Unconfirmed.
- Tiles appear grouped in **2×2 batches**, each batch aligned with one details-panel entry

## Details panel (right)

Two entries visible, both identical in structure:

1. **Action row** — three icon buttons in a grouped rounded container: download `⤓`,
   re-run/revert `↺`, delete `🗑`
2. **Prompt text**, 2 lines then `...` truncation, with a `⌄` chevron at right to expand
   > "A muscular young man in a lush garden checks his physique in a raw, candid documentary style."
3. **Reference image thumbnail** — small rounded square, EST ~56px. This was an **image→video**
   generation, which maps cleanly onto local i2v models
4. **Metadata**, muted small text, in order:
   - `Created Aug 21, 2026`
   - `Omni Flash`  ← model
   - `▭ 16:9`  ← aspect ratio, with a small frame icon
   - `Video length: 10s`
   - `Resolution: 720p`

## Composer (floating, bottom center)

- Rounded rect, dark **translucent** fill, EST ~600×95px, centered over the grid
- Placeholder: **`What do you want to create?`**
- Bottom row, left: `+` icon button · `Agent` pill toggle (deferred by D6, still renders)
- Bottom row, right: model chip **`🍌 Nano Banana 2  ▭ x2`** · circular `→` send button
- Chip packs *four* things: model icon, model name, aspect icon, output count

**Note the mismatch:** the chip reads `Nano Banana 2` (an **image** model) while the clips on
screen were made with `Omni Flash` (a **video** model). So the chip shows the *current* output
setting, not what produced the visible media — the settings popover's Image/Video tab is
currently on Image. Our mock state must model these independently.

## Footer

`Google Flow can make mistakes, so double check it` — small muted text, bottom left.

## Open questions for the targeted recon

1. **Details panel binding** — is one entry per generation *batch* (aligned to its first row), or
   per *selected* tile? Two competing hypotheses; this changes the whole data model.
2. Batch size looked like **4** tiles, but the chip says `x2`. Is the chip current-setting only?
3. **Tile hover** — what appears? Play-on-hover (gear has "Sound on hover")? Action buttons?
4. **Expanded sidebar** — widths, labels, and how the active state renders with a label.
5. **Generation lifecycle** — completely unobserved. What does a pending tile look like?
6. Does the details panel scroll with the grid, or independently?
7. Empty project state — what's here before any generation?
