# STORY-202 — Icon rail, collapsed & expanded

**Phase** 2 · **Source** RECON-04 §2

## Context

The rail's active-pill treatment repeats on every item, so it has to be exact. It is also
**dynamic** — items appear based on what media the project holds.

## Items (Material Symbols ligature → destination)

`dashboard` All Media · `image` Images · `videocam` Videos · `accessibility_new` Characters ·
`movie` Scenes · `drive_folder_upload` Uploads — **separator** — `apps_spark_2` Tools —
(bottom) `delete` Trash · `left_panel_close`/`left_panel_open` Collapse

## Acceptance criteria

- [ ] Width **64px collapsed / 228px expanded**; padding `76px 0 0 16px`
- [ ] Collapsed pill **48×48** at x=16; expanded pill **212×48** spanning icon + label
- [ ] Active background `rgba(218,220,224,0.25)`, radius **16px**
- [ ] Expanded row: padding 4px, gap **8px**, icon chip 40×40, label **11px/500**
- [ ] Labels verbatim: All Media · Images · Videos · Characters · Scenes · Uploads · Tools ·
      Trash · Collapse
- [ ] Separator between Uploads and Tools: a **1px-tall `<div>`**, 32px wide collapsed / 212px
      expanded, `background-color: rgb(232,234,237)` with **`opacity: 0.35`** — no border
      (RECON-05 §8)
- [ ] Expand/collapse animates `width 400ms, padding-top 400ms ease-in-out`
- [ ] **Dynamic items:** Images, Videos and Uploads render only when the project contains that
      media type. An empty project shows All Media · Characters · Scenes · Tools · Trash · Collapse
- [ ] Characters, Tools and Trash render but are **inert** (D6)
- [ ] ✅ **C1 resolved (RECON-05):** non-active rail items have **no hover background at all** —
      the authored `rgba(218,220,224,0.15)` rule is overridden by a later `transparent` rule, and
      `--sidebar-item-hover-bg` isn't defined in the loaded CSS. **Do not add a hover background.**
      Only `color` transitions on hover (`100ms ease-in-out`)
- [ ] ⚠️ No focus indicator on rail items (RECON-05 §6) — see V5 in the epic
