import { expect, test } from '@playwright/test'
import {
  center, dragMouse, expectIntegrity, idsOf, launchExtension, loadDragLayer, openApp, readGroups, seedGroups, seedSettings,
  tile, waitForDomOrder, waitForOrders, type ExtensionSession, type SeedGroup,
} from './extension-fixture'

const item = (id: string) => ({ id, name: id.toUpperCase() })

async function setup(session: ExtensionSession, groups: SeedGroup[]) {
  await seedSettings(session)
  await openApp(session)
  await seedGroups(session.page, groups)
}


test('multi-tab: a stale tab adopts another tab save and both can drag', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b', 'c', 'd', 'e'].map(item) },
      { id: 'folder-work', name: 'Work', items: [item('w1')] },
    ])
    const pageA = session.page
    const pageB = await openApp(session, await session.context.newPage())
    const dialogs: string[] = []
    pageA.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss() })
    pageB.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss() })
    const before = await readGroups(pageA)

    await loadDragLayer(pageB, 'a')
    await dragMouse(pageB, await center(tile(pageB, 'a')), await center(tile(pageB, 'e')))
    await waitForOrders(pageB, [['b', 'c', 'd', 'e', 'a'], ['w1']])
    await pageA.bringToFront()
    await waitForDomOrder(pageA, ['b', 'c', 'd', 'e', 'a'])

    await loadDragLayer(pageA, 'b')
    await dragMouse(pageA, await center(tile(pageA, 'b')), await center(tile(pageA, 'e')))
    await waitForOrders(pageA, [['c', 'd', 'e', 'b', 'a'], ['w1']])
    await pageB.bringToFront()
    expect(idsOf(await readGroups(pageB))).toEqual([['c', 'd', 'e', 'b', 'a'], ['w1']])
    expectIntegrity(before, await readGroups(pageB))
    expect(dialogs).toEqual([])
    await expect(pageA.getByRole('alert')).toHaveCount(0)
  } finally { await session.close() }
})

test('multi-tab: concurrent drags keep every item once and apply both moves', async () => {
  const session = await launchExtension()
  try {
    const initial: SeedGroup[] = [{ id: 'desk', name: 'Desktop', items: ['a', 'b', 'c', 'd', 'e'].map(item) }]
    await setup(session, initial)
    const pageA = session.page
    const pageB = await openApp(session, await session.context.newPage())
    const alerts: string[] = []
    pageA.on('dialog', dialog => { alerts.push(dialog.message()); void dialog.dismiss() })
    pageB.on('dialog', dialog => { alerts.push(dialog.message()); void dialog.dismiss() })
    const before = await readGroups(pageA)

    for (let round = 0; round < 5; round++) {
      await seedGroups(pageA, initial)
      await pageB.reload()
      await expect(pageB.locator('.clock')).toBeVisible()
      await loadDragLayer(pageA, 'a')
      await loadDragLayer(pageB, 'e')
      await dragMouse(pageA, await center(tile(pageA, 'a')), await center(tile(pageA, 'b')), { release: false })
      await dragMouse(pageB, await center(tile(pageB, 'e')), await center(tile(pageB, 'd')), { release: false })
      await Promise.all([pageA.mouse.up(), pageB.mouse.up()])
      await waitForOrders(pageA, [['b', 'a', 'c', 'e', 'd']], 15_000)
      await pageA.waitForTimeout(200)
      const after = await readGroups(pageA)
      expect(idsOf(after)).toEqual([['b', 'a', 'c', 'e', 'd']])
      expectIntegrity(before, after)
      expect(await readGroups(pageB)).toEqual(after)
    }
    expect(alerts).toEqual([])
  } finally { await session.close() }
})

test('startup: the drag layer loads only after interaction', async () => {
  const session = await launchExtension()
  const page = session.page
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  try {
    await seedSettings(session)
    await openApp(session)
    await seedGroups(page, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: [item('w1')] },
    ])
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    expect(requests.filter(url => /DisplayDragGrid|EditingShortcutGrid|dnd|drag/i.test(url))).toEqual([])
    await loadDragLayer(page, 'a')
    expect(requests.some(url => /DisplayDragGrid/i.test(url))).toBe(true)
    expect(page.url()).toContain('/index.html')
  } finally { await session.close() }
})
