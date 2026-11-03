import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const GOOD_PACK = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Web Preview' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
  css: '.mnt-clock { letter-spacing: 0.1em; }',
}
const reply = `\n\`\`\`json\n${JSON.stringify(GOOD_PACK, null, 2)}\n\`\`\``
const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim().toLowerCase())

async function openApp(page: Page, settings: Record<string, unknown> = {}) {
  await seedExistingUser(page, { language: 'en', ...settings })
  await page.goto('./')
  await expect(page.locator('.mnt-settings-entry').first()).toBeVisible()
}

test('fresh web visitors start in English while saved language is respected', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('New Tab')
})

test('saved Chinese language updates the web document title and language', async ({ page }) => {
  await openApp(page, { language: 'zh-CN' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page).toHaveTitle('新标签页')
})

test('web first screen has no chrome errors and stays under 500 KB', async ({ page }) => {
  const chromeErrors: string[] = []
  const scripts: Promise<number>[] = []
  page.on('console', message => { if (message.type() === 'error' && /chrome/i.test(message.text())) chromeErrors.push(message.text()) })
  page.on('pageerror', error => { if (/chrome/i.test(error.message)) chromeErrors.push(error.message) })
  page.on('response', response => {
    if (new URL(response.url()).pathname.endsWith('.js')) scripts.push(response.body().then(body => body.byteLength))
  })
  await openApp(page, { shortcuts: [] })
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.onboarding-card')).toContainText('Web data is separate')
  await page.waitForLoadState('networkidle')
  expect(chromeErrors).toEqual([])
  const total = (await Promise.all(scripts)).reduce((sum, bytes) => sum + bytes, 0)
  console.log(`web startup JavaScript: ${total} bytes`)
  expect(total).toBeGreaterThan(0)
  expect(total).toBeLessThanOrEqual(500_000)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon-180\.png/)
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Promptab')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'default')
  const manifest = await page.locator('link[rel="manifest"]').evaluate(async link => fetch((link as HTMLLinkElement).href).then(response => response.json()))
  expect(manifest.description).toBe('A customizable new tab with AI-assisted themes, shortcuts, widgets, optional weather, and browser sync.')
  expect(manifest.icons.slice(0, 3).map((icon: { src: string }) => icon.src)).toEqual(['icons/pwa-192.png', 'icons/pwa-512.png', 'icons/pwa-maskable-512.png'])
  expect(manifest.icons.slice(3).every((icon: { sizes: string }) => icon.sizes === 'any')).toBe(true)
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("font-src 'self' data: blob:")
  expect(csp).toContain("img-src 'self' data: blob: https:")
  expect(csp).toContain("media-src 'self' blob:")
  expect(csp).not.toMatch(/connect-src[^;]*blob:/)
  const policyBeforeBootstrap = await page.locator('meta[http-equiv="Content-Security-Policy"]').evaluate(policy => {
    const bootstrap = document.querySelector('script[src$="theme-bootstrap.js"]')
    return Boolean(bootstrap && (policy.compareDocumentPosition(bootstrap) & Node.DOCUMENT_POSITION_FOLLOWING))
  })
  expect(policyBeforeBootstrap).toBe(true)
})

test('settings, theme switching, and pasted AI preview work on the web', async ({ page }) => {
  await openApp(page)
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await openTab(page, 'appearance')
  await page.getByRole('button', { name: 'Moss', exact: true }).click()
  const before = await accent(page)
  await openTab(page, 'ai')
  await page.locator('.sd-ai textarea:not(.sd-ai-request)').fill(reply)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await page.locator('.sd-ai .sd-button', { hasText: /^(预览|Preview)$/ }).click()
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toContainText('Web Preview')
  await expect.poll(() => accent(page)).toBe('#7ee0c3')
  expect(before).not.toBe('#7ee0c3')
})

test('backup export can be imported back into web storage', async ({ page }) => {
  await openApp(page)
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'data')
  await expect(page.locator('[data-testid="browser-bookmark-import"]')).toContainText('Browser bookmark import needs extension APIs')
  await expect(page.getByRole('note')).toContainText('Browser sync is available in the installed extension.')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export backup|导出备份/ }).click()
  const download = await downloadPromise
  const backup = await download.path()
  expect(backup).toBeTruthy()
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(backup!)
  const parsed = JSON.parse(bytes.toString())
  expect(parsed.kind).toBe('mnt.backup')
  page.once('dialog', dialog => dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel(/Import backup|导入备份/).setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: bytes })
  await reloaded
  await expect(page.locator('.clock')).toBeVisible()
  const restored = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  })
  expect(restored).toEqual(parsed.profiles[0])
})

test('service worker keeps the app shell available offline', async ({ page, context }) => {
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.mnt-settings-entry').first()).toBeVisible()
  await expect(page.locator('.clock')).toBeVisible()
})

test('phone viewport has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openApp(page)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})

test('weather and gallery support cross-origin browser fetches', async ({ page }) => {
  await openApp(page)
  const results = await page.evaluate(async () => {
    const urls = [
      'https://zanderh-code.github.io/promptab/gallery/index.json',
      'https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74&current=temperature_2m&timezone=UTC',
    ]
    return Promise.all(urls.map(async url => {
      try { const response = await fetch(url); return { status: response.status, ok: response.ok } }
      catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
    }))
  })
  expect(results[0]).toMatchObject({ ok: true })
  expect(results[1]).toMatchObject({ ok: true })
})
