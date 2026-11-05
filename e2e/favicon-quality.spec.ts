import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { seedExistingUser } from './helpers'

const SITE = 'https://icons.example.test'
const profileStorage = (page: Page) => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()
  .filter(key => key === 'settings' || key.startsWith('profiles:v2:'))
  .map(key => [key, localStorage.getItem(key)])))

async function iconBytes(file: string) {
  return readFile(new URL(`../public/icons/${file}`, import.meta.url))
}

async function seedAutoShortcut(page: Page, name: string, url = SITE) {
  await seedExistingUser(page, {
    language: 'en', iconSize: 64,
    shortcuts: [{ id: 'auto-icon', name, url, color: '#345678', icon: name[0], iconMode: 'auto' }],
  })
}

test('automatically sourced icons progressively upgrade without changing profile bytes', async ({ page }) => {
  const low = await iconBytes('icon16.png')
  let activeRequests = 0
  let maxActiveRequests = 0
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== SITE) { await route.continue(); return }
    activeRequests++
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
    try {
      if (url.pathname === '/favicon.ico' || url.pathname === '/apple-touch-icon.png' || url.pathname === '/apple-touch-icon-precomposed.png' || url.pathname === '/favicon-32x32.png') {
        await new Promise(resolve => setTimeout(resolve, 100))
        await route.fulfill({ status: 200, contentType: 'image/png', body: low })
      } else if (url.pathname === '/favicon.svg') {
        await new Promise(resolve => setTimeout(resolve, 250))
        await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#3a7"/></svg>' })
      } else await route.fulfill({ status: 404, body: 'missing' })
    } finally { activeRequests-- }
  })
  await seedAutoShortcut(page, 'Automatic')
  await page.goto('/')
  await expect(page.locator('.shortcut').first()).toBeVisible()
  const before = await profileStorage(page)
  await expect(page.locator('.shortcut-icon')).toContainText('A')
  const icon = page.locator('.shortcut-icon img')

  await page.locator('.shortcut-icon').first().hover()
  await expect(icon).toBeVisible()
  await expect.poll(() => icon.getAttribute('src')).toContain('apple-touch-icon')
  await expect(icon).toHaveAttribute('src', `${SITE}/favicon.svg`)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mnt.iconCache:v1'))).not.toBeNull()
  const cache = await page.evaluate(() => JSON.parse(localStorage.getItem('mnt.iconCache:v1')!))
  expect(cache.entries[SITE]).toMatchObject({ url: `${SITE}/favicon.svg`, width: 256, svg: true })
  expect(cache.entries[SITE].expiresAt - cache.entries[SITE].savedAt).toBe(7 * 24 * 60 * 60 * 1000)
  expect(maxActiveRequests).toBeLessThanOrEqual(3)
  expect(await profileStorage(page)).toBe(before)
  expect(await icon.getAttribute('referrerpolicy')).toBe('no-referrer')
})

test('all failed candidates return to the shortcut text and store a negative cache entry', async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === SITE ? route.fulfill({ status: 404, body: 'not found' }) : route.continue())
  await seedAutoShortcut(page, 'Fallback')
  await page.goto('/')
  await expect(page.locator('.shortcut').first()).toBeVisible()
  await page.locator('.shortcut-icon').first().hover()
  await expect(page.locator('.shortcut-icon')).toContainText('F')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mnt.iconCache:v1'))).not.toBeNull()
  const cache = await page.evaluate(() => JSON.parse(localStorage.getItem('mnt.iconCache:v1')!))
  expect(cache.entries[SITE]).toMatchObject({ failed: true })
  expect(cache.entries[SITE].expiresAt - cache.entries[SITE].savedAt).toBe(6 * 60 * 60 * 1000)
})

test('manual image, brand, Lucide, emoji and text icons never start favicon discovery', async ({ page }) => {
  const manualImage = `data:image/png;base64,${(await iconBytes('icon16.png')).toString('base64')}`
  const requested: string[] = []
  await page.route('https://manual-icons.example.test/**', async route => {
    requested.push(route.request().url())
    await route.fulfill({ status: 200, contentType: 'image/png', body: await iconBytes('icon16.png') })
  })
  await seedExistingUser(page, {
    language: 'en',
    shortcuts: [
      { id: 'manual-image', name: 'Manual image', url: 'https://manual-icons.example.test/image', color: '#345678', icon: 'M', iconMode: 'auto', image: manualImage },
      { id: 'manual-brand', name: 'Manual brand', url: 'https://manual-icons.example.test/brand', color: '#345678', icon: 'B', iconMode: 'brand', brand: { slug: 'brand', title: 'Brand', path: 'M2 2h20v20H2z', hex: '345678' } },
      { id: 'manual-lucide', name: 'Manual Lucide', url: 'https://manual-icons.example.test/lucide', color: '#345678', icon: 'L', iconMode: 'lucide', iconName: 'house' },
      { id: 'manual-emoji', name: 'Manual emoji', url: 'https://manual-icons.example.test/emoji', color: '#345678', icon: '🌻', iconMode: 'emoji', iconName: '🌻' },
      { id: 'manual-text', name: 'Manual text', url: 'https://manual-icons.example.test/text', color: '#345678', icon: 'TX', iconMode: 'text' },
    ],
  })
  await page.goto('/')
  await expect(page.locator('.shortcut-icon')).toHaveCount(5)
  const before = await profileStorage(page)
  await page.mouse.move(3, 3)
  await page.waitForTimeout(150)
  expect(requested).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('mnt.iconCache:v1'))).toBeNull()
  expect(await profileStorage(page)).toBe(before)
})
