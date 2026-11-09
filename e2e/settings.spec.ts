import { expect, test, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

const MARKER = '.mnt-clock { color: rgb(1, 2, 3); }'

async function launch(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
}

async function openDrawer(page: Page) {
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function openStyle(page: Page) {
  await page.getByRole('tab', { name: 'Style', exact: true }).click()
  await expect(page.locator('.cm-content')).toBeVisible()
}

/** Types into the CSS editor at the end of the current document. */
async function typeDraft(page: Page, text: string) {
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')
}

test('an unapplied custom CSS draft survives navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await openStyle(page)
  await typeDraft(page, MARKER)

  // Another section unmounts and remounts the editor; the draft must come back with it.
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Style', exact: true })).toBeVisible()
  await openStyle(page)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  // Same within the page when the whole drawer closes and reopens.
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await openDrawer(page)
  await openStyle(page)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  // Not applied: the app's user stylesheet layer does not exist yet.
  await expect(page.locator('#mnt-user-css')).toHaveCount(0)

  // Page-lifetime only: a reload starts from the stored (empty) stylesheet.
  await page.reload()
  await expect(page.locator('.mnt-layout')).toBeVisible()
  await openDrawer(page)
  await openStyle(page)
  await expect(page.locator('.cm-content')).not.toContainText('rgb(1, 2, 3)')

  // Apply persists the draft, and the rule reaches the app's CSS layer only now.
  await typeDraft(page, MARKER)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  // `<style>` has no box, so its innerText is empty; read the stylesheet text itself. The sanitizer
  // re-prints the rule without spaces, so match its compact form.
  await expect.poll(() => page.locator('#mnt-user-css').textContent()).toContain('rgb(1,2,3)')
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  expect(errors).toEqual([])
})
