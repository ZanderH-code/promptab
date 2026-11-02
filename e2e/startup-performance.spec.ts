import { test, expect, type Response } from '@playwright/test'
import { gzipSync } from 'node:zlib'
import { seedExistingUser } from './helpers'

// Measure every script response, including modulepreloads and the synchronous theme bootstrap.
test('an existing profile loads at most 500 KB of JavaScript before interaction', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.route('**/favicon.ico', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.shortcut').first()).toBeVisible()
  // The first visit migrates the fixture; measure a new tab load of its saved v2 profile.
  const profile = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem('profiles:v2:generation:' + index.generation)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  })
  expect(profile.custom.css).toBe('')
  expect(profile.bookmarks.groups.some((group: { items: unknown[] }) => group.items.length > 0)).toBe(true)

  const scripts: Promise<{ path: string; raw: number; gzip: number }>[] = []
  const collect = (response: Response) => {
    if (!new URL(response.url()).pathname.endsWith('.js')) return
    scripts.push(response.body().then(body => ({
      path: new URL(response.url()).pathname, raw: body.byteLength, gzip: gzipSync(body).byteLength,
    })))
  }
  page.on('response', collect)
  await page.reload()
  await expect(page.locator('.shortcut').first()).toBeVisible()
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.drawer.sd')).toHaveCount(0)
  // Include late script requests after the app frame as well, so delaying an import cannot evade the budget.
  await page.waitForLoadState('networkidle')
  page.off('response', collect)
  const loaded = await Promise.all(scripts)
  const total = loaded.reduce((sum, script) => ({ raw: sum.raw + script.raw, gzip: sum.gzip + script.gzip }), { raw: 0, gzip: 0 })
  console.log(`existing-profile startup JavaScript: ${JSON.stringify({ scripts: loaded, total })} bytes`)
  expect(loaded.some(script => script.path.endsWith('/theme-bootstrap.js'))).toBe(true)
  expect(total.raw).toBeGreaterThan(0)
  expect(total.raw).toBeLessThanOrEqual(500_000)
})

test('records cold and cached browser paints and the loaded app frame', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' })
  const page = await context.newPage()
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.app .mnt-settings-entry') || !document.querySelector('.app .clock')) return
      observer.disconnect()
      requestAnimationFrame(() => requestAnimationFrame(() => performance.mark('app-content-frame')))
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  const cdp = await context.newCDPSession(page)
  for (const label of ['fresh-profile', 'existing-profile-cold-cache', 'existing-profile-warm-cache']) {
    if (label === 'existing-profile-cold-cache') await cdp.send('Network.clearBrowserCache')
    await page.goto('/')
    await expect(page.locator('.app .mnt-settings-entry').first()).toBeVisible()
    await page.waitForFunction(() => performance.getEntriesByName('app-content-frame').length > 0 && performance.getEntriesByName('first-contentful-paint').length > 0)
    const measurements = await page.evaluate(() => Object.fromEntries(['first-paint', 'first-contentful-paint', 'app-content-frame'].map(name => [name, performance.getEntriesByName(name)[0]?.startTime ?? null])))
    console.log(`${label}: ${JSON.stringify(measurements)} ms`)
    // This frame establishes app content, not wallpaper, custom CSS or font completion.
    expect(measurements['app-content-frame']).toBeLessThan(300)
  }
  await context.close()
})
