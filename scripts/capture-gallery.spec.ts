import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { siYoutube, siReddit, siGmail, siGithub, siGoogledrive, siGooglecalendar } from 'simple-icons'
import { seedExistingUser, openTab } from '../e2e/helpers'

const brands = [['youtube', 'YouTube', 'https://youtube.com', siYoutube], ['reddit', 'Reddit', 'https://reddit.com', siReddit], ['gmail', 'Gmail', 'https://mail.google.com', siGmail], ['github', 'GitHub', 'https://github.com', siGithub], ['drive', 'Google Drive', 'https://drive.google.com', siGoogledrive], ['calendar', 'Calendar', 'https://calendar.google.com', siGooglecalendar]] as const
const shortcuts = brands.map(([id, name, url, brand]) => ({ id, name, url, color: `#${brand.hex}`, icon: name[0], iconMode: 'brand', iconName: brand.slug, brand: { slug: brand.slug, title: brand.title, path: brand.path, hex: brand.hex } }))
shortcuts.splice(5, 0, { id: 'code', name: 'Code', url: 'https://example.com/code', color: '#3a5a80', icon: 'C', iconMode: 'lucide', iconName: 'code', brand: undefined as never })

test('capture original gallery previews', async ({ browser }) => {
  const root = resolve('docs/gallery')
  const index = JSON.parse(await readFile(resolve(root, 'index.json'), 'utf8')) as { packs: { id: string; file: string }[] }
  await mkdir(resolve(root, 'previews'), { recursive: true })
  for (const item of index.packs) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5, locale: 'en-US', timezoneId: 'UTC' })
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
    await seedExistingUser(page, { language: 'en', shortcuts, iconSize: 64 })
    await page.goto('http://127.0.0.1:4399/')
    await expect(page.locator('.clock')).toBeVisible()
    await page.locator('.mnt-settings-entry').first().click()
    await openTab(page, 'ai')
    const pack = await readFile(resolve(root, item.file), 'utf8')
    await page.getByRole('textbox', { name: "The AI's reply" }).fill(`\`\`\`json\n${pack}\n\`\`\``)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const banner = page.locator('.mnt-banner[data-kind="preview"]')
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: resolve(root, 'previews', `${item.id}.png`), animations: 'disabled', style: '.undo-toast { visibility: hidden !important; }' })
    await context.close()
  }
})
