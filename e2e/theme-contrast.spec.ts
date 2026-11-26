import { expect, test } from '@playwright/test'
import { seedExistingUser } from './helpers'

test('the cached first paint matches the page a light profile renders', async ({ page }) => {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    // A solid colour left over from dark mode: the light palette, not this colour, is what the page paints.
    profile.theme.mode = 'light'
    profile.theme.colorLight = { bg: '#eeeae4', surface: '#f8f7f3', text: '#302d29', accent: '#3a5a80' }
    profile.background = { type: 'color', color: '#102932', dim: 35 }
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  // The cache is rewritten once the loaded profile renders; the old code settled on the dark colour.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mnt:theme-cache:v1') ?? '{}').background)).toBe('#eeeae4')
  const paint = await page.evaluate(() => {
    const cache = JSON.parse(localStorage.getItem('mnt:theme-cache:v1')!)
    // What theme-bootstrap.js does with the cache before React runs.
    document.documentElement.style.setProperty('--mnt-scheme-bg', cache.background)
    const probe = document.createElement('div')
    probe.style.background = 'var(--mnt-scheme-bg)'
    document.body.append(probe)
    const boot = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { cache: cache.background, boot, rendered: getComputedStyle(document.querySelector('.mnt-root')!).backgroundColor }
  })
  expect(paint.cache).toBe('#eeeae4')
  expect(paint.boot).toBe(paint.rendered)
})

test('a website’s own background plate gets readable text, a faint plate keeps the theme text', async ({ page }) => {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const link = (id: string, tile?: Record<string, unknown>) => ({ id, name: id, url: `https://${id}.example`, color: '#333333', icon: id[0].toUpperCase(), iconMode: 'text', ...(tile ? { tile } : {}) })
    profile.bookmarks.groups[0].items = [
      link('plate', { background: '#102932' }),
      link('faint', { background: '#102932', opacity: 30 }),
      link('plain'),
    ]
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  const color = (id: string, selector: string) => page.locator(`[data-link-id="${id}"] ${selector}`).evaluate(element => getComputedStyle(element).color)
  // Black/white ink chosen for the plate: a dark site colour on a dark plate would be unreadable.
  expect(await color('plate', '.mnt-link-name')).toBe('rgb(255, 255, 255)')
  expect(await color('plate', '.shortcut-icon')).toBe('rgb(255, 255, 255)')
  // A faint plate lets the page through, so the label keeps the theme's own text colour...
  expect(await color('faint', '.mnt-link-name')).toBe(await color('plain', '.mnt-link-name'))
  // ...and so does the site mark, which keeps its colour rather than switching to white ink.
  expect(await color('faint', '.shortcut-icon')).not.toBe('rgb(255, 255, 255)')
})
