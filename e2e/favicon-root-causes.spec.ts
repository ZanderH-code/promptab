import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { seedExistingUser } from './helpers'

const cacheState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('mnt.iconCache:v3') || 'null'))
const profileStorage = (page: Page) => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()
  .filter(key => key === 'settings' || key.startsWith('profiles:v2:'))
  .map(key => [key, localStorage.getItem(key)])))

async function iconBytes(file: string) {
  return readFile(new URL(`../public/icons/${file}`, import.meta.url))
}

const svg = (size = 256) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#3a7"/></svg>`

async function seed(page: Page, shortcuts: Array<{ id: string; name: string; url: string; iconMode?: string }>) {
  await seedExistingUser(page, { language: 'en', iconSize: 64, shortcuts: shortcuts.map(item => ({ color: '#345678', icon: item.name[0], iconMode: item.iconMode ?? 'auto', ...item })) })
}

async function expectCache(page: Page) {
  await expect.poll(async () => Object.keys((await cacheState(page)) ?? {}).length).toBeGreaterThan(0)
  return cacheState(page)
}

test('chatgpt: fixed paths 404 and the bundled known icon wins', async ({ page }) => {
  const big = await iconBytes('icon128.png')
  await page.route('https://chatgpt.com/**', route => {
    const path = new URL(route.request().url()).pathname
    return path === '/unauth-mweb/images/chatgpt-icon-512x512.png'
      ? route.fulfill({ status: 200, contentType: 'image/png', body: big })
      : route.fulfill({ status: 404, body: 'missing' })
  })
  await seed(page, [{ id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' }])
  await page.goto('/')
  const icon = page.locator('.shortcut-icon img').first()
  await expect(icon).toHaveAttribute('src', 'https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png')
  await expect.poll(() => icon.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(128)
  const cache = await expectCache(page)
  expect(cache['https://chatgpt.com']).toMatchObject({ url: 'https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png', width: 128 })
})

test('v0: HTML answers for every fixed path fall through to the bundled SVG', async ({ page }) => {
  await page.route('https://v0.app/**', route => {
    const path = new URL(route.request().url()).pathname
    return path === '/assets/icon.svg'
      ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg() })
      : route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>app</title>' })
  })
  await seed(page, [{ id: 'v0', name: 'v0', url: 'https://v0.app' }])
  await page.goto('/')
  const icon = page.locator('.shortcut-icon img').first()
  await expect(icon).toHaveAttribute('src', 'https://v0.app/assets/icon.svg')
  await expect.poll(() => icon.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
})

test('gemini: every request fails, so the bundled brand mark replaces the letter', async ({ page }) => {
  await page.route('https://gemini.google.com/**', route => route.fulfill({ status: 404, body: 'missing' }))
  await seed(page, [{ id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com' }])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect(page.locator('.shortcut-icon')).toHaveText('')
  const cache = await expectCache(page)
  expect(cache['https://gemini.google.com']).toMatchObject({ brand: { slug: 'googlegemini' } })
})

test('instagram: a login page for every path falls back to the bundled brand mark', async ({ page }) => {
  await page.route('https://www.instagram.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Log in</title>' }))
  await seed(page, [{ id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com' }])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect(page.locator('.shortcut-icon')).toHaveText('')
})

test('outlook: the Microsoft onecdn touch icon loads from the known table', async ({ page }) => {
  const big = await iconBytes('icon128.png')
  await page.route('https://outlook.live.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Sign in</title>' }))
  await page.route('https://res.public.onecdn.static.microsoft/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: big }))
  await seed(page, [{ id: 'outlook', name: 'Outlook', url: 'https://outlook.live.com' }])
  await page.goto('/')
  const icon = page.locator('.shortcut-icon img').first()
  await expect(icon).toHaveAttribute('src', 'https://res.public.onecdn.static.microsoft/assets/mail/pwa/v4/pngs/apple-touch-icon.png')
})

test('deepseek: the chat WAF page falls through to the known table or the bundled brand mark', async ({ page }) => {
  const big = await iconBytes('icon128.png')
  await page.route('https://chat.deepseek.com/**', route => route.fulfill({ status: 202, contentType: 'text/html', body: '<html>verify</html>' }))
  await page.route('https://www.deepseek.com/*', route => route.fulfill({ status: 200, contentType: 'image/png', body: big }))
  await seed(page, [{ id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com' }])
  await page.goto('/')
  // Chromium delegates the exact default favicon path to its internal favicon service, which issues no
  // page request, so a known .ico URL cannot load in this browser; the bundled brand mark is the fallback.
  // The unit tests assert the known .ico URL is a candidate.
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect(page.locator('.shortcut-icon')).toHaveText('')
  const cache = await expectCache(page)
  expect(cache['https://chat.deepseek.com']).toMatchObject({ brand: { slug: 'deepseek' } })
})

test('youtube: an upscaled browser bitmap loses to the bundled brand mark without flashing the letter', async ({ page }) => {
  const upscaled = await readFile(new URL('./fixtures/upscaled-32-to-128.png', import.meta.url))
  const globe = await iconBytes('icon16.png')
  await page.addInitScript(() => {
    ;(window as typeof window & { chrome?: unknown }).chrome = { runtime: { getURL: (path: string) => `${location.origin}${path}` } }
  })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/_favicon/') return route.continue()
    return route.fulfill({ status: 200, contentType: 'image/png', body: url.searchParams.get('pageUrl')?.includes('promptab-') ? globe : upscaled })
  })
  await page.route('https://www.youtube.com/**', route => route.fulfill({ status: 404, body: 'missing' }))
  await seed(page, [{ id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com' }])
  await page.goto('/')
  await expect(page.locator('.shortcut').first()).toBeVisible()
  await page.locator('.shortcut-icon').evaluate(element => {
    ;(window as typeof window & { iconText?: string[] }).iconText = []
    new MutationObserver(() => (window as typeof window & { iconText: string[] }).iconText.push(element.textContent || '')).observe(element, { childList: true, subtree: true, characterData: true })
  })
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect(page.locator('.shortcut-icon')).toHaveText('')
  expect(await page.evaluate(() => (window as typeof window & { iconText: string[] }).iconText)).not.toContain('Y')
  const cache = await expectCache(page)
  expect(cache['https://www.youtube.com']).toMatchObject({ brand: { slug: 'youtube' } })
})

test('reddit: an upscaled browser bitmap loses to the real 128 px touch icon', async ({ page }) => {
  const upscaled = await readFile(new URL('./fixtures/upscaled-32-to-128.png', import.meta.url))
  const globe = await iconBytes('icon16.png')
  const big = await iconBytes('icon128.png')
  await page.addInitScript(() => {
    ;(window as typeof window & { chrome?: unknown }).chrome = { runtime: { getURL: (path: string) => `${location.origin}${path}` } }
  })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/_favicon/') return route.continue()
    return route.fulfill({ status: 200, contentType: 'image/png', body: url.searchParams.get('pageUrl')?.includes('promptab-') ? globe : upscaled })
  })
  await page.route('https://www.reddit.com/**', route => route.fulfill({ status: 404, body: 'missing' }))
  await page.route('https://www.reddit.com/apple-touch-icon-precomposed.png', route => route.fulfill({ status: 200, contentType: 'image/png', body: big }))
  await seed(page, [{ id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com' }])
  await page.goto('/')
  const icon = page.locator('.shortcut-icon img').first()
  await expect(icon).toHaveAttribute('src', 'https://www.reddit.com/apple-touch-icon-precomposed.png')
  await expect.poll(() => icon.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(128)
})

test('google maps keeps its own cache entry and icon, separate from the rest of google.com', async ({ page }) => {
  const big = await iconBytes('icon128.png')
  const small = await iconBytes('icon16.png')
  await page.route('https://www.gstatic.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: big }))
  await page.route('https://www.google.com/**', route => {
    const path = new URL(route.request().url()).pathname
    return path === '/favicon-32x32.png'
      ? route.fulfill({ status: 200, contentType: 'image/png', body: small })
      : route.fulfill({ status: 404, body: 'missing' })
  })
  await seed(page, [
    { id: 'maps', name: 'Google Maps', url: 'https://www.google.com/maps' },
    { id: 'search', name: 'Google Search', url: 'https://www.google.com/search?q=promptab' },
  ])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon img').nth(0)).toHaveAttribute('src', /maps_2025_round_color_1x_web_512dp\.png$/)
  await expect(page.locator('.shortcut-icon img').nth(1)).toHaveAttribute('src', 'https://www.google.com/favicon-32x32.png')
  await expect.poll(async () => Object.keys((await cacheState(page)) ?? {})).toEqual(expect.arrayContaining(['https://www.google.com/maps', 'https://www.google.com']))
})

test('dify prefers its bundled brand mark over a sharp site icon', async ({ page }) => {
  const big = await iconBytes('icon128.png')
  await page.route('https://dify.ai/**', route => {
    const path = new URL(route.request().url()).pathname
    return path.endsWith('.svg')
      ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg() })
      : route.fulfill({ status: 200, contentType: 'image/png', body: big })
  })
  await seed(page, [{ id: 'dify', name: 'Dify', url: 'https://dify.ai' }])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect(page.locator('.shortcut-icon')).toHaveText('')
  const cache = await expectCache(page)
  expect(cache['https://dify.ai']).toMatchObject({ brand: { slug: 'dify' } })
})

test('an unknown site with failed candidates still falls back to its letter', async ({ page }) => {
  await page.route('https://unknown-icon.example.test/**', route => route.fulfill({ status: 404, body: 'missing' }))
  await seed(page, [{ id: 'unknown', name: 'Unknown', url: 'https://unknown-icon.example.test' }])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon')).toContainText('U')
  const cache = await expectCache(page)
  expect(cache['https://unknown-icon.example.test']).toMatchObject({ failed: true, failures: 1 })
  expect(cache['https://unknown-icon.example.test'].expiresAt - cache['https://unknown-icon.example.test'].savedAt).toBe(60 * 60 * 1000)
})

test('a v1 failure in local storage is ignored so updated users retry at once', async ({ page }) => {
  await page.addInitScript(() => {
    const savedAt = Date.now()
    localStorage.setItem('mnt.iconCache:v1', JSON.stringify({ version: 1, entries: { 'https://retried.example.test': { failed: true, savedAt, expiresAt: savedAt + 6 * 60 * 60 * 1000 } } }))
  })
  const big = await iconBytes('icon128.png')
  await page.route('https://retried.example.test/**', route => route.fulfill({ status: 404, body: 'missing' }))
  await page.route('https://retried.example.test/favicon-32x32.png', route => route.fulfill({ status: 200, contentType: 'image/png', body: big }))
  await seed(page, [{ id: 'retried', name: 'Retried', url: 'https://retried.example.test' }])
  await page.goto('/')
  const icon = page.locator('.shortcut-icon img').first()
  await expect(icon).toHaveAttribute('src', 'https://retried.example.test/favicon-32x32.png')
  const cache = await expectCache(page)
  expect(cache['https://retried.example.test']).not.toMatchObject({ failed: true })
})

test('manual text and brand shortcuts on known sites never start discovery', async ({ page }) => {
  const requested: string[] = []
  await page.route('https://chatgpt.com/**', route => { requested.push(route.request().url()); return route.fulfill({ status: 404, body: 'missing' }) })
  await seed(page, [
    { id: 'manual-text', name: 'Chat text', url: 'https://chatgpt.com', iconMode: 'text' },
    { id: 'manual-brand', name: 'Chat brand', url: 'https://chatgpt.com/brand', iconMode: 'brand' },
  ])
  await page.goto('/')
  await expect(page.locator('.shortcut-icon')).toHaveCount(2)
  const before = await profileStorage(page)
  await page.mouse.move(3, 3)
  await page.waitForTimeout(300)
  expect(requested).toEqual([])
  expect(await cacheState(page)).toBeNull()
  expect(await profileStorage(page)).toBe(before)
})
