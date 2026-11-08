import { expect, test, type Page } from '@playwright/test'
import {
  center, dialogItem, dragMouse, expectIntegrity, folderTile, idsOf, itemIds, launchExtension,
  loadDragLayer, openApp, readGroups, readState, seedGroups, seedSettings, tile, waitForOrders,
  type ExtensionSession, type SeedGroup,
} from './extension-fixture'

async function openFolder(page: Page, id: string, name: string) {
  await folderTile(page, id).click()
  await expect(page.getByRole('dialog', { name })).toBeVisible()
}

const item = (id: string) => ({ id, name: id.toUpperCase() })

async function setup(session: ExtensionSession, groups: SeedGroup[]) {
  await seedSettings(session)
  await openApp(session)
  await seedGroups(session.page, groups)
}


test('Escape cancels a desktop drag without writing', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: [item('w1')] },
    ])
    const page = session.page
    const before = await readState(page)
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(tile(page, 'b')), { release: false })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(500)
    const after = await readState(page)
    expect(after.revision).toBe(before.revision)
    expect(after.groups).toEqual(before.groups)
    await expect(page.locator('.undo-toast')).toHaveCount(0)
  } finally { await session.close() }
})

test('Escape after leaving the folder dialog cancels and returns focus', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: ['w1', 'w2'].map(item) },
    ])
    const page = session.page
    const before = await readState(page)
    await loadDragLayer(page, 'a')
    await openFolder(page, 'folder-work', 'Work')
    const from = await center(dialogItem(page, 'w1'))
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x + 10, from.y, { steps: 2 })
    await page.mouse.move(20, 20, { steps: 10 })
    await expect(page.getByRole('dialog', { name: 'Work' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await page.waitForTimeout(500)
    const after = await readState(page)
    expect(after.revision).toBe(before.revision)
    expect(after.groups).toEqual(before.groups)
    await expect(page.locator('.undo-toast')).toHaveCount(0)
    await expect(folderTile(page, 'folder-work')).toBeFocused()
  } finally { await session.close() }
})

test('drops on empty background and on itself cancel without writing', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: ['a', 'b'].map(item) },
      { id: 'folder-work', name: 'Work', items: [item('w1')] },
    ])
    const page = session.page
    const before = await readState(page)
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), { x: 5, y: 5 })
    await page.waitForTimeout(500)
    let after = await readState(page)
    expect(after.revision).toBe(before.revision)
    expect(after.groups).toEqual(before.groups)
    await expect(page.locator('.undo-toast')).toHaveCount(0)

    const spot = await center(tile(page, 'b'))
    await dragMouse(page, spot, { x: spot.x + 20, y: spot.y }, { release: false })
    await page.mouse.move(spot.x, spot.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    after = await readState(page)
    expect(after.revision).toBe(before.revision)
    expect(after.groups).toEqual(before.groups)
    await expect(page.locator('.undo-toast')).toHaveCount(0)
  } finally { await session.close() }
})

test('handles one-item and empty-folder boundaries', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: [item('a')] },
      { id: 'folder-empty', name: 'Empty', items: [] },
    ])
    const page = session.page
    let before = await readState(page)
    await loadDragLayer(page, 'a')
    const spot = await center(tile(page, 'a'))
    await dragMouse(page, spot, { x: spot.x + 20, y: spot.y }, { release: false })
    await page.mouse.move(spot.x, spot.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    let after = await readState(page)
    expect(after.revision).toBe(before.revision)
    expect(after.groups).toEqual(before.groups)

    await dragMouse(page, await center(tile(page, 'a')), await center(folderTile(page, 'folder-empty')))
    await waitForOrders(page, [[], ['a']])
    await expect(folderTile(page, 'folder-empty')).toHaveAttribute('aria-label', 'Open folder Empty with 1 bookmarks')
    expectIntegrity(before.groups, await readGroups(page))
    await openFolder(page, 'folder-empty', 'Empty')
    await expect(dialogItem(page, 'a')).toBeVisible()
    after = await readState(page)
    expect(idsOf(after.groups)).toEqual([[], ['a']])
  } finally { await session.close() }
})

test('drags the last item out of a folder, leaving the empty hint', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [
      { id: 'desk', name: 'Desktop', items: [item('a')] },
      { id: 'folder-solo', name: 'Solo', items: [item('x')] },
    ])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'a')
    await openFolder(page, 'folder-solo', 'Solo')
    await dragMouse(page, await center(dialogItem(page, 'x')), await center(tile(page, 'a')))
    await waitForOrders(page, [['x', 'a'], []])
    expectIntegrity(before, await readGroups(page))
    await expect(folderTile(page, 'folder-solo')).toHaveAttribute('aria-label', 'Open folder Solo with 0 bookmarks')
    await page.waitForTimeout(500)
    await folderTile(page, 'folder-solo').click()
    await expect(page.getByRole('dialog', { name: 'Solo' })).toContainText('This folder is empty')
    await expect(page.getByRole('dialog', { name: 'Solo' })).toContainText('Switch to edit mode to add websites.')
  } finally { await session.close() }
})

test('auto-scrolls while dragging in a 900x500 viewport with 40 items', async () => {
  const session = await launchExtension({ viewport: { width: 900, height: 500 } })
  try {
    const items = Array.from({ length: 40 }, (_, index) => item(`i${index}`))
    await setup(session, [{ id: 'desk', name: 'Desktop', items }])
    const page = session.page
    const before = await readGroups(page)
    await loadDragLayer(page, 'i0')
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight > window.innerHeight)).toBe(true)
    await page.mouse.move((await center(tile(page, 'i0'))).x, (await center(tile(page, 'i0'))).y)
    await page.mouse.down()
    await page.mouse.move((await center(tile(page, 'i0'))).x + 10, (await center(tile(page, 'i0'))).y, { steps: 2 })
    await page.mouse.move(450, 495, { steps: 8 })
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(0)
    await page.mouse.move(450, 250, { steps: 8 })
    await page.mouse.up()
    await page.waitForFunction(() => document.querySelector('.bookmarks [data-sortable-id]')?.getAttribute('data-sortable-id') !== 'i0')
    const after = await readGroups(page)
    expect(itemIds(after)).toEqual(itemIds(before))
    expect(after[0].items[0].id).not.toBe('i0')
    expectIntegrity(before, after)
  } finally { await session.close() }
})

test('a click navigates and a drag does not', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [{ id: 'desk', name: 'Desktop', items: [
      { id: 'click', name: 'Click', url: 'https://example.com/clicked' },
      { id: 'other', name: 'Other', url: 'https://example.com/other' },
    ] }])
    const page = session.page
    await page.route('https://example.com/clicked', route => route.fulfill({ contentType: 'text/html', body: '<title>clicked</title>ok' }))
    await loadDragLayer(page, 'other')
    await dragMouse(page, await center(tile(page, 'click')), await center(tile(page, 'other')))
    await page.waitForTimeout(400)
    expect(page.url()).toContain('/index.html')
    await waitForOrders(page, [['other', 'click']])

    await page.route('https://example.com/other', route => route.fulfill({ contentType: 'text/html', body: '<title>other</title>ok' }))
    await page.locator('.bookmarks a[href="https://example.com/other"]').click()
    await page.waitForURL('https://example.com/other')
  } finally { await session.close() }
})

test('undo restores the order and storage', async () => {
  const session = await launchExtension()
  try {
    await setup(session, [{ id: 'desk', name: 'Desktop', items: ['a', 'b', 'c'].map(item) }])
    const page = session.page
    const before = await readState(page)
    await loadDragLayer(page, 'a')
    await dragMouse(page, await center(tile(page, 'a')), await center(tile(page, 'c')))
    await waitForOrders(page, [['b', 'c', 'a']])
    await expect(page.locator('.undo-toast')).toContainText('Undo')
    const dragged = await readState(page)
    expect(dragged.revision).toBeGreaterThan(before.revision)
    await page.keyboard.press('Control+z')
    await waitForOrders(page, [['a', 'b', 'c']])
    await expect(page.locator('.undo-toast')).toHaveCount(0)
    expect(await readGroups(page)).toEqual(before.groups)
  } finally { await session.close() }
})
