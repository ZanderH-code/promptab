import { test, expect } from '@playwright/test'
import { seedExistingUser } from './helpers'

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`first edit, drag and editor preserve the desktop at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.stack ?? error.message))
    const scripts: string[] = []
    page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()) })
    await seedExistingUser(page, { language: 'en' })
    await page.goto('/')
    await expect(page.locator('.shortcut').first()).toBeVisible()
    await page.evaluate(() => {
      const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
      const key = `profiles:v2:generation:${index.generation}`
      const snapshot = JSON.parse(localStorage.getItem(key)!)
      const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
      const item = profile.bookmarks.groups[0].items[0]
      profile.bookmarks.groups[0].items = [
        { ...item, id: 'one', name: 'One', builtinName: undefined, builtinGroup: undefined },
        { ...item, id: 'two', name: 'Two', builtinName: undefined, builtinGroup: undefined },
      ]
      localStorage.setItem(key, JSON.stringify(snapshot))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Restrict this assertion to interaction errors; the web preview has a pre-existing sync startup error.
    errors.length = 0
    expect(scripts.some(url => /EditingShortcutGrid|ShortcutEditor/.test(url))).toBe(false)
    const one = page.locator('.shortcut-wrap').filter({ hasText: 'One' })
    const before = (await one.boundingBox())!
    const linkBefore = (await one.locator('.shortcut').boundingBox())!

    // Hold the first edit download: the normal grid must remain usable while it loads.
    let requested = false
    let release!: () => void
    const ready = new Promise<void>(resolve => { release = resolve })
    await page.route('**/EditingShortcutGrid-*.js', async route => {
      requested = true
      await ready
      await route.continue()
    })
    let pending = before
    let pendingClockY = 0
    try {
      await page.keyboard.press('e')
      await expect.poll(() => requested).toBe(true)
      await expect(one.locator('.shortcut')).toBeVisible()
      await expect(one.locator('.drag-handle')).toBeDisabled()
      await expect(page.locator('.bookmarks')).toHaveAttribute('aria-busy', 'true')
      pending = (await one.boundingBox())!
      pendingClockY = (await page.locator('.clock').boundingBox())!.y
    } finally {
      release()
    }
    const handle = one.locator('.drag-handle')
    await expect(handle).toBeEnabled()
    await expect(page.locator('.bookmarks')).not.toHaveAttribute('aria-busy', 'true')
    const loaded = (await one.boundingBox())!
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(pending[dimension] - loaded[dimension])).toBeLessThan(2)
    }
    expect(Math.abs(pendingClockY - (await page.locator('.clock').boundingBox())!.y)).toBeLessThan(2)
    const linkAfter = (await one.locator('.shortcut').boundingBox())!
    // Edit controls add space around a tile; the link itself must keep its size and column.
    for (const dimension of ['x', 'width', 'height'] as const) {
      expect(Math.abs(linkBefore[dimension] - linkAfter[dimension])).toBeLessThan(2)
    }
    await expect(page.locator('.clock')).toBeVisible()
    expect(scripts.some(url => /ShortcutEditor-/.test(url))).toBe(false)

    const target = page.locator('.shortcut-wrap').filter({ hasText: 'Two' })
    const from = (await handle.boundingBox())!, to = (await target.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
    await page.mouse.up()
    await expect(page.locator('.shortcut-wrap').first()).toContainText('Two')
    await page.getByRole('button', { name: 'Edit One', exact: true }).click()
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('One')
    expect(scripts.some(url => /ShortcutEditor-/.test(url))).toBe(true)
    expect(errors).toEqual([])
  })
}
