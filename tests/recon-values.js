/**
 * Ground truth for the conformance suite — transcribed from docs/recon/results/.
 * Each entry names its source so a failing assertion points back to evidence.
 * Do not "fix" a failing value here; fix the CSS.
 */
export const PROJECT_URL = '/project/a88beb70-4eb5-454a-8e3e-51ec771e5419'
export const HOME_URL = '/'

/** RECON-08 — the projects home. Captured at 1796px; the suite runs at 1440,
 *  so only width-independent values live here (the grid is `repeat(3, 1fr)`,
 *  which is why the card width is derived, not asserted). */
export const HOME = {
  headerHeight: 80, // §1
  headerPadding: '16px 24px', // §1
  gridGap: 16, // §2
  gridPadding: '0px 16px 16px 24px', // §2
  columns: 3, // §2 — count is fixed, width is fluid
  cardRadius: '16px', // §3
  cardHover: 'rgba(218, 220, 224, 0.05)', // §4 --tint-fill
  thumbEmpty: 'rgba(218, 220, 224, 0.15)', // §3 --tint-hover
  thumbAspect: 1.77778, // §3 16/9
  footerHeight: 42, // §3
  footerPadding: '4px 16px', // §3
  iconButton: 34, // §3
  titleSize: '16px', // §3
  titleLineHeight: '24px', // §3
  newProjectWidth: 192, // §5
  newProjectRadius: '32px', // §5
  newProjectBottom: 56, // §5
  newProjectBg: 'rgba(218, 220, 224, 0.25)', // §5 --tint-active
  emptyCopy: 'No projects yet', // §6 — designed, not cloned (STORY-208)
  deleteHeadline: 'Delete this project?', // §4, our copy
}

export const GEOMETRY = {
  headerHeight: 76, // RECON-02 --header-height
  railExpanded: 228, // RECON-04 §1
  railCollapsed: 64, // RECON-04 §1
  railItemHeight: 48, // RECON-03
  railItemExpandedWidth: 212, // RECON-04 §2
  scrollerWidth: 1212, // RECON-04 §1 (1440 - 228)
  detailsWidth: 400, // RECON-04 §1
  composerWidth: 600, // RECON-04 §1
  composerMinHeight: 94, // RECON-04 §1
  tileHeight: 201, // RECON-04 §4
  tileAspect: 1.77778, // RECON-02
  searchInputWidth: 370, // RECON-04 §3
  searchInputHeight: 38, // RECON-04 §3
  gridGap: 16, // RECON-02 --grid-gap
  menuItemHeight: 34, // RECON-03
}

export const COLORS = {
  pageBg: 'rgb(0, 0, 0)', // RECON-03
  glass: 'rgba(22, 23, 24, 0.9)', // RECON-03
  railActive: 'rgba(218, 220, 224, 0.25)', // RECON-03/04
  railHover: 'rgba(0, 0, 0, 0)', // RECON-05 C1: NO hover background
  sendEnabledBg: 'rgb(255, 255, 255)', // RECON-03
  sendEnabledFg: 'rgb(48, 48, 48)', // RECON-03
  sendDisabledFg: 'rgba(218, 220, 224, 0.25)', // RECON-03
  destructive: 'rgb(254, 110, 110)', // RECON-03
  footer: 'rgb(154, 160, 166)', // RECON-03
  metaText: 'rgba(218, 220, 224, 0.5)', // RECON-03
}

export const SHAPE = {
  tileRadius: '17px', // RECON-03
  composerRadius: '24px', // RECON-03
  popoverRadius: '18px', // RECON-03
  chipRadius: '15px', // RECON-03
  railItemRadius: '16px', // RECON-03/04
  actionRadius: '10px', // RECON-03
  composerShadow: 'rgba(0, 0, 0, 0.4) 0px 16px 32px -8px', // RECON-03 verbatim
}

export const MOTION = {
  fast: '0.1s', // RECON-03: control hovers
  base: '0.2s', // RECON-03: tile, search
  slow: '0.4s', // RECON-03: rail expand, scroll mask
}

export const TEXT = {
  footer: 'Google Flow can make mistakes, so double check it', // RECON-04 §10 verbatim
  placeholder: 'What do you want to create?', // RECON-04 §7 verbatim
  empty: 'Start creating or drop media', // RECON-04 §9 verbatim
  costLine: /^Generating will use \d+ credits$/, // RECON-04 §7 verbatim format
}
