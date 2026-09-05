# STORY-303 — Output settings popover

**Phase** 3 · **Source** RECON-04 §7 · **Fully specified**

## Context

Opened from the composer's model chip. Governs every generation, and the chip label reflects its
state. RECON-00b noted the chip can read `Nano Banana 2` (image) while visible clips were made
with `Omni Flash` (video) — **the chip shows current settings, not what produced the media.**
Model these independently or the page will lie.

## Image tab

| Control | Options |
|---|---|
| Aspect | **16:9** (default) · 4:3 · 1:1 · 3:4 · 9:16 |
| Model | Nano Banana Pro · **Nano Banana 2** · Nano Banana 2 Lite |
| Count | x1 · **x2** · x3 · x4 |
| Cost | `Generating will use 0 credits` |

## Video tab

| Control | Options |
|---|---|
| Sub-mode | **Frames** \| Ingredients |
| Aspect | 9:16 · **16:9** |
| Model | **Omni Flash** · Veo 3.1 – Lite · Veo 3.1 – Fast · Veo 3.1 – Quality |
| Duration | 4s · 6s · **8s** · 10s |
| Count | x1 · x2 · x3 · x4 |
| Cost | `Generating will use 24 credits` |

## Acceptance criteria

- [ ] Popover: `rgba(22,23,24,0.9)` + `blur(40px)`, radius 18px, padding 8px,
      shadow `inset 0 0 0 1px rgba(218,220,224,0.05), 0 16px 32px -8px rgba(0,0,0,0.6)`
- [ ] Image/Video tabs; each remembers its own selections independently
- [ ] Cost line recomputes from model × count × duration and renders verbatim as
      `Generating will use {n} credits`
- [ ] Chip label updates live: `{model} ▭ x{count}`
- [ ] Strings stay **verbatim Google** per D7 — swapped for local model names in EPIC-002
- [ ] Selected option styling matches the rail's active treatment (`tint/0.25`)
