import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const base = 'https://zanderh-code.github.io/promptab/gallery/'
const colors = { bg: '#10141b', surface: '#19212a', text: '#ffffff', accent: '#7ee0c3' }
const prompt = { en: 'Try a calm dark theme', 'zh-CN': '试试安静的深色主题' }
const entry = { id: 'sample', name: 'Sample', author: 'Promptab', tags: ['dark'], prompt, colors, mode: 'dark', file: 'packs/sample.json' }
const index = { version: 1, packs: [entry] }
const pack = { kind: 'mnt.theme-pack', packVersion: 2, meta: { name: 'Sample', author: 'Promptab', tags: ['dark'], prompt }, theme: { mode: 'dark', color: colors }, css: '.mnt-clock { letter-spacing: 0.1em; }' }
const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }

async function openGallery(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  await page.getByRole('button', { name: 'Open theme gallery' }).click()
}

test('loads only when opened, previews, applies and undoes a gallery theme', async ({ page }) => {
  let requests = 0
  const galleryChunks: string[] = []
  page.on('request', request => { if (/\/Gallery-[^/]+\.js/.test(request.url())) galleryChunks.push(request.url()) })
  await page.route(`${base}**`, route => { requests++; return route.fulfill({ headers, json: route.request().url().endsWith('index.json') ? index : pack }) })
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  expect(requests).toBe(0)
  expect(galleryChunks).toHaveLength(0)
  await page.getByRole('button', { name: 'Open theme gallery' }).click()
  await expect(page.getByText('Try a calm dark theme')).toBeVisible()
  expect(requests).toBe(1)
  expect(galleryChunks).toHaveLength(1)
  const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim())
  await page.getByRole('button', { name: 'Sample' }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  expect(requests).toBe(2)
  await banner.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.locator('.undo-toast')).toBeVisible()
  await page.locator('.undo-toast').getByRole('button', { name: /undo/i }).click()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim())).toBe(before)
})

test('retries failed index and uses a marked cached index offline', async ({ page }) => {
  let offline = true
  await page.route(`${base}**`, route => offline ? route.abort() : route.fulfill({ headers, json: index }))
  await openGallery(page)
  await expect(page.getByRole('alert')).toContainText('Could not load')
  offline = false
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('button', { name: 'Sample' })).toBeVisible()
  offline = true
  await page.getByRole('button', { name: 'Close theme gallery' }).click()
  await page.getByRole('button', { name: 'Open theme gallery' }).click()
  await expect(page.getByText(/cached list/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sample' })).toBeVisible()
})

test('shows a localized error for an unsafe pack', async ({ page }) => {
  await page.route(`${base}**`, route => route.fulfill({ headers, json: route.request().url().endsWith('index.json') ? index : { ...pack, css: '@import "https://example.com/x.css";' } }))
  await seedExistingUser(page, { language: 'zh-CN' })
  await page.goto('/')
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  await page.getByRole('button', { name: '打开主题画廊' }).click()
  await page.getByRole('button', { name: 'Sample' }).click()
  await expect(page.getByRole('alert')).toContainText('主题包无效或不安全')
})

for (const [name, bad] of [
  ['external CSS URL', { ...pack, css: '.mnt-clock { background: url(https://example.com/a); }' }],
  ['import', { ...pack, css: '@import "https://example.com/a.css";' }],
  ['oversized', { ...pack, css: 'x'.repeat(530_000) }],
  ['unknown field', { ...pack, surprise: true }],
] as const) {
  test(`rejects ${name} in a downloaded pack`, async ({ page }) => {
    await page.route(`${base}**`, route => route.fulfill({ headers, json: route.request().url().endsWith('index.json') ? index : bad }))
    await openGallery(page)
    await page.getByRole('button', { name: 'Sample' }).click()
    await expect(page.getByRole('alert')).toContainText('invalid or unsafe')
    await expect(page.locator('.mnt-banner[data-kind="preview"]')).toHaveCount(0)
  })
}
