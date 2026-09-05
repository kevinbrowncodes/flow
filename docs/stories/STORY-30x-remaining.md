# STORY-301 · 302 · 304 · 305 · 306 · 308 — Phase 3 remainder

Grouped because each is small and several are gated on RECON-05.

---

## STORY-301 — Tile hover & selection  ⚠️ partly blocked

**Source** RECON-04 §5

- [ ] Hover: **no scale**, **no shadow** — reveal is pure `opacity 0→1` on overlay controls,
      `200ms ease-in-out`, plus the outline transition
- [ ] Hover toolbar: `blur(80px)` over `rgba(255,255,255,0.5)`, icons `rgba(27,27,27,0.9)`,
      radius 12px, padding 4px, gap 2px
- [ ] Selected/focused outline `rgba(255,255,255,0.9)`
- [ ] ⚠️ **UNKNOWN — blocked on RECON-05:** whether hover starts playback, whether audio plays
      ("Sound on hover" is on), and the click-selection visual. CDP mouse was frozen during
      RECON-04, so none of it was observable. **Do not guess these.**
- [ ] EST: no custom right-click menu — leave native

## STORY-302 — Rail filters

**Source** RECON-04 §2

- [ ] All Media / Images / Videos / Scenes / Uploads filter the batch list client-side, same URL
- [ ] Rail items appear conditionally on media presence (STORY-202)
- [ ] Scenes with no content shows the empty placeholder

## STORY-304 — Asset picker

**Source** RECON-04 §7

- [ ] Large modal: date dropdown, **"Search assets"** field, **"Recent ▾"** sort
- [ ] Left vertical tabs: All · Images · Videos · Voices · Characters · Avatar · Uploads
- [ ] Center: asset list with thumbnail, name, type. Right: preview pane
- [ ] Footer: **"Upload media"** left, **"Add to Prompt"** white button right
- [ ] Voices / Characters / Avatar tabs render but are empty (D6)

## STORY-305 — View settings, add menu, project menu

**Source** RECON-04 §3, §4

- [ ] View Settings popover **292×344**: View Mode **Grid | Batch** · Grid Size **S/M/L** ·
      toggles Sound on hover · Return silent videos · Show tile details · Clear prompt on submit
- [ ] Grid view column counts: **S = 4**, **M = 2**, **L = 2** (larger scale).
      Batch view is the default and shows 2 tiles per batch row
- [ ] `add` menu: Upload media · Create Collection · Create Character · Create Scene
      (last three inert, D6)
- [ ] Project ⋮: Rename · View Trash · Delete — Rename switches the title div to an editable field

## STORY-306 — Search & filters

**Source** RECON-01, RECON-04 §3

- [ ] Search filters batches client-side; no placeholder text in the field
- [ ] Filter popover: Type · Aspect · Resolution · Created · Duration + Sort,
      with a result count and Clear

## STORY-308 — Scroll-fade mask

**Source** RECON-03, RECON-04 §1

- [ ] `mask-image` on the top **92px** of the scroll container using `--mask-gradient`
- [ ] Animates `opacity 400ms, transform 400ms, visibility 400ms ease-in-out`
- [ ] Content fades out as it scrolls up under the fixed 76px top bar
