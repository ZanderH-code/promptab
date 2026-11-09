import { expect, test, type Page } from '@playwright/test'
import {
  center, dialogItem, expectIntegrity, folderTile, launchExtension, loadDragLayer, openApp, readGroups,
  seedGroups, seedSettings, tile, waitForOrders,
  type ExtensionSession, type SeedGroup,
} from './extension-fixture'
import { assertFollow, installFollowSampler, startFollow, stopFollow, waitForDragStart, waitForOver } from './drag-follow-fixture'

test.describe.configure({ timeout: 60_000 })

const item = (id: string) => ({ id, name: id.toUpperCase() })

async function setup(session: ExtensionSession, groups: SeedGroup[]) {
  await seedSettings(session)
  await openApp(session)
  await seedGroups(session.page, groups)
  await installFollowSampler(session.page)
}

/** A stepped drag that leaves the pointer still for a few frames so the sampler sees the settled state. */
async function mouseDragFollow(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, { steps = 30, midDrag }: { steps?: number; midDrag?: () => Promise<void> } = {}) {
  await startFollow(page)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(60)
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps)
    await page.waitForTimeout(16)
  }
  if (midDrag) await midDrag()
  await page.waitForTimeout(250)
  const frames = await stopFollow(page)
  await page.mouse.up()
  await page.waitForTimeout(300)
  return frames
}

async function touchDragFollow(context: ExtensionSession['context'], page: Page, from: { x: number; y: number }, to: { x: number; y: number }, { steps = 24, activeId, overId }: { steps?: number; activeId: string; overId: string }) {
  const cdp = await context.newCDPSession(page)
  const point = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1 }]
  await startFollow(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) })
  // Move as soon as activation is proven; a held finger long enough (550 ms) opens the app menu,
  // which cancels the drag.
  await waitForDragStart(page)
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps) })
    await page.waitForTimeout(16)
  }
  // Release on a real signal: dnd-kit has resolved `over` to the target, not a stale one.
  await waitForOver(page, activeId, overId)
  await page.waitForTimeout(100)
  const frames = await stopFollow(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await page.waitForTimeout(300)
  return frames
}

test('1. home reorder across rows stays under the cursor', async () => {
  const session = await launchExtension({ viewport: { width: 1280, height: 900 } })
  try {
    const page = session.page
    const ids = Array.from({ length: 12 }, (_, index) => `a${index + 1}`)
    await setup(session, [{ id: 'desk', name: 'Desktop', items: ids.map(item) }])
    const before = await readGroups(page)
    await loadDragLayer(page, 'a1')
    const from = await center(tile(page, 'a1')), to = await center(tile(page, 'a9'))
    expect(Math.abs(to.y - from.y) + Math.abs(to.x - from.x)).toBeGreaterThan(200)
    const frames = await mouseDragFollow(page, from, to)
    assertFollow(frames, 6)
    await waitForOrders(page, [['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a1', 'a10', 'a11', 'a12']])
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})

test('2. folder dialog reorder stays under the cursor', async () => {
  const session = await launchExtension({ viewport: { width: 1280, height: 900 } })
  try {
    const page = session.page
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['f1', 'f2', 'f3', 'f4', 'f5'].map(item) },
    ])
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await folderTile(page, 'folder-work').click()
    await expect(page.getByRole('dialog', { name: 'Work' })).toBeVisible()
    const from = await center(dialogItem(page, 'f1')), to = await center(dialogItem(page, 'f4'))
    const frames = await mouseDragFollow(page, from, to)
    assertFollow(frames, 6)
    await waitForOrders(page, [['a', 'b'], ['f2', 'f3', 'f4', 'f1', 'f5']])
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})

test('3. drag out of the folder dialog stays under the cursor across the close', async () => {
  const session = await launchExtension({ viewport: { width: 1280, height: 900 } })
  try {
    const page = session.page
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['x1', 'x2'].map(item) },
    ])
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await folderTile(page, 'folder-work').click()
    await expect(page.getByRole('dialog', { name: 'Work' })).toBeVisible()
    const from = await center(dialogItem(page, 'x1')), to = await center(tile(page, 'a'))
    const frames = await mouseDragFollow(page, from, to, { steps: 34 })
    await expect(page.getByRole('dialog', { name: 'Work' })).toHaveCount(0)
    assertFollow(frames, 6, { gap: true })
    await waitForOrders(page, [['x1', 'a', 'b'], ['x2']])
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})

test('4. drag onto a folder keeps following and shows the target highlight', async () => {
  const session = await launchExtension({ viewport: { width: 1280, height: 900 } })
  try {
    const page = session.page
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b', 'c'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['w1'].map(item) },
    ])
    const before = await readGroups(page)
    const folder = folderTile(page, 'folder-work')
    await loadDragLayer(page, 'a')
    const frames = await mouseDragFollow(page, await center(tile(page, 'a')), await center(folder), {
      midDrag: async () => {
        await expect(folder).toHaveAttribute('data-drop-target', 'true')
      },
    })
    assertFollow(frames, 6)
    await waitForOrders(page, [['b', 'c'], ['w1', 'a']])
    await expect(folder).not.toHaveAttribute('data-drop-target', 'true')
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})

test('5. touch hold-and-drag stays under the finger', async () => {
  const session = await launchExtension({ hasTouch: true, viewport: { width: 900, height: 800 } })
  try {
    const page = session.page
    const ids = Array.from({ length: 9 }, (_, index) => `u${index + 1}`)
    await setup(session, [{ id: 'desk', name: 'Desktop', items: ids.map(item) }])
    const before = await readGroups(page)
    await loadDragLayer(page, 'u1')
    const from = await center(tile(page, 'u1')), to = await center(tile(page, 'u6'))
    const frames = await touchDragFollow(session.context, page, from, to, { activeId: 'u1', overId: 'u6' })
    assertFollow(frames, 10)
    await waitForOrders(page, [['u2', 'u3', 'u4', 'u5', 'u6', 'u1', 'u7', 'u8', 'u9']])
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})
