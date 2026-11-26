import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

const shortcuts = [
  { id: 'a', name: 'Alpha', url: 'https://example.com/a', color: '#90d5cd', icon: 'A' },
  { id: 'b', name: 'Bravo', url: 'https://example.com/b', color: '#3a5a80', icon: 'B' },
  { id: 'c', name: 'Charlie', url: 'https://example.com/c', color: '#b0a092', icon: 'C' },
]

const ids = (page: Page) => page.locator('.bookmarks [data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))

/** Tabs until a bookmark tile link has focus, like a keyboard-only visitor would. */
async function focusTile(page: Page) {
  for (let presses = 0; presses < 30; presses++) {
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest?.('.bookmarks [data-sortable-id]')))
    if (inside) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Tab never reached a bookmark tile')
}

test('keyboard focus loads the drag layer and Space/arrows reorder it', async ({ page }) => {
  await seedExistingUser(page, { shortcuts })
  await page.goto('/')
  await expect(page.locator('.bookmarks [data-sortable-id]')).toHaveCount(3)

  await focusTile(page)
  // Tab focus alone must swap in the drag layer, or the advertised keyboard drag is unreachable.
  await expect(page.locator('.bookmarks[data-display-drag]')).toBeVisible()
  await expect(page.locator('.bookmarks [data-sortable-id="a"] a:focus')).toHaveCount(1)
  const audit = await new AxeBuilder({ page }).analyze()
  expect(audit.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical'), 'keyboard drag layer').toEqual([])

  // One tab stop per tile: the next stop is the next tile's link, not the sortable wrapper.
  await page.keyboard.press('Tab')
  const next = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.closest?.('[data-sortable-id]')?.getAttribute('data-sortable-id'),
  }))
  expect(next).toEqual({ tag: 'A', id: 'b' })
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.bookmarks [data-sortable-id="a"] a:focus')).toHaveCount(1)

  await page.keyboard.press('Space')
  await expect(page.locator('.mnt-drag-overlay')).toBeVisible()
  // dnd-kit measures the drop targets after pick-up; wait for its announcements, as a screen reader user would.
  const live = page.locator('[id^="DndLiveRegion"]')
  await expect(live).toHaveText(/position 1|第 1 个/)
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText(/position 2|第 2 个/)
  await page.keyboard.press('Space')
  await expect.poll(() => ids(page)).toEqual(['b', 'a', 'c'])
  // Focus follows the tile that moved, so the next Space drags the same tile.
  expect(await page.evaluate(() => document.activeElement?.closest?.('[data-sortable-id]')?.getAttribute('data-sortable-id'))).toBe('a')

  await page.reload()
  await expect(page.locator('.bookmarks [data-sortable-id]')).toHaveCount(3)
  expect(await ids(page)).toEqual(['b', 'a', 'c'])
})

test('Enter still opens the tile link instead of picking it up', async ({ page }) => {
  await seedExistingUser(page, { shortcuts })
  await page.route('https://example.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Example</title>' }))
  await page.goto('/')
  await expect(page.locator('.bookmarks [data-sortable-id] a')).toHaveCount(3)

  await focusTile(page)
  await expect(page.locator('.bookmarks[data-display-drag]')).toBeVisible()
  await expect(page.locator('.bookmarks[data-display-drag] [data-sortable-id="a"] a')).toBeFocused()
  const navigation = page.waitForURL('https://example.com/a')
  await page.keyboard.press('Enter')
  await navigation
  await expect(page).toHaveTitle('Example')
})
