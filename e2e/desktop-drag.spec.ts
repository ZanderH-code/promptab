import { expect, test, type Page } from '@playwright/test'
import {
  center, dialogItem, dragMouse, expectIntegrity, folderTile, idsOf, itemIds, launchExtension,
  loadDragLayer, openApp, readGroups, readState, seedGroups, seedSettings, tile, waitForDomOrder, waitForOrders,
  type ExtensionSession, type SeedGroup, type StoredGroup,
} from './extension-fixture'

const item = (id: string) => ({ id, name: id.toUpperCase() })

async function setup(session: ExtensionSession, groups: SeedGroup[]) {
  await seedSettings(session)
  await openApp(session)
  await seedGroups(session.page, groups)
}

async function openFolder(page: Page, id: string, name: string) {
  await folderTile(page, id).click()
  await expect(page.getByRole('dialog', { name })).toBeVisible()
}

async function reload(page: Page) {
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
}

test('reorders on the desktop and persists after reload', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [{ id: 'desk', name: 'Desktop', items: ['a', 'b', 'c', 'd'].map(item) }])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(tile(page, 'd')))
    await waitForOrders(page, [['b', 'c', 'd', 'a']])
    expectIntegrity(before, await readGroups(page))
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['b', 'c', 'd', 'a']])
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(tile(page, 'b')))
    await waitForOrders(page, [['a', 'b', 'c', 'd']])
    expectIntegrity(before, await readGroups(page))
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['a', 'b', 'c', 'd']])
  } finally { await session.close() }
})

test('drags into a folder with a highlight and persists', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b', 'c'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['w1', 'w2'].map(item) },
    ])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(folderTile(page, 'folder-work')), { release: false })
    await expect(folderTile(page, 'folder-work')).toHaveAttribute('data-drop-target', 'true')
    await page.mouse.up()
    await waitForOrders(page, [['b', 'c'], ['w1', 'w2', 'a']])
    await expect(folderTile(page, 'folder-work')).not.toHaveAttribute('data-drop-target', 'true')
    await expect(folderTile(page, 'folder-work')).toHaveAttribute('aria-label', 'Open folder Work with 3 bookmarks')
    expectIntegrity(before, await readGroups(page))
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['b', 'c'], ['w1', 'w2', 'a']])
  } finally { await session.close() }
})

test('folder highlight clears on leave and cancel, and shows a visible ring', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b', 'c'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['w1'].map(item) },
    ])
    const page = session.page
    const before = await readGroups(page)
    const beforeState = await readState(page)
    const folder = folderTile(page, 'folder-work')
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(folder), { release: false })
    await expect(folder).toHaveAttribute('data-drop-target', 'true')
    // The attribute is only useful if it paints: a solid, non-transparent ring of at least 3 px.
    const ring = await folder.evaluate(el => {
      const style = getComputedStyle(el)
      return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor }
    })
    expect(ring.style).toBe('solid')
    expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(3)
    expect(ring.color).not.toBe('rgba(0, 0, 0, 0)')

    // Leave the folder: the highlight clears while the drag is still live.
    const leave = await center(tile(page, 'b'))
    await page.mouse.move(leave.x, leave.y, { steps: 8 })
    await expect(folder).not.toHaveAttribute('data-drop-target', 'true', { timeout: 1500 })

    // Back over the folder, then cancel: highlight clears and nothing is written.
    const back = await center(folder)
    await page.mouse.move(back.x, back.y, { steps: 8 })
    await expect(folder).toHaveAttribute('data-drop-target', 'true')
    await page.keyboard.press('Escape')
    await expect(folder).not.toHaveAttribute('data-drop-target', 'true', { timeout: 1500 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    const afterCancel = await readState(page)
    expect(afterCancel.revision).toBe(beforeState.revision)
    expect(afterCancel.groups).toEqual(beforeState.groups)

    // And a real drop clears it too, with the item moved into the folder.
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(folder), { release: false })
    await expect(folder).toHaveAttribute('data-drop-target', 'true')
    await page.mouse.up()
    await waitForOrders(page, [['b', 'c'], ['w1', 'a']])
    await expect(folder).not.toHaveAttribute('data-drop-target', 'true', { timeout: 1500 })
    expectIntegrity(before, await readGroups(page))
  } finally { await session.close() }
})

test('reorders inside a folder dialog', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: [item('a')] },
      { id: 'folder-work', name: 'Work', items: ['w1', 'w2', 'w3'].map(item) },
    ])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await openFolder(page, 'folder-work', 'Work')
    await dragMouse(page, await center(dialogItem(page, 'w3')), await center(dialogItem(page, 'w1')))
    await expect(page.getByRole('dialog', { name: 'Work' })).toBeVisible()
    await waitForOrders(page, [['a'], ['w3', 'w1', 'w2']])
    expectIntegrity(before, await readGroups(page))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Work' })).toHaveCount(0)
    await expect(folderTile(page, 'folder-work')).toBeFocused()
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['a'], ['w3', 'w1', 'w2']])
  } finally { await session.close() }
})

test('drags out of a folder onto the desktop and between folders', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-a', name: 'Folder A', items: ['x1', 'x2'].map(item) },
      { id: 'folder-b', name: 'Folder B', items: [item('y1')] },
    ])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await openFolder(page, 'folder-a', 'Folder A')
    await dragMouse(page, await center(dialogItem(page, 'x1')), await center(tile(page, 'a')))
    await expect(page.getByRole('dialog', { name: 'Folder A' })).toHaveCount(0)
    await waitForOrders(page, [['x1', 'a', 'b'], ['x2'], ['y1']])
    expectIntegrity(before, await readGroups(page))
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['x1', 'a', 'b'], ['x2'], ['y1']])

    await loadDragLayer(page, 'a')
    await openFolder(page, 'folder-a', 'Folder A')
    await dragMouse(page, await center(dialogItem(page, 'x2')), await center(folderTile(page, 'folder-b')), { release: false })
    await expect(folderTile(page, 'folder-b')).toHaveAttribute('data-drop-target', 'true')
    await page.mouse.up()
    await waitForOrders(page, [['x1', 'a', 'b'], [], ['y1', 'x2']])
    await expect(folderTile(page, 'folder-b')).not.toHaveAttribute('data-drop-target', 'true')
    expectIntegrity(before, await readGroups(page))
    await reload(page)
    expect(idsOf(await readGroups(page))).toEqual([['x1', 'a', 'b'], [], ['y1', 'x2']])
  } finally { await session.close() }
})
