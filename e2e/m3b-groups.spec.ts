import { test, expect, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

async function setup(page: Page) {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const item = profile.bookmarks.groups[0].items[0]
    profile.bookmarks.groups = [
      { id: 'a', name: 'First', collapsed: false, items: [{ ...item, id: 'one', name: 'One', builtinName: undefined, builtinGroup: undefined }, { ...item, id: 'two', name: 'Two', builtinName: undefined, builtinGroup: undefined }] },
      { id: 'b', name: 'Second', collapsed: false, items: [{ ...item, id: 'three', name: 'Three', builtinName: undefined, builtinGroup: undefined }] },
    ]
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.getByText('First', { exact: true })).toBeVisible()
  await page.locator('.app').click({ button: 'right', position: { x: 10, y: 10 } })
  await page.getByRole('menuitem', { name: /Manage groups|管理分组/ }).click()
  await expect(page.locator('.drag-handle').first()).toBeEnabled()
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

test('keyboard reorders a bookmark within its group', async ({ page }) => {
  await setup(page)
  const source = page.locator('.shortcut-wrap').filter({ hasText: 'One' }).locator('.drag-handle')
  await source.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  const firstGroup = page.locator('.bookmarks > div').filter({ hasText: 'First' })
  await expect(firstGroup.locator('.shortcut').filter({ hasText: 'Two' }).first()).toBeVisible()
  await expect(firstGroup.locator('.shortcut').filter({ hasText: 'One' }).first()).toBeVisible()
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
  await expect(page.getByText('Three', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: /Expand Second|展开 Second/ }).click()
  await page.locator('.app').click({ button: 'right', position: { x: 10, y: 10 } })
  await page.getByRole('menuitem', { name: /Manage groups|管理分组/ }).click()
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
