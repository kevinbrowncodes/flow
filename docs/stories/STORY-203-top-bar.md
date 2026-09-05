# STORY-203 — Editor top bar

**Phase** 2 · **Source** RECON-04 §3

## Acceptance criteria

- [ ] Height **76px**, transparent, fixed on scroll
- [ ] Left → right: `arrow_back` "Go Back" 32×32 at x=24 · title · `more_vert` 32×32 at x=237 ·
      search · `filter_list` "Sort & Filter" 42×40 · `add` "Add Media" · `help` "Product Help" ·
      `settings_2` "View Settings" · `more_vert` "More" · ULTRA badge + avatar (111×48)
- [ ] Right-cluster gap **12px**
- [ ] ✅ **C3 resolved (RECON-05):** the title is **always an `<input type="text">`**, styled to
      look like plain text: `background: transparent; border: 0; outline: 0; font: inherit;
      field-sizing: content; max-width: min(20vw, 500px); text-overflow: ellipsis; cursor: text`.
      16px/400 white, showing the creation timestamp
- [ ] Search: `search` icon + **370px** input, **38px** tall at x=510, **no placeholder text**.
      Fill `tint/0.1` + `blur(80px)`, border `1px solid tint/0.05`, radius 16px,
      focus animates `border-color 200ms ease-in-out` with **no ring**
- [ ] Title ⋮ opens a **192px** glass popover: **Rename** · **View Trash** · **Delete**
      (Delete in `rgb(254,110,110)`), animating in with `slideUp 0.2s cubic-bezier(0.16,1,0.3,1)`
- [ ] **Rename focuses the existing input in place** — no new element — and reveals two **40px**
      icon buttons beside it: ✓ **Done** and ✗ **Cancel**. Editing height **24px**, width auto-fits
      to ~359px. **Enter and ✓ commit; Escape and ✗ cancel** (revert without saving)
- [ ] ⚠️ Search input has **no focus indicator** (RECON-05 §6) — see V5
- [ ] ULTRA badge renders; account/help popovers are **inert** (post-MVP)

## Out of scope

Search behavior (STORY-306), View Settings contents (STORY-305).
