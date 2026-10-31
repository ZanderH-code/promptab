import { test, expect } from '@playwright/test'
import { openTab } from './helpers'

const presets = [
  ['tide', '夜潮'], ['paper', '纸本'], ['graphite', '石墨'], ['mist', '雾蓝'], ['moss', '青苔'],
  ['dusk', '暮色'], ['terminal', '终端'], ['glass', '玻璃'], ['contrast', '高对比'],
] as const

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
})

for (const [id, name] of presets) {
  test(`preset baseline ${id} 1440x900`, async ({ page }) => {
    await page.locator('.settings-button').click()
    await openTab(page, 'appearance')
    const preset = page.getByRole('button', { name, exact: true })
    await preset.click()
    await expect(preset).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: '关闭设置' }).click()
    await expect(page).toHaveScreenshot(`preset-${id}-1440x900.png`, { fullPage: true })
  })
}

test('settings drawer fills a 400px viewport and supports keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  const opener = page.locator('.settings-button')
  await opener.click()
  const drawer = page.getByRole('dialog')
  const bounds = await drawer.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(400)
  expect(bounds!.width).toBeGreaterThanOrEqual(380)

  const appearance = page.getByRole('tab', { name: '外观', exact: true })
  await appearance.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: '背景', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(opener).toBeFocused()
})
