import { test, expect } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'layout')
})

test('named area backgrounds follow the active theme tokens', async ({ page }) => {
  const controls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: '概览' }) })
  const area = page.locator('.mnt-area[data-area="overview"]')
  for (const [label, token] of [['强调色', 'accent'], ['背景色', 'bg'], ['面板色', 'surface']] as const) {
    await controls.getByRole('combobox', { name: '区域背景' }).click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await openTab(page, 'appearance')
    for (const mode of ['深色', '浅色']) {
      await page.getByRole('combobox', { name: '主题', exact: true }).click()
      await page.getByRole('option', { name: mode, exact: true }).click()
      const colors = await area.evaluate((el, name) => {
        const probe = document.createElement('div')
        probe.style.backgroundColor = `color-mix(in oklch, var(--mnt-${name}) 100%, transparent)`
        el.appendChild(probe)
        const result = [getComputedStyle(el).backgroundColor, getComputedStyle(probe).backgroundColor]
        probe.remove()
        return result
      }, token)
      expect(colors[0]).toBe(colors[1])
    }
    await openTab(page, 'layout')
  }
})

test('full-width areas fit the content viewport when a scrollbar is reserved', async ({ page }) => {
  const controls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: '概览' }) })
  await page.evaluate(() => {
    document.documentElement.style.scrollbarGutter = 'stable'
    document.body.style.minHeight = '200vh'
  })
  await controls.getByLabel('区域通栏').check()
  await page.getByRole('button', { name: '关闭设置' }).click()
  const dimensions = await page.locator('.mnt-area[data-area="overview"]').evaluate(el => {
    const rect = el.getBoundingClientRect()
    return { left: rect.left, right: rect.right, viewport: document.documentElement.getBoundingClientRect().right, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }
  })
  expect(Math.abs(dimensions.left)).toBeLessThan(1)
  expect(Math.abs(dimensions.right - dimensions.viewport)).toBeLessThan(1)
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})
