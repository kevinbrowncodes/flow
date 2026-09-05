# RECON-04 — Project editor (the MVP)

**Captured:** 2026-08-21 · emulated **1440×900**, `innerWidth` confirmed 1440, rail visible.
All values are computed CSS px unless prefixed `EST:`.

---

## 🚨 The layout model was wrong

**There is no fixed right-hand details panel.** OBS-02 read the screenshot as a three-column
app shell. It isn't.

The editor is: **fixed rail · one scroll container · pinned composer.** Inside the scroll
container are stacked **batch blocks**, and each block is *tiles on the left, its own details
column on the right*. Details scroll **with** the grid because they are part of it. Two stacked
batches render two independent details columns simultaneously.

```
┌──────┬────────────────────────────────────────────────┐
│ rail │  top bar (76px, fixed)                          │
│ 64/  ├────────────────────────────────────────────────┤
│ 228  │  ╔═ batch block ═══════════════════╗            │  ← scroll
│      │  ║ [tile][tile]   │ details 400px  ║            │    container
│      │  ║ [tile][tile]   │                ║            │    x=228
│      │  ╚════════════════╧════════════════╝            │    w=1212
│      │  ╔═ batch block ═══════════════════╗            │
│      │  ║ [tile][tile]   │ details 400px  ║            │
│      │  ╚════════════════╧════════════════╝            │
│      │           ┌ composer 600×94 ┐  (pinned b:32)     │
│      │  footer (fixed)                                  │
└──────┴────────────────────────────────────────────────┘
```

This changes STORY-204 and STORY-205 fundamentally: the unit of composition is the **batch**,
not the grid.

---

## ⚠️ Conflicts with RECON-03 — resolve before building

| # | RECON-03 said | RECON-04 says | Action |
|---|---|---|---|
| C1 | Rail hover `tint/0.15` (from `--sidebar-item-hover-bg`) | Applied rule is `tint/0.25` — **hover and active look identical** | The variable exists at 0.15 but may be overridden. Verify which actually paints |
| C2 | Composer placeholder `14px/400/20` | Placeholder `16px` | Re-measure the placeholder span vs. the contenteditable |
| C3 | Project title is an editable `<input>` | Title is a `<div>`; becomes editable only after ⋮ → Rename | RECON-04 is more specific; treat title as a div + rename mode |

Also suspicious: the rail group separator reads `1px solid rgb(232,234,237)` — full-opacity light
grey on black would be very bright for a divider. Possibly carries an opacity. **Verify.**

Minor arithmetic gap: tiles area measured 772px, but 2 × 358 + 16 gap = 732. The missing 40px is
unaccounted — padding on the tile column? **Verify before hardcoding.**

## 1. Regions

| Region | Dimensions |
|---|---|
| Icon rail | **64px collapsed / 228px expanded**, full height. Padding `76px 0 0 16px` |
| Scroll container | x=228, width **1212px** — the only `overflow-y:auto` scroller |
| Tiles area (per batch) | starts x=244, width **772px** |
| Details column (per batch) | x=1032, width **400px**, ends 8px from viewport edge |
| Composer | **600×94**, centered x=420, `position:absolute`, pinned `bottom:32px` |

Fixed on scroll: **top bar (76px), composer, footer.** Gaps: rail→tiles 16px, tiles→details 16px.

## 2. Icon rail

Transparent over black. Material Symbols ligature names:

`dashboard` All Media · `image` Images · `videocam` Videos · `accessibility_new` Characters ·
`movie` Scenes · `drive_folder_upload` Uploads — **separator** — `apps_spark_2` Tools —
(bottom) `delete` Trash · `left_panel_close` / `left_panel_open` Collapse/Expand

- **Active pill:** `rgba(218,220,224,0.25)`, radius **16px**. Collapsed **48×48** at x=16;
  expanded **212×48** spanning icon + label
- **Hover:** same tint — see conflict C1
- **Separator:** 1px, `rgb(232,234,237)`, 32px wide collapsed / 212px expanded
- **Expanded:** width 228px, row padding 4px, gap 8px between a 40×40 icon chip and an 11px/500
  label. Labels verbatim: All Media · Images · Videos · Characters · Scenes · Uploads · Tools ·
  Trash · Collapse
- 🔑 **The rail is dynamic.** An empty project shows only **All Media · Characters · Scenes ·
  Tools · Trash · Collapse** — Images, Videos and Uploads appear only once matching media exists

## 3. Top bar

Height **76px**, transparent, fixed. Left → right:

`arrow_back` "Go Back" 32×32 at x=24 · **title** "Aug 21 at 10:58 AM" 16px/400 white (a `<div>`) ·
`more_vert` 32×32 at x=237 · search (`search` icon + **370px** input, 38px tall, x=510, no
placeholder attribute) · `filter_list` "Sort & Filter" 42×40 · then `add` "Add Media" ·
`help` "Product Help" · `settings_2` "View Settings" · `more_vert` "More" · **ULTRA** + avatar
(111×48).

**Title ⋮ menu** — 192px glass popover: **Rename** · **View Trash** · **Delete**.

## 4. Grid & batches

- Tile **16:9**, measured **358×201**, container radius **17px**, gap **16px**
- **Play button:** 32×32, inset 10px, `rgba(218,220,224,0.75)`, radius 9999px, `play_arrow`
- Caption 13px, bottom-left overlay
- **Batch = one generation.** Typically **4 tiles (2×2)**; uploads/single images hold 1.
  **No divider between batches** — separated by spacing only

**View Settings popover** (292×344, glass): View Mode **Grid | Batch** · Grid Size **S/M/L** ·
toggles Sound on hover · Return silent videos · Show tile details · Clear prompt on submit.

| View · Size | Columns | Tile |
|---|---|---|
| Grid · S | 4 | EST: ~281×158 |
| Grid · M | 2 | EST: ~578×325 |
| Grid · L | 2 | EST: larger |
| **Batch (default)** | 2 per batch | 358×201 |

## 5. Tile interaction — partly blocked

- Hover: **no scale** (`transform:none`), **no shadow**. Reveal is pure **opacity 0→1** on
  overlay controls
- An outline `rgba(255,255,255,0.9)` exists but applies to **selected/focused**, not hover
- **UNKNOWN:** hover-playback and audio — synthetic pointer events revealed the overlay but never
  mounted the hover-play `<video>`. CDP mouse was frozen this session
- **UNKNOWN:** click-selection visual — tiles are plain `<div>`s with React onClick
- **EST:** no custom right-click menu (synthetic `contextmenu` produced nothing)

## 6. Details column — **one entry per BATCH** ✅

Resolved: it is **not** a panel that swaps to the selected tile. Each batch renders its own.

Top to bottom:

1. **Action row** — `download`, `undo`, `delete` (32px each, x≈1036/1066/1096).
   *Uploaded images show only download + delete — no undo*
2. **Prompt text** 12px white, `-webkit-line-clamp: 3`, ~18px line-height → 54px collapsed,
   with two right-aligned controls: `redo` = **"Reuse text prompt"**, `keyboard_arrow_down` =
   **"Expand prompt"**
3. An `add` button
4. **Reference thumbnail** 50×50, radius 12px
5. **Metadata**, all 12px muted `rgba(218,220,224,0.5)`, in order:
   `Created Aug 21, 2026` · model (`Omni Flash` / `Nano Banana 2`) · `crop_16_9` `16:9` ·
   `Video length: 10s` · `Resolution: 720p` — **for images this reads pixel size, e.g. `1376x768`**

## 7. Composer

600×94, `rgba(22,23,24,0.9)` + `blur(80px)`, radius 24px, no border, padding `12px 8px 8px 10px`.
Input is a **contenteditable `<div>`**, not a textarea. Placeholder
**"What do you want to create?"** (16px — see C2). Max growth **UNKNOWN**.

Controls L→R: **`add_2`** asset picker · **Agent** pill · **model chip** · **`arrow_forward`** send.
A **× clear** button appears once text is entered.

**Asset picker** — large modal: date dropdown, **"Search assets"**, **"Recent ▾"** sort.
Left tabs: **All · Images · Videos · Voices · Characters · Avatar · Uploads**. Center list with
thumbnails/names/type, right preview pane. Footer: **"Upload media"** left, **"Add to Prompt"**
white button right.

**Agent pill** — off: `tint/0.05`, radius 15px, `aria-pressed=false`. On: fills white, **the model
chip disappears**, two new controls appear (media icon, tune/sliders icon), and a fullscreen-expand
icon appears at the composer's top-right. *(Deferred by D6 — recorded for completeness.)*

**Output settings popover**

| Image tab | |
|---|---|
| Aspect | **16:9** (active) · 4:3 · 1:1 · 3:4 · 9:16 |
| Models | Nano Banana Pro · **Nano Banana 2** (selected) · Nano Banana 2 Lite |
| Count | x1 · **x2** · x3 · x4 |
| Cost | `Generating will use 0 credits` |

| Video tab | |
|---|---|
| Sub-mode | **Frames \| Ingredients** |
| Aspect | 9:16 · **16:9** |
| Models | **Omni Flash** (selected) · Veo 3.1 – Lite · Veo 3.1 – Fast · Veo 3.1 – Quality |
| Duration | 4s · 6s · **8s** · 10s |
| Count | x1–x4 |
| Cost | `Generating will use 24 credits` |

**Send:** disabled (empty prompt) bg `tint/0.05`, icon `tint/0.25`, `aria-disabled=true`.
Enabled bg `rgb(255,255,255)`, icon `rgb(48,48,48)`. **Only an empty prompt disables it.**
Hover shade and busy state **UNKNOWN**.

## 8. Generation lifecycle ✅

Verified with a real Nano Banana 2 image, x2:

1. Submit → new batch inserted at the **top of the grid** (newest first)
2. Prompt field **clears after a slight delay**, not instantly (Clear-prompt-on-submit was On)
3. **Pending tile** = dark gradient **skeleton** + `image` placeholder icon top-left +
   **live percentage counter top-right** (observed 27% → 57%). **No spinner, no `<progress>`** —
   progress is text percentage only
4. **Details entry populates immediately** — prompt, model, aspect all render while the media
   is still generating
5. On completion the skeleton is replaced by the finished media, and the **Resolution line updates
   to real dimensions** (`1376x768`)
6. End-to-end **EST: 20–30s** for an image x2 batch

**UNKNOWN:** failure / retry state (not triggered).

## 9. Empty state ✅

Fresh project auto-names to its creation timestamp (`Aug 21, 06:34 PM`).

- Grid: one centered placeholder — **"Start creating or drop media"**, **22px**, muted
  `rgba(218,220,224,0.5)`, **no illustration**
- **No details column** at all (no batches)
- Composer unchanged: placeholder, `+`, model chip `Nano Banana 2 x2`, send disabled
- Rail is reduced (see §2)

## 10. Scrolling

No lazy pagination — scroll height stable at 2037px, all batches present. Top bar, composer and
footer stay fixed. Footer verbatim: **"Google Flow can make mistakes, so double check it"** —
11px, `rgb(154,160,166)`, pinned bottom-left.

## Open items

1. Tile hover playback / audio behavior
2. Tile click-selection visual; right-click menu
3. Composer max growth height
4. Send hover shade + busy state
5. Generation failure / retry state
6. Conflicts C1–C3 above, the separator color, and the 40px tile-area arithmetic gap
