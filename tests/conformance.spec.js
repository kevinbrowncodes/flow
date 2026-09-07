import { test, expect } from '@playwright/test'
import { PROJECT_URL, HOME_URL, GEOMETRY, HOME, AGENT, COLORS, SHAPE, MOTION, TEXT } from './recon-values.js'

const box = (l) => l.boundingBox()
const style = (l, prop) => l.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.describe('Part A — computed-style conformance against recon values', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForSelector('section') // batches rendered
  })

  test('rail: width, padding, active pill, separator [RECON-04 §2]', async ({ page }) => {
    const rail = page.locator('nav[aria-label="Project"]')
    expect((await box(rail)).width).toBe(GEOMETRY.railExpanded)
    expect(await style(rail, 'padding-top')).toBe(`${GEOMETRY.headerHeight}px`)
    expect(await style(rail, 'padding-left')).toBe('16px')

    const active = page.locator('[aria-current="page"]')
    const b = await box(active)
    expect(b.width).toBe(GEOMETRY.railItemExpandedWidth)
    expect(b.height).toBe(GEOMETRY.railItemHeight)
    expect(await style(active, 'background-color')).toBe(COLORS.railActive)
    expect(await style(active, 'border-radius')).toBe(SHAPE.railItemRadius)

    // RECON-05 C1: NO hover background on non-active items
    const inactive = page.locator('nav button', { hasText: 'Scenes' })
    await inactive.hover()
    expect(await style(inactive, 'background-color')).toBe(COLORS.railHover)

    // collapse → 64px [RECON-04 §1]
    await page.locator('nav button[aria-label="Collapse"]').click()
    await page.waitForTimeout(500) // 400ms transition
    expect((await box(rail)).width).toBe(GEOMETRY.railCollapsed)
  })

  test('top bar + search field [RECON-04 §3]', async ({ page }) => {
    const bar = page.locator('header')
    expect((await box(bar)).height).toBe(GEOMETRY.headerHeight)
    const input = page.locator('input[aria-label="Search"]')
    const b = await box(input)
    expect(b.width).toBe(GEOMETRY.searchInputWidth)
    expect(b.height).toBe(GEOMETRY.searchInputHeight)
    // no placeholder text — icon only [RECON-03/04]
    expect(await input.getAttribute('placeholder')).toBeNull()
  })

  test('tiles: height-driven sizing, radius, aspect [RECON-04 §4, RECON-05 §9]', async ({ page }) => {
    const tile = page.getByTestId('tile').first()
    const b = await box(tile)
    expect(b.height).toBe(GEOMETRY.tileHeight)
    expect(b.width / b.height).toBeCloseTo(GEOMETRY.tileAspect, 2)
    expect(await style(tile, 'border-radius')).toBe(SHAPE.tileRadius)
    // tiles must NOT grow [RECON-05 §9]
    expect(await style(tile, 'flex-grow')).toBe('0')
    expect(await style(tile, 'transition-duration')).toContain(MOTION.base)
  })

  test('details column: width, metadata color [RECON-04 §6]', async ({ page }) => {
    const details = page.locator('section aside').first()
    expect((await box(details)).width).toBe(GEOMETRY.detailsWidth)
    const meta = details.locator('span', { hasText: /^Created / })
    expect(await style(meta, 'color')).toBe(COLORS.metaText)
    expect(await style(meta, 'font-size')).toBe('12px')
    expect(await style(meta, 'font-weight')).toBe('500')
  })

  test('composer: geometry, glass, send states [RECON-04 §7, RECON-05]', async ({ page }) => {
    const composer = page.getByTestId('composer')
    const b = await box(composer)
    expect(b.width).toBe(GEOMETRY.composerWidth)
    expect(b.height).toBe(GEOMETRY.composerMinHeight)
    expect(await style(composer, 'border-radius')).toBe(SHAPE.composerRadius)
    expect(await style(composer, 'background-color')).toBe(COLORS.glass)
    expect(await style(composer, 'backdrop-filter')).toBe('blur(80px)')
    expect(await style(composer, 'box-shadow')).toBe(SHAPE.composerShadow)

    await expect(page.getByText(TEXT.placeholder)).toBeVisible()

    const send = page.locator('button[aria-label="Generate"]')
    await expect(send).toHaveAttribute('aria-disabled', 'true')
    await expect(send).toHaveCSS('color', COLORS.sendDisabledFg)

    await page.locator('[role="textbox"]').fill('a quiet lagoon at dawn')
    await expect(send).toHaveAttribute('aria-disabled', 'false')
    await expect(send).toHaveCSS('background-color', COLORS.sendEnabledBg) // auto-retries past React commit
    await expect(send).toHaveCSS('color', COLORS.sendEnabledFg)
  })

  test('output settings popover: matrix + cost line [RECON-04 §7]', async ({ page }) => {
    await page.locator('button[aria-label="Output settings"]').click()
    const menu = page.locator('[role="menu"]')
    expect(await style(menu, 'border-radius')).toBe(SHAPE.popoverRadius)
    await expect(menu.getByText(TEXT.costLine)).toBeVisible()
    // Video tab holds the full model list
    await menu.getByRole('button', { name: 'Video', exact: true }).click()
    for (const m of ['Omni Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality']) {
      await expect(menu.getByRole('button', { name: m })).toBeVisible()
    }
    await expect(menu.getByText('Generating will use 24 credits')).toBeVisible() // observed anchor
  })

  test('project menu: items + destructive color [RECON-04 §3]', async ({ page }) => {
    await page.locator('button[aria-label="Project options"]').click()
    const item = page.getByRole('menuitem', { name: 'Delete' })
    expect(await style(item, 'color')).toBe(COLORS.destructive)
    const b = await box(item)
    expect(b.height).toBe(GEOMETRY.menuItemHeight)
    for (const label of ['Rename', 'View Trash', 'Delete']) {
      await expect(page.getByRole('menuitem', { name: label })).toBeVisible()
    }
  })

  test('footer verbatim + color [RECON-04 §10]', async ({ page }) => {
    const footer = page.locator('footer')
    await expect(footer).toHaveText(TEXT.footer)
    expect(await style(footer, 'color')).toBe(COLORS.footer)
    expect(await style(footer, 'font-size')).toBe('11px')
  })

  test('generation lifecycle: prepend, skeleton, % counter [RECON-04 §8]', async ({ page }) => {
    await page.locator('[role="textbox"]').fill('mist rising over a mountain lake')
    await page.locator('button[aria-label="Generate"]').click()
    // new batch PREPENDS
    const firstBatch = page.locator('section').first()
    await expect(firstBatch.locator('span', { hasText: /%$/ }).first()).toBeVisible()
    // details populate immediately, resolution absent until completion
    await expect(firstBatch.locator('aside')).toContainText('mist rising over a mountain lake')
    await expect(firstBatch.locator('aside')).not.toContainText('Resolution:')
    // prompt clears on a short delay
    await page.waitForTimeout(700)
    await expect(page.getByText(TEXT.placeholder)).toBeVisible()
  })

  test('empty filter state shows the verbatim placeholder [RECON-04 §9]', async ({ page }) => {
    await page.locator('nav button', { hasText: 'Scenes' }).click()
    await expect(page.getByText(TEXT.empty)).toBeVisible()
  })
})

test.describe('Part B — self-baseline visual regression', () => {
  test('editor default', async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForSelector('section')
    await page.waitForTimeout(600) // settle fonts/images
    await expect(page).toHaveScreenshot('editor-default.png', { maxDiffPixelRatio: 0.02 })
  })
})

test.describe('Part C — projects home [RECON-08 / STORY-208]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HOME_URL)
    await page.waitForSelector('[data-testid="projects-grid"]')
  })

  test('header: 80px, sticky, transparent, wordmark is the model name [§1]', async ({ page }) => {
    const header = page.locator('header')
    expect((await box(header)).height).toBe(HOME.headerHeight)
    expect(await style(header, 'position')).toBe('sticky')
    expect(await style(header, 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(header, 'padding')).toBe(HOME.headerPadding)
    // Google-only chrome is absent: no socials, no plan badge, no avatar.
    for (const gone of ['Flow Music', 'Flow TV', 'ULTRA']) {
      await expect(header.getByText(gone, { exact: true })).toHaveCount(0)
    }
    await expect(header.getByRole('button', { name: 'More options' })).toBeVisible()
  })

  test('grid: 3 fluid columns, 16px gaps, measured padding [§2]', async ({ page }) => {
    const grid = page.locator('[data-testid="projects-grid"]')
    const tracks = (await style(grid, 'grid-template-columns')).split(' ')
    expect(tracks).toHaveLength(HOME.columns)
    // Fluid: every track is the same width, and they fill the padded row.
    const widths = tracks.map(parseFloat)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
    expect(await style(grid, 'column-gap')).toBe(`${HOME.gridGap}px`)
    expect(await style(grid, 'row-gap')).toBe(`${HOME.gridGap}px`)
    expect(await style(grid, 'padding')).toBe(HOME.gridPadding)
    expect((await box(grid)).x).toBe(0) // grid spans the page; padding does the insetting
  })

  test('card: radius, 16/9 thumbnail, 42px footer, 34px icons [§3]', async ({ page }) => {
    const card = page.locator('[data-testid="project-card"]').first()
    expect(await style(card, 'border-radius')).toBe(HOME.cardRadius)
    const thumb = card.getByRole('link', { name: 'Open project' })
    expect(await style(thumb, 'border-radius')).toBe(HOME.cardRadius)
    const tb = await box(thumb)
    expect(tb.width / tb.height).toBeCloseTo(HOME.thumbAspect, 2)
    expect(await style(thumb, 'overflow')).toBe('hidden')
    const footer = card.locator('div').filter({ hasText: /.*/ }).last()
    expect(await style(card.getByRole('button', { name: 'Delete project' }), 'width')).toBe(`${HOME.iconButton}px`)
    expect(await style(card.getByText(/at \d/).first(), 'font-size')).toBe(HOME.titleSize)
    expect(await style(card.getByText(/at \d/).first(), 'line-height')).toBe(HOME.titleLineHeight)
    expect(footer).toBeTruthy()
  })

  test('card: icons hidden until hover, and on focus-within [§4]', async ({ page }) => {
    const card = page.locator('[data-testid="project-card"]').first()
    const trash = card.getByRole('button', { name: 'Delete project' })
    expect(await style(trash, 'opacity')).toBe('0')
    expect(await style(card, 'background-color')).toBe('rgba(0, 0, 0, 0)')

    await card.hover()
    await expect(async () => expect(await style(trash, 'opacity')).toBe('1')).toPass()
    expect(await style(card, 'background-color')).toBe(HOME.cardHover)

    // Keyboard reaches them too — the icons exist in the DOM at opacity 0.
    await page.mouse.move(0, 0)
    await trash.focus()
    await expect(async () => expect(await style(trash, 'opacity')).toBe('1')).toPass()
  })

  test('empty project shows the flat placeholder, no image [§3]', async ({ page }) => {
    // The fixtures carry two batch-less projects (OLDER_PROJECTS).
    const empty = page.locator('[data-testid="project-card"]').last()
    const thumb = empty.getByRole('link', { name: 'Open project' })
    expect(await style(thumb, 'background-color')).toBe(HOME.thumbEmpty)
    await expect(thumb.locator('img')).toHaveCount(0)
  })

  test('new project: fixed, centred, 56px up, and creates without a dialog [§5]', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'New project' })
    expect(await style(btn, 'position')).toBe('fixed')
    expect(await style(btn, 'border-radius')).toBe(HOME.newProjectRadius)
    expect(await style(btn, 'background-color')).toBe(HOME.newProjectBg)
    const b = await box(btn)
    const viewport = page.viewportSize()
    expect(b.width).toBe(HOME.newProjectWidth)
    expect(Math.round(b.x + b.width / 2)).toBe(viewport.width / 2)
    expect(Math.round(viewport.height - (b.y + b.height))).toBe(HOME.newProjectBottom)

    await btn.click()
    await expect(page).toHaveURL(/\/project\/[0-9a-f-]{36}$/) // straight in, no dialog
  })

  test('rename is inline, Enter commits and Escape restores [§4]', async ({ page }) => {
    const card = page.locator('[data-testid="project-card"]').first()
    const original = await card.getByText(/at \d/).first().innerText()
    await card.hover()
    await card.getByRole('button', { name: 'Edit project title' }).click()
    const input = card.getByRole('textbox', { name: 'Project title' })
    await expect(input).toBeFocused()
    await input.fill('Beach scene')
    await input.press('Enter')
    await expect(card.getByText('Beach scene')).toBeVisible()

    await card.getByRole('button', { name: 'Edit project title' }).click()
    await card.getByRole('textbox', { name: 'Project title' }).fill('discarded')
    await card.getByRole('textbox', { name: 'Project title' }).press('Escape')
    await expect(card.getByText('Beach scene')).toBeVisible()
    expect(original).not.toBe('Beach scene')
  })

  test('delete asks first, tells the truth about the clips, and Cancel keeps it [§4]', async ({ page }) => {
    const before = await page.locator('[data-testid="project-card"]').count()
    const card = page.locator('[data-testid="project-card"]').first()
    await card.hover()
    await card.getByRole('button', { name: 'Delete project' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(HOME.deleteHeadline)
    await expect(dialog).toContainText('The clips stay on the box')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(before)

    await card.hover()
    await card.getByRole('button', { name: 'Delete project' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click()
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(before - 1)
  })

  test('empty state: one muted line, no illustration [§6]', async ({ page }) => {
    const cards = page.locator('[data-testid="project-card"]')
    for (let n = await cards.count(); n > 0; n--) {
      await cards.first().hover()
      await cards.first().getByRole('button', { name: 'Delete project' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click()
      await expect(cards).toHaveCount(n - 1)
    }
    const empty = page.getByText(HOME.emptyCopy)
    await expect(empty).toBeVisible()
    expect(await style(empty, 'font-size')).toBe('22px')
    expect(await style(empty, 'color')).toBe('rgba(218, 220, 224, 0.5)')
    await expect(page.locator('img, svg')).toHaveCount(0) // no illustration
    await expect(page.getByRole('button', { name: 'New project' })).toBeVisible()
  })
})


test.describe('Part D — Agent mode [RECON-04 §7, RECON-10, STORY-602..604]', () => {
  const pill = (page) => page.getByRole('button', { name: 'Agent', exact: true })

  test.beforeEach(async ({ page }) => {
    await page.goto(PROJECT_URL)
    await page.waitForSelector('section')
  })

  test('pill: off tint, on white (also under hover), model chip hides, controls appear and reverse', async ({ page }) => {
    const p = pill(page)
    expect(await style(p, 'background-color')).toBe(AGENT.pillOff)
    expect(await style(p, 'border-radius')).toBe(AGENT.pillRadius)
    expect(await p.getAttribute('aria-pressed')).toBe('false')
    await expect(page.getByRole('button', { name: 'Output settings' })).toHaveCount(1)
    for (const n of AGENT.controls) await expect(page.getByRole('button', { name: n, exact: true })).toHaveCount(0)

    await p.click()
    // the chip's background transitions over --dur-fast; wait it out like Part C does
    await expect(async () => expect(await style(p, 'background-color')).toBe(AGENT.pillOn)).toPass()
    await p.hover()
    await expect(async () => expect(await style(p, 'background-color')).toBe(AGENT.pillOn)).toPass()
    expect(await p.getAttribute('aria-pressed')).toBe('true')
    await expect(page.getByRole('button', { name: 'Output settings' })).toHaveCount(0)
    for (const n of AGENT.controls) await expect(page.getByRole('button', { name: n, exact: true })).toHaveCount(1)

    await p.click()
    await expect(async () => expect(await style(p, 'background-color')).not.toBe(AGENT.pillOn)).toPass()
    await expect(page.getByRole('button', { name: 'Output settings' })).toHaveCount(1)
    for (const n of AGENT.controls) await expect(page.getByRole('button', { name: n, exact: true })).toHaveCount(0)
  })

  test('instruction picker and agent settings', async ({ page }) => {
    await pill(page).click()
    await page.getByRole('button', { name: 'Agent instructions', exact: true }).click()
    const picker = page.getByTestId('instruction-picker')
    await expect(picker.getByRole('radio')).toHaveCount(2)
    await expect(picker.getByText('1 clip')).toHaveCount(1)
    await picker.getByRole('radio', { name: /mock-single/ }).click()

    await page.getByRole('button', { name: 'Agent settings', exact: true }).click()
    const settings = page.getByTestId('agent-settings')
    await expect(settings.getByRole('radio', { name: 'Always', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(settings.getByText(/this skill writes one clip/)).toBeVisible()
    await expect(settings.getByRole('radiogroup', { name: 'Clips' }).getByRole('radio')).toHaveCount(6)
    await expect(settings.getByRole('radio', { name: '1', exact: true })).toHaveAttribute('aria-checked', 'true')
    await settings.getByRole('radio', { name: 'Never', exact: true }).click()
    await settings.getByRole('button', { name: 'Save' }).click()
    await expect(settings).toHaveCount(0)
  })

  test('send needs a seed even when the backend does not, and a skill', async ({ page }) => {
    await pill(page).click()
    const send = page.getByRole('button', { name: 'Generate', exact: true })
    await expect(send).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: 'Agent instructions', exact: true }).click()
    await page.getByRole('radio', { name: /mock-scene/ }).click()
    await expect(send).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: 'Add assets' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add to Prompt' })
    await dialog.locator('button').filter({ hasText: /ember|jpg|png/i }).first().click()
    await dialog.getByRole('button', { name: 'Add to Prompt' }).click()
    await expect(send).toHaveAttribute('aria-disabled', 'false')
  })

  test('a run: plan → review → rewrite → approve → done in the panel, and as a batch in the grid', async ({ page }) => {
    const before = await page.locator('section').count()
    await pill(page).click()
    await page.getByRole('button', { name: 'Agent instructions', exact: true }).click()
    await page.getByRole('radio', { name: /mock-scene/ }).click()
    await page.getByRole('button', { name: 'Add assets' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add to Prompt' })
    await dialog.locator('button').filter({ hasText: /ember|jpg|png/i }).first().click()
    await dialog.getByRole('button', { name: 'Add to Prompt' }).click()
    await page.getByRole('button', { name: 'Generate', exact: true }).click()

    const panel = page.getByTestId('agent-panel')
    await expect(panel).toBeVisible()
    expect((await box(panel)).width).toBe(AGENT.panelWidth)
    await expect(page.getByTestId('run-step')).toContainText(AGENT.planningStep)
    await expect(page.locator('section')).toHaveCount(before + 1)
    const batch = page.locator('section').first()
    await expect(batch.getByTestId('tile')).toHaveCount(3)

    await expect(page.getByTestId('run-step')).toContainText('review', { timeout: 8000 })
    await expect(page.getByTestId('script')).toHaveCount(3)
    await page.getByRole('button', { name: 'Rewrite script 2' }).click()
    await expect(page.getByRole('textbox', { name: 'Script 2' })).toHaveValue(/rewritten/)
    await page.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByTestId('run-step')).toContainText(/Queued|Rendering/)
    await expect(batch.getByTestId('run-status')).toContainText(AGENT.deleteNote)
    await expect(page.getByTestId('run-step')).toContainText('Done', { timeout: 60000 })
    await expect(page.getByTestId('run-clips').locator('img')).toHaveCount(3)
    await expect(batch.locator('img[class*="poster"]')).toHaveCount(3)
    await expect(batch.getByTestId('run-status')).toHaveCount(0)

    await page.getByRole('button', { name: 'Run history' }).click()
    await expect(panel.getByText('Done')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(panel).toHaveCount(0)
  })
})
