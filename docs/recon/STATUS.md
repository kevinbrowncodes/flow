# Recon Tracker — EPIC-001 Phase 0

Missions are numbered in **execution order**. Run top to bottom.

| # | Mission | Status | Blocks | Result file |
|---|---------|--------|--------|-------------|
| OBS-01 | Home screenshot observations | ✅ 2026-08-21 | — | `results/OBS-01-home-screenshot.md` |
| OBS-02 | Editor screenshot (MVP target) | ✅ 2026-08-21 | — | `results/OBS-02-editor-screenshot.md` |
| RECON-01 | Site map & surface inventory | ✅ 2026-08-21 | surface inventory | `results/RECON-01-site-map.md` |
| RECON-02 | Implementation fingerprint | ✅ 2026-08-21 | STORY-100 (stack) | `results/RECON-02-fingerprint.md` |
| RECON-03 | Design tokens | ✅ 2026-08-21 | STORY-101 (tokens) | `results/RECON-03-tokens.md` |
| RECON-04 | Project editor — the MVP | ✅ 2026-08-21 | STORY-201 → 308 | `results/RECON-04-editor-mvp.md` |
| RECON-05 | Gap closer — C1–C3 + 8 unknowns | ✅ 2026-08-21 | STORY-301 | `results/RECON-05-gap-closer.md` |
| RECON-06 | Accessibility | ⬜ before Phase 4 | STORY-402 | — |
| 👤 **Manual hover check** | Kevin, 2 min | 🔜 **ONLY MVP BLOCKER** | STORY-301 | — |
| RECON-07 | Home header & app shell | ⏸ post-MVP | home page | — |
| RECON-08 | Project gallery / home | ✅ 2026-09-07 | STORY-208 | `results/RECON-08-project-gallery.md` |
| RECON-09 | Media editor & timeline | ⏸ post-MVP | media editor | — |
| RECON-10 | **Agent mode — behaviour** | 🔜 requested 2026-09-07 | agent epic | — |

**02 → 03 → 04 unblocks every MVP story.** 05 and 06 can lag until Phase 4.
07/08/09 are for the end-of-epic discussion, not the MVP.

## Capture conditions — every run from here

- **Icon rail must be visible** — below ~700px CSS Flow drops the rail and reflows. Measuring
  there documents the wrong layout.
- **Record the viewport**: `console.log(innerWidth, innerHeight, devicePixelRatio)`.
  Kevin's display: **1795 × ~1500, DPR 2**. STORY-104's harness matches whatever we record here.
- **Claude side panel closed** — costs ~500px and reflows the app.
- Run on the **project editor page**, not home.

The exact width is arbitrary. Reference and build rendering at the *same* width is not.
Full detail in `PROMPTS.md`.
