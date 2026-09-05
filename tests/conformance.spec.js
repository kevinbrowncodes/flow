import { test, expect } from '@playwright/test'
import { PROJECT_URL, GEOMETRY, COLORS, SHAPE, MOTION, TEXT } from './recon-values.js'

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
