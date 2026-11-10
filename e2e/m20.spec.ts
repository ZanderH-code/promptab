import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

test('date week number follows the selected week start', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.clock.setFixedTime(new Date('2021-01-03T12:00:00Z'))
  await page.goto('/')
  await page.locator('.settings-button').click()
  await openTab(page, 'widgets')
  await page.locator('[data-widget-card="widget-date"] summary').click()
  const weekNumber = page.getByLabel('Show week number')
  await weekNumber.click()
  await expect(weekNumber).toBeChecked()
  await page.getByRole('combobox', { name: 'Week starts on' }).click()
  await page.getByRole('option', { name: 'Monday' }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('.mnt-date')).toContainText('Week 53')
})

test('greeting transition is optional and follows the UI language', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.clock.setFixedTime(new Date('2026-11-03T19:24:00Z'))
  await page.goto('/')
  await page.locator('.settings-button').click()
  await openTab(page, 'widgets')
  await page.getByRole('button', { name: 'Add greeting' }).click()
  await openTab(page, 'layout')
  const transition = page.getByLabel('Show time-of-day line')
  await expect(transition).not.toBeChecked()
  await transition.click()
  await expect(transition).toBeChecked()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('[data-widget="greeting"]')).toContainText("It's a quiet Tuesday evening")
})
