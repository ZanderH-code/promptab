import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const tabs = ['appearance', 'background', 'layout', 'widgets', 'shortcuts', 'search', 'style', 'ai', 'data', 'about'] as const

async function audit(page: Page, surface: string) {
  const results = await new AxeBuilder({ page }).analyze()
  const moderate = results.violations.filter(violation => violation.impact === 'moderate')
  expect(moderate, `${surface}: moderate accessibility violations`).toEqual([])
  const blocking = results.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
  expect(blocking, `${surface}: serious or critical accessibility violations`).toEqual([])
}

for (const preset of ['夜潮', '纸本'] as const) {
  test(`new tab with ${preset} preset has no serious accessibility violations`, async ({ page }) => {
    await seedExistingUser(page)
    await page.goto('/')
    await page.locator('.settings-button').click()
    await openTab(page, 'appearance')
    await page.getByRole('button', { name: preset, exact: true }).click()
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
    await expect(page.locator('.clock')).toBeVisible()
    await audit(page, `new tab ${preset}`)
  })
}

test('fresh onboarding card has no serious accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.onboarding-card')).toBeVisible()
  await audit(page, 'onboarding')
})

test('edit mode has no serious accessibility violations', async ({ page }) => {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toBeVisible()
  await audit(page, 'edit mode')
})

for (const tab of tabs) {
  test(`settings ${tab} has no serious accessibility violations`, async ({ page }) => {
    await seedExistingUser(page)
    await page.goto('/')
    await page.locator('.settings-button').click()
    await openTab(page, tab)
    await audit(page, `settings ${tab}`)
  })
}
