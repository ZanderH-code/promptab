import { test, expect } from '@playwright/test'

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
