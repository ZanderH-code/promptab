import { chromium, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { seedExistingUser, openTab, templateBookmarks } from '../e2e/helpers'

// Run with a local preview server on 5173: npx vite-node scripts/record-gallery.ts
const base = 'https://zanderh-code.github.io/promptab/gallery/'
const gallery = resolve('docs/gallery')
const index = JSON.parse(await readFile(resolve(gallery, 'index.json'), 'utf8')) as { packs: { id: string; name: string; file: string }[] }
const browser = await chromium.launch()
const captures: { name: string; image: string }[] = []
await mkdir(resolve('store'), { recursive: true })
try {
  for (const [indexNumber, theme] of index.packs.entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' })
    const page = await context.newPage()
    try {
      await page.route(`${base}**`, async route => {
        const path = new URL(route.request().url()).pathname.replace('/promptab/gallery/', '')
        if (path !== 'index.json' && !/^packs\/[a-z0-9-]+\.json$/.test(path)) return route.abort()
        await route.fulfill({ body: await readFile(resolve(gallery, path)), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } })
      })
      await seedExistingUser(page, { language: 'en', shortcuts: templateBookmarks.slice(0, 6) })
      await page.clock.setFixedTime(new Date('2026-11-02T10:24:00Z'))
      await page.goto('http://127.0.0.1:5173/')
      await expect(page.locator('.shortcut')).toHaveCount(6)
      await page.locator('.mnt-settings-entry').click()
      await openTab(page, 'ai')
      await page.getByRole('button', { name: 'Open theme gallery' }).click()
      await expect(page.locator('.sd-gallery article')).toHaveCount(index.packs.length)
      if (indexNumber === 0) await page.screenshot({ path: resolve('store/gallery-list.png'), animations: 'disabled' })
      await page.locator('.sd-gallery article').nth(indexNumber).locator('button.sd-preset').click()
      const banner = page.locator('.mnt-banner[data-kind="preview"]')
      await expect(banner).toBeVisible()
      await banner.getByRole('button', { name: 'Apply', exact: true }).click()
      await page.getByRole('button', { name: 'Close settings' }).click()
      await expect(page.locator('.shortcut')).toHaveCount(6)
      await page.evaluate(() => document.fonts.ready)
      const image = await page.screenshot({ animations: 'disabled' })
      captures.push({ name: theme.name, image: image.toString('base64') })
      console.log(`Captured ${theme.name}`)
    } finally { await context.close() }
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 780 }, deviceScaleFactor: 1 })
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#eef1ef;font:16px system-ui;color:#102932}.grid{display:grid;grid-template-columns:repeat(4,360px)}figure{margin:0;height:260px;padding:4px}img{display:block;width:352px;height:220px}figcaption{text-align:center;padding:8px}</style><div class="grid">${captures.map(({ name, image }) => `<figure><img src="data:image/png;base64,${image}"><figcaption>${escape(name)}</figcaption></figure>`).join('')}</div>`)
  await page.screenshot({ path: resolve('store/gallery-preview.png') })
  await page.close()
} finally { await browser.close() }
console.log('Saved store/gallery-preview.png and store/gallery-list.png')
