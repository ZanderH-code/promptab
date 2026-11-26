import { test, expect, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

/** Two named groups, both shown as sections so either one can be added to from its own heading. */
async function seedTwoGroups(page: Page) {
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const item = profile.bookmarks.groups[0].items[0]
    profile.bookmarks.groups = [
      { id: 'a', name: 'First', collapsed: false, items: [{ ...item, id: 'one', name: 'One', builtinName: undefined, builtinGroup: undefined }] },
      { id: 'b', name: 'Second', collapsed: false, items: [{ ...item, id: 'two', name: 'Two', builtinName: undefined, builtinGroup: undefined }] },
    ]
    profile.widgets.find((widget: { type: string }) => widget.type === 'bookmarks').props.groupDisplay = 'sections'
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.getByText('Second', { exact: true })).toBeVisible()
}

async function savedGroups(page: Page) {
  return page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem('profiles:v2:generation:' + index.generation)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    return profile.bookmarks.groups.map((group: { id: string; items: { name: string }[] }) => [group.id, group.items.map(item => item.name)])
  })
}

test('the editor previews the draft tile and fits a phone-width dialog', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.add-shortcut').first().click()
  await expect(page.locator('.shortcut-editor')).toBeVisible()

  const preview = page.locator('.editor-preview-stage')
  await expect(preview).toHaveAttribute('inert', '')
  await expect(preview).toHaveAttribute('aria-hidden', 'true')
  const tile = preview.locator('.mnt-link')
  await page.getByLabel('URL', { exact: true }).fill('https://github.com')
  await page.getByLabel('Name', { exact: true }).fill('GitHub')
  await expect(tile).toContainText('GitHub')

  // The preview is pinned beside the form, inside the dialog and inside the phone viewport.
  const stage = (await preview.boundingBox())!
  const dialog = (await page.locator('.shortcut-editor').boundingBox())!
  expect(stage.x).toBeGreaterThanOrEqual(dialog.x)
  expect(stage.x + stage.width).toBeLessThanOrEqual(dialog.x + dialog.width)
  expect(stage.x + stage.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  expect(await page.locator('.shortcut-editor').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
})

test('a website added from a group saves into the group picked in the editor', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  // Let the first migration commit before rewriting its snapshot.
  await page.waitForTimeout(800)
  await seedTwoGroups(page)

  await page.keyboard.press('e')
  await page.locator('[data-drop-group="b"] .add-shortcut').click()
  await expect(page.locator('.shortcut-editor')).toBeVisible()
  const group = page.getByRole('combobox', { name: 'Group', exact: true })
  await expect(group).toHaveValue('b')
  await group.selectOption('a')
  await page.getByLabel('URL', { exact: true }).fill('https://example.org')
  await page.getByLabel('Name', { exact: true }).fill('Moved later')
  await page.getByRole('button', { name: 'Save website', exact: true }).click()
  await expect(page.locator('.shortcut-editor')).toHaveCount(0)

  await expect.poll(() => savedGroups(page)).toContainEqual(['a', ['One', 'Moved later']])
  expect(await savedGroups(page)).toContainEqual(['b', ['Two']])
})
