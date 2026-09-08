/**
 * End-to-end: the RELEASE bundle (hash router, http adapter, relative assets)
 * served by the Python fake gateway from protocol/python. Proves the seam:
 * capabilities → schema-driven UI → upload → generate → poll → media.
 *
 *   npm run conform:gateway
 */
import { test, expect } from '@playwright/test'
import zlib from 'node:zlib'

const UI = '/ui/'

function tinyPng(w = 8, h = 8, rgb = [200, 80, 40]) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.from(Array(w).fill(rgb).flat())])))
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (tag, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(tag), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

async function openEditor(page) {
  await page.goto(UI)
  // v0.2.0 (STORY-208) opens on the projects home; a fresh browser has no project yet.
  const fresh = page.getByRole('button', { name: 'New project' })
  if (await fresh.count()) await fresh.click()
  await expect(page).toHaveURL(/#\/project\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('composer')).toBeVisible()
}

import { deflateSync } from 'node:zlib'

/** A minimal valid PNG of the given size, so the fake gateway has real dimensions to measure. */
function pngOf(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (tag, body) => {
    const t = Buffer.from(tag, 'ascii')
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length)
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, body])))
    return Buffer.concat([len, t, body, c])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8
  const raw = Buffer.concat(Array.from({ length: height }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(width, 0x80)])))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

async function attachReference(page, file) {
  await page.locator('button[aria-label="Add assets"]').click()
  const dialog = page.getByRole('dialog', { name: 'Add to Prompt' })
  const upload = file ?? { name: 'ref.png', mimeType: 'image/png', buffer: tinyPng() }
  await dialog.locator('input[type="file"]').setInputFiles(upload)
  await expect(dialog.getByRole('button', { name: new RegExp(upload.name.replace('.', '\\.')) }).first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Add to Prompt' }).click()
  await expect(page.locator('img[alt="Reference"]')).toBeVisible()
}

test('capabilities drive the chrome: footer, rail, chip, settings, no credits', async ({ page }) => {
  await openEditor(page)
  await expect(page.locator('footer')).toHaveText('Fake Nano renders solid colours, so double check it')
  await expect(page.getByText('Start creating or drop media')).toBeVisible()
  // surfaces the fake doesn't claim are simply absent
  await expect(page.locator('nav button[aria-label="Scenes"]')).toHaveCount(0)
  await expect(page.locator('nav button[aria-label="Tools"]')).toHaveCount(0)
  await expect(page.locator('nav button[aria-label="Trash"]')).toHaveCount(0)
  // the fake declares Agent mode since v0.2.0, so the pill is present — and off until clicked
  await expect(page.getByRole('button', { name: 'Agent', exact: true })).toHaveAttribute('aria-pressed', 'false')
  const chip = page.locator('button[aria-label="Output settings"]')
  await expect(chip).toContainText('Fake Nano')
  await expect(chip).toContainText('x2')
  await chip.click()
  const menu = page.locator('[role="menu"]')
  await expect(menu.getByRole('button', { name: 'Video', exact: true })).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Image', exact: true })).toBeVisible()
  await expect(menu.getByText('Size')).toBeVisible()
  await expect(menu.getByRole('button', { name: '720x1280' })).toBeVisible()
  await expect(menu.getByRole('switch', { name: 'Sound' })).toBeVisible()
  await expect(menu.getByRole('spinbutton', { name: 'Seed' })).toHaveValue('42')
  await expect(menu.getByText(/credits/)).toHaveCount(0)
})

test('upload → generate → poll → done, and it survives a reload', async ({ page }) => {
  await openEditor(page)
  await attachReference(page)
  await page.locator('[role="textbox"]').fill('a calm lake at dawn')
  await page.locator('button[aria-label="Generate"]').click()

  const batch = page.locator('section').first()
  await expect(batch.locator('aside')).toContainText('a calm lake at dawn')
  await expect(batch.locator('aside')).toContainText('Fake Nano')
  await expect(batch.locator('aside')).toContainText('16:9')
  await expect(batch.locator('aside')).not.toContainText('Resolution:')
  await expect(batch.locator('span', { hasText: /%$/ }).first()).toBeVisible()
  await expect(page.locator('img[alt="Reference"]')).toHaveCount(1) // the details column's copy; composer chip cleared

  await expect(batch.locator('img[alt="a calm lake at dawn"]')).toHaveCount(2, { timeout: 20000 })
  await expect(batch.locator('aside')).toContainText('Resolution: 1280x720')
  const poster = batch.locator('img[alt="a calm lake at dawn"]').first()
  await expect(poster).toHaveAttribute('src', /\/flow\/media\/out%3Afake-[0-9a-f]+\.png\?type=THUMBNAIL$/)
  await expect(poster).toHaveJSProperty('naturalWidth', 64)

  await page.reload()
  await expect(page.locator('section').first().locator('img[alt="a calm lake at dawn"]')).toHaveCount(2)
})

test('a failed job shows an honest failed tile', async ({ page }) => {
  await openEditor(page)
  await attachReference(page)
  await page.locator('[role="textbox"]').fill('please FAIL this one')
  await page.locator('button[aria-label="Generate"]').click()
  await expect(page.locator('section').first().getByText('Failed')).toHaveCount(2, { timeout: 20000 })
})

test('gateway rejections surface as a notice, not a silent nothing', async ({ page }) => {
  await openEditor(page)
  // Fake accepts references optionally; send a prompt the *gateway* will 422 by tampering the mode.
  await page.route('**/flow/generate', (route) => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ detail: 'frames: 999 is not one of [121, 189, 237]' }) }))
  await page.locator('[role="textbox"]').fill('anything')
  await page.locator('button[aria-label="Generate"]').click()
  await expect(page.getByRole('alert')).toContainText('frames: 999 is not one of')
  await expect(page.locator('section')).toHaveCount(0)
})

test('?adapter=mock switches the same bundle to the fixtures', async ({ page }) => {
  await page.goto(`${UI}?adapter=mock`)
  // the mock opens on its projects home (STORY-208); open the fixture project from its card
  await page.getByRole('link', { name: 'Open project' }).first().click()
  await expect(page).toHaveURL(/#\/project\/a88beb70/)
  await expect(page.locator('footer')).toHaveText('Google Flow can make mistakes, so double check it')
  await expect(page.locator('section')).toHaveCount(4)
})

test('STORY-608: the size the composer shows is the size the gateway records', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Agent', exact: true }).click()
  await page.getByRole('button', { name: 'Agent instructions', exact: true }).click()
  await page.getByTestId('instruction-picker').getByRole('radio').first().click()
  // the fake defaults to 1280x720; a portrait seed must flip the preview — and the run — to 720x1280
  await attachReference(page, { name: 'tall.png', mimeType: 'image/png', buffer: pngOf(768, 1376) })
  const chip = page.getByTestId('agent-size')
  await expect(chip).toContainText('720x1280')
  const shown = (await chip.innerText()).match(/\d+x\d+/)[0]   // the chip also carries the icon's ligature text
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.getByTestId('run-step')).toBeVisible()
  const recorded = await page.evaluate(async () => {
    const runs = await (await fetch('/flow/agent/runs')).json()
    return runs.sort((a, b) => b.created_at - a.created_at)[0]?.values?.size
  })
  expect(recorded).toBe(shown)
  // and with the reference removed the preview goes away rather than lingering
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('agent-size')).toHaveCount(0)
})
