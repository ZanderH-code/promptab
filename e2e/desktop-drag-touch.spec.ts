import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60_000 })
import {
  center, expectIntegrity, launchExtension, loadDragLayer, openApp, readGroups, seedGroups, seedSettings, tile, waitForOrders,
  type ExtensionSession, type SeedGroup,
} from './extension-fixture'

const item = (id: string) => ({ id, name: id.toUpperCase() })

async function setup(session: ExtensionSession, groups: SeedGroup[]) {
  await seedSettings(session)
  await openApp(session)
  await seedGroups(session.page, groups)
}


test('touch: hold and move reorders, hold opens the menu, swipe scrolls, tap navigates', async () => {
  const session = await launchExtension({ hasTouch: true, viewport: { width: 900, height: 800 } })
  try {
    const items = Array.from({ length: 40 }, (_, index) => index === 0
      ? { id: 'i0', name: 'I0', url: 'https://example.com/tap' }
      : item(`i${index}`))
    await setup(session, [{ id: 'desk', name: 'Desktop', items }])
    const page = session.page
    await page.route('https://example.com/tap', route => route.fulfill({ contentType: 'text/html', body: '<title>tap</title>ok' }))
    await loadDragLayer(page, 'i1')
    const cdp = await session.context.newCDPSession(page)
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Array<{ x: number; y: number }>) => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, index) => ({ x: Math.round(point.x), y: Math.round(point.y), id: index + 1 })) })
    }

    const from = await center(tile(page, 'i2')), to = await center(tile(page, 'i1'))
    await touch('touchStart', [from])
    await page.waitForTimeout(450)
    for (let step = 1; step <= 6; step++) await touch('touchMove', [{ x: from.x + (to.x - from.x) * step / 6, y: from.y + (to.y - from.y) * step / 6 }])
    await touch('touchEnd', [])
    await waitForOrders(page, [['i0', 'i2', 'i1', ...Array.from({ length: 37 }, (_, index) => `i${index + 3}`)]])

    const hold = await center(tile(page, 'i3'))
    await touch('touchStart', [hold])
    await expect(page.getByRole('menu')).toBeVisible({ timeout: 3000 })
    await touch('touchEnd', [])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)

    await page.evaluate(() => window.scrollTo(0, 0))
    const swipe = await center(tile(page, 'i4'))
    await touch('touchStart', [swipe])
    await touch('touchMove', [{ x: swipe.x, y: swipe.y - 80 }])
    await touch('touchMove', [{ x: swipe.x, y: swipe.y - 160 }])
    await touch('touchEnd', [])
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await page.evaluate(() => window.scrollTo(0, 0))
    await touch('touchStart', [await center(tile(page, 'i0'))])
    await touch('touchEnd', [])
    await page.waitForURL('https://example.com/tap')
  } finally { await session.close() }
})

test('touch: hold and move reorders at 390px', async () => {
  const session = await launchExtension({ hasTouch: true, viewport: { width: 390, height: 844 } })
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b', 'c'].map(item) },
      { id: 'folder-work', name: 'Work', items: [item('w1')] },
    ])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    const cdp = await session.context.newCDPSession(page)
    const from = await center(tile(page, 'c')), to = await center(tile(page, 'a'))
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(from.x), y: Math.round(from.y), id: 1 }] })
    await page.waitForTimeout(450)
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(from.x + (to.x - from.x) * step / 6), y: Math.round(from.y + (to.y - from.y) * step / 6), id: 1 }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await waitForOrders(page, [['c', 'a', 'b'], ['w1']])
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})
