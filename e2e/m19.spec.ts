import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

async function openApp(page: import('@playwright/test').Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./')
  await expect(page.locator('.clock')).toBeVisible()
}

async function openSettings(page: import('@playwright/test').Page, tab: 'appearance' | 'search' = 'appearance') {
  await page.locator('.settings-button').click()
  await openTab(page, tab)
}

async function changeAccent(page: import('@playwright/test').Page, value: string) {
  await openTab(page, 'appearance')
  const field = page.getByLabel('Accent color hex value', { exact: true })
  await field.fill(value)
  await field.press('Enter')
}

test('independent shortcut and search preferences open links in new tabs', async ({ page }) => {
  await openApp(page)
  await openSettings(page)
  const shortcutToggle = page.getByLabel('Open shortcuts in a new tab', { exact: true })
  await shortcutToggle.click()
  await expect(shortcutToggle).toBeChecked()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const shortcutPopup = page.waitForEvent('popup')
  await page.locator('.shortcut').first().click()
  expect(new URL((await shortcutPopup).url()).hostname).toBe('example.com')

  await openSettings(page, 'search')
  const searchToggle = page.getByLabel('Open search results in a new tab', { exact: true })
  await searchToggle.click()
  await expect(searchToggle).toBeChecked()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const searchPopup = page.waitForEvent('popup')
  await page.locator('#search').fill('new tab check')
  await page.locator('#search').press('Enter')
  expect(new URL((await searchPopup).url()).searchParams.get('q')).toBe('new tab check')
})

test('keyboard shortcuts help, skip typing targets, and can be disabled', async ({ page }) => {
  await openApp(page)
  await page.keyboard.press('/')
  await expect(page.locator('#search')).toBeFocused()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0)
  await page.locator('.settings-button').focus()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('.settings-button').focus()
  await page.keyboard.press('a')
  await expect(page.locator('.shortcut-editor')).toBeVisible()
  await page.locator('.editor-close').click()
  await page.locator('.settings-button').focus()
  await page.keyboard.press(',')
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const currentTheme = await page.locator('html').getAttribute('data-theme')
  await page.locator('.settings-button').focus()
  await page.keyboard.press('d')
  await expect(page.locator('html')).toHaveAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light')

  await page.locator('#search').focus()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.locator('.settings-button').focus()
  await openSettings(page)
  const keyboardToggle = page.getByLabel('Enable keyboard shortcuts', { exact: true })
  await keyboardToggle.click()
  await expect(keyboardToggle).not.toBeChecked()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
})

test('theme library previews, applies, undoes, and exports saved themes', async ({ page }) => {
  await openApp(page)
  await openSettings(page)
  const original = await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--mnt-accent').trim())
  page.once('dialog', dialog => dialog.accept('Saved Theme'))
  await page.getByRole('button', { name: 'Save current as my theme' }).click()
  await expect(page.getByText('Saved Theme', { exact: true })).toBeVisible()

  await changeAccent(page, '#223344')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toBeVisible()
  await expect.poll(() => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--mnt-accent').trim())).toBe(original)
  await page.locator('.mnt-banner[data-kind="preview"]').getByRole('button', { name: 'Apply' }).click()
  await expect(page.locator('.undo-toast')).toBeVisible()
  await page.locator('.undo-toast').getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--mnt-accent').trim())).toBe('#223344')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('saved-theme.theme-pack.json')
})

test('accent cycle changes runtime tokens without writing profile history', async ({ page }) => {
  await openApp(page)
  await openSettings(page)
  await page.getByRole('combobox', { name: 'Accent on open', exact: true }).click()
  await page.getByRole('option', { name: 'Cycle through a palette', exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const before = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return { snapshot: JSON.stringify(snapshot), history: JSON.stringify(snapshot.history), accent: getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim() }
  })
  await page.reload()
  const afterFirst = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return { snapshot: JSON.stringify(snapshot), history: JSON.stringify(snapshot.history), accent: getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim() }
  })
  await page.reload()
  const afterSecond = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return { snapshot: JSON.stringify(snapshot), history: JSON.stringify(snapshot.history), accent: getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim() }
  })
  expect(afterFirst.history).toBe(before.history)
  expect(afterSecond.history).toBe(before.history)
  expect(afterFirst.snapshot).toBe(before.snapshot)
  expect(afterSecond.snapshot).toBe(before.snapshot)
  expect(afterFirst.accent).not.toBe(afterSecond.accent)
})

test('random accent selection stays outside profile history and sync state', async ({ page }) => {
  await openApp(page)
  await openSettings(page)
  await page.getByRole('combobox', { name: 'Accent on open', exact: true }).click()
  await page.getByRole('option', { name: 'Random each new tab', exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const before = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    return JSON.stringify(JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!))
  })
  await page.reload()
  const after = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    const selected = sessionStorage.getItem('mnt:accent-selection:v1')
    const cache = JSON.parse(localStorage.getItem('mnt:theme-cache:v1')!)
    return { snapshot: JSON.stringify(snapshot), selected, accent: getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim(), variants: cache.accentVariants.map((item: { accent: string }) => item.accent) }
  })
  expect(after.snapshot).toBe(before)
  expect(after.selected).toBe(after.accent)
  expect(after.variants).toContain(after.selected)
})

test('group context menu confirms opening more than eight links', async ({ page }) => {
  await openApp(page)
  const keys = ['profiles:v2:index', 'profiles:v2:generation:']
  await page.evaluate(([indexKey, generationPrefix]) => {
    const index = JSON.parse(localStorage.getItem(indexKey)!)
    const key = generationPrefix + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    profile.bookmarks.groups[0].items = Array.from({ length: 9 }, (_, i) => ({ ...profile.bookmarks.groups[0].items[0], id: `link-${i}`, name: `Link ${i}`, url: `https://example.com/${i}` }))
    localStorage.setItem(key, JSON.stringify(snapshot))
  }, keys)
  await page.reload()
  await page.locator('.shortcuts-heading').first().click({ button: 'right' })
  let confirmation = ''
  page.once('dialog', dialog => { confirmation = dialog.message(); void dialog.dismiss() })
  await page.getByRole('menuitem', { name: 'Open all' }).click()
  expect(confirmation).toContain('9')
})

test('group menu opens from the focused title and returns focus on Escape', async ({ page }) => {
  await openApp(page)
  const keys = ['profiles:v2:index', 'profiles:v2:generation:']
  await page.evaluate(([indexKey, generationPrefix]) => {
    const index = JSON.parse(localStorage.getItem(indexKey)!)
    const key = generationPrefix + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    profile.bookmarks.groups[0].items = Array.from({ length: 9 }, (_, i) => ({ ...profile.bookmarks.groups[0].items[0], id: `keyboard-link-${i}`, name: `Link ${i}`, url: `https://example.com/${i}` }))
    localStorage.setItem(key, JSON.stringify(snapshot))
  }, keys)
  await page.reload()
  const heading = page.locator('.shortcuts-heading').first()
  await heading.focus()
  await expect(heading).toHaveAttribute('aria-label', 'Actions for Quick links')
  await page.keyboard.press('Shift+F10')
  await expect(page.getByRole('menuitem', { name: 'Open all' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(heading).toBeFocused()
  await page.keyboard.press('Shift+F10')
  let confirmation = ''
  page.once('dialog', dialog => { confirmation = dialog.message(); void dialog.dismiss() })
  await page.getByRole('menuitem', { name: 'Open all' }).click()
  expect(confirmation).toContain('9')
})
