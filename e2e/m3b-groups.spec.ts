import { test, expect, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

type SeedGroup = { id: string; name: string; items: Array<{ id: string; name: string }> }

const defaultGroups: SeedGroup[] = [
  { id: 'a', name: 'First', items: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }] },
  { id: 'b', name: 'Second', items: [{ id: 'three', name: 'Three' }] },
]

async function enterEditMode(page: Page) {
  await page.locator('.app').click({ button: 'right', position: { x: 10, y: 10 } })
  await page.getByRole('menuitem', { name: /Manage groups|管理分组/ }).click()
  await expect(page.locator('.drag-handle').first()).toBeEnabled()
}

async function setup(page: Page, groups: SeedGroup[] = defaultGroups) {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(groups => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const item = profile.bookmarks.groups[0].items[0]
    profile.bookmarks.groups = groups.map(group => ({
      id: group.id, name: group.name, collapsed: false,
      items: group.items.map(entry => ({ ...item, id: entry.id, name: entry.name, builtinName: undefined, builtinGroup: undefined })),
    }))
    localStorage.setItem(key, JSON.stringify(snapshot))
  }, groups)
  await page.reload()
  await expect(page.getByText(groups[0].name, { exact: true })).toBeVisible()
  await enterEditMode(page)
}

test('mouse drags a bookmark to another group', async ({ page }) => {
  await setup(page)
  const source = page.locator('.shortcut-wrap').filter({ hasText: 'One' }).locator('.drag-handle')
  const target = page.locator('.shortcut-wrap').filter({ hasText: 'Three' })
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect(page.locator('.bookmarks > div').filter({ hasText: 'Second' }).locator('.shortcut').filter({ hasText: 'One' })).toBeVisible()
})

test('dropping a bookmark onto a tile in another group inserts before it', async ({ page }) => {
  await setup(page)
  const source = page.locator('.shortcut-wrap').filter({ hasText: 'Two' }).locator('.drag-handle')
  const target = page.locator('[data-drop-group="b"] .shortcut-wrap').filter({ hasText: 'Three' })
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 })
  await page.mouse.up()
  const second = page.locator('[data-drop-group="b"]')
  await expect.poll(() => second.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))).toEqual(['two', 'three'])
})

test('dropping on a group area appends after its last tile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  await setup(page)
  const source = page.locator('.shortcut-wrap').filter({ hasText: 'One' }).locator('.drag-handle')
  const group = page.locator('[data-drop-group="b"]')
  await source.scrollIntoViewIfNeeded()
  const from = (await source.boundingBox())!, header = (await group.locator('.mnt-group-title').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // The header is the group's own drop area, not a tile, so the drop appends.
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2, { steps: 20 })
  await page.mouse.up()
  await expect.poll(() => group.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))).toEqual(['three', 'one'])
})

test('reorders groups with the header buttons, disables the ends and persists', async ({ page }) => {
  await setup(page)
  const order = () => page.locator('.bookmarks [data-drop-group]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-drop-group')))
  const moveFirstUp = page.getByRole('button', { name: /Move First up|上移 First/ })
  const moveFirstDown = page.getByRole('button', { name: /Move First down|下移 First/ })
  const moveSecondUp = page.getByRole('button', { name: /Move Second up|上移 Second/ })
  const moveSecondDown = page.getByRole('button', { name: /Move Second down|下移 Second/ })
  await expect(moveFirstUp).toBeDisabled()
  await expect(moveSecondDown).toBeDisabled()
  await expect(moveFirstDown).toBeEnabled()
  await expect(moveSecondUp).toBeEnabled()
  await moveSecondUp.click()
  await expect.poll(order).toEqual(['b', 'a'])
  await expect(moveSecondUp).toBeDisabled()
  await expect(moveSecondDown).toBeEnabled()
  await page.keyboard.press('Control+z')
  await expect.poll(order).toEqual(['a', 'b'])
  await moveSecondUp.click()
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  await enterEditMode(page)
  await expect.poll(order).toEqual(['b', 'a'])
  await moveSecondDown.click()
  await expect.poll(order).toEqual(['a', 'b'])
})

test('sorts a group A–Z from the header and supports undo', async ({ page }) => {
  await setup(page, [
    { id: 'a', name: 'First', items: [{ id: 'z', name: 'Zebra' }, { id: 'a', name: 'apple' }, { id: 'm', name: 'Banana' }] },
    { id: 'b', name: 'Second', items: [{ id: 'three', name: 'Three' }] },
  ])
  const first = page.locator('[data-drop-group="a"]')
  const ids = () => first.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))
  await expect.poll(ids).toEqual(['z', 'a', 'm'])
  const sortFirst = page.getByRole('button', { name: /Sort First A–Z|将 First 按 A–Z 排序/ })
  await expect(sortFirst).toBeEnabled()
  await expect(page.getByRole('button', { name: /Sort Second A–Z|将 Second 按 A–Z 排序/ })).toBeDisabled()
  await sortFirst.click()
  await expect.poll(ids).toEqual(['a', 'm', 'z'])
  await page.keyboard.press('Control+z')
  await expect.poll(ids).toEqual(['z', 'a', 'm'])
})

test('keyboard reorders a bookmark within its group', async ({ page }) => {
  await setup(page)
  await page.addStyleTag({ content: '[data-drop-group="a"] .grid { display: flex; flex-direction: column; align-items: center; }' })
  const source = page.locator('.shortcut-wrap').filter({ hasText: 'One' }).locator('.drag-handle')
  const firstGroup = page.locator('.bookmarks > div').filter({ hasText: 'First' })
  await expect(source).toBeEnabled()
  await source.focus()
  await expect(source).toBeFocused()
  const announcement = page.locator('[id^="DndLiveRegion"]')
  await page.keyboard.press('Space')
  await expect(announcement).toContainText('Draggable item one was moved over droppable area one.')
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await page.keyboard.press('ArrowDown')
  await expect(announcement).toContainText('Draggable item one was moved over droppable area two.')
  await page.keyboard.press('Enter')
  await expect.poll(() => firstGroup.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))).toEqual(['two', 'one'])
})

test('keyboard moves a bookmark to another group and supports undo', async ({ page }) => {
  await setup(page)
  const website = page.getByRole('link', { name: /One/ })
  await website.focus()
  await expect(website).toBeFocused()
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const moveItem = page.getByRole('menuitem', { name: /Move to group|移动到分组/ })
  await expect(moveItem).toBeFocused()
  await page.keyboard.press('Enter')
  const picker = page.getByRole('combobox', { name: /Move to|移动到/ })
  await expect(picker).toBeVisible()
  await picker.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '移动', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  const secondGroup = page.locator('.bookmarks > div').filter({ hasText: 'Second' })
  await expect(secondGroup.locator('.shortcut').filter({ hasText: 'One' })).toBeVisible()
  await page.keyboard.press('Control+z')
  await expect(page.locator('.bookmarks > div').filter({ hasText: 'First' }).locator('.shortcut').filter({ hasText: 'One' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.bookmarks > div').filter({ hasText: 'First' }).locator('.shortcut').filter({ hasText: 'One' })).toBeVisible()
})

test('collapse persists and batch move and delete can be undone', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: /Collapse Second|收起 Second/ }).click()
  await expect(page.getByText('Three', { exact: true })).toBeHidden()
  await page.reload()
  // Collapsed remains stored for edit mode, but display mode opens the group as a folder.
  const folder = page.locator('button.mnt-folder[data-folder="b"]')
  await expect(folder).toBeVisible()
  await folder.click()
  await expect(page.getByRole('dialog', { name: 'Second' }).getByText('Three', { exact: true })).toBeVisible()
  await page.getByRole('dialog', { name: 'Second' }).getByRole('button', { name: /Close folder|关闭文件夹/ }).click()
  await page.locator('.app').click({ button: 'right', position: { x: 10, y: 10 } })
  await page.getByRole('menuitem', { name: /Manage groups|管理分组/ }).click()
  await expect(page.getByText('Three', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: /Expand Second|展开 Second/ }).click()
  await page.getByRole('checkbox', { name: /Select One|选择 One/ }).check()
  await page.getByRole('checkbox', { name: /Select Two|选择 Two/ }).check()
  await page.getByRole('combobox', { name: /Move selected to group|移动所选项目到分组/ }).selectOption('b')
  await expect(page.locator('.bookmarks > div').filter({ hasText: 'Second' }).locator('.shortcut')).toHaveCount(3)
  await page.getByRole('checkbox', { name: /Select One|选择 One/ }).check()
  await page.getByRole('checkbox', { name: /Select Two|选择 Two/ }).check()
  await page.getByRole('button', { name: /Delete selected|删除所选/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Delete|删除/, exact: true }).click()
  await expect(page.getByText('One', { exact: true })).toBeHidden()
  await page.keyboard.press('Control+z')
  await expect(page.getByText('One', { exact: true })).toBeVisible()
})
