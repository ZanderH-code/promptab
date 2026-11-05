import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { openTab, seedExistingUser } from './helpers'

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 800, height: 600 },
  { width: 412, height: 915 },
  { width: 360, height: 740 },
] as const

async function openSettings(page: Page, language: 'zh-CN' | 'en') {
  await seedExistingUser(page, { language })
  await page.setViewportSize({ width: 420, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function expectAllTabsFit(page: Page) {
  const result = await page.locator('.sd-tabs').evaluate(list => {
    const listBounds = list.getBoundingClientRect()
    const drawerBounds = list.closest('.sd')!.getBoundingClientRect()
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')]
    const bounds = tabs.map(tab => {
      const rect = tab.getBoundingClientRect()
      const text = tab.querySelector('span')!
      return {
        x: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        width: rect.width, height: rect.height,
        textFits: text.scrollWidth <= text.clientWidth + 1,
      }
    })
    return {
      count: tabs.length,
      list: { left: listBounds.left, right: listBounds.right, top: listBounds.top, bottom: listBounds.bottom, width: list.clientWidth, scrollWidth: list.scrollWidth },
      drawer: { left: drawerBounds.left, right: drawerBounds.right },
      viewportWidth: window.innerWidth,
      bounds,
    }
  })

  expect(result.count).toBe(10)
  expect(result.list.scrollWidth).toBeLessThanOrEqual(result.list.width + 1)
  for (const tab of result.bounds) {
    expect(tab.width).toBeGreaterThan(0)
    expect(tab.height).toBeGreaterThan(0)
    expect(tab.x).toBeGreaterThanOrEqual(result.list.left - 1)
    expect(tab.right).toBeLessThanOrEqual(result.list.right + 1)
    expect(tab.top).toBeGreaterThanOrEqual(result.list.top - 1)
    expect(tab.bottom).toBeLessThanOrEqual(result.list.bottom + 1)
    expect(tab.x).toBeGreaterThanOrEqual(result.drawer.left - 1)
    expect(tab.right).toBeLessThanOrEqual(Math.min(result.drawer.right, result.viewportWidth) + 1)
    expect(tab.textFits).toBe(true)
  }

  const rows = [...new Set(result.bounds.map(tab => Math.round(tab.top)))]
  expect(rows.length, `tab rows at ${result.list.width}px`).toBeLessThanOrEqual(3)
  return { rows: rows.length, width: result.list.width }
}

for (const language of ['zh-CN', 'en'] as const) {
  for (const viewport of viewports) {
    test(`all settings tabs fit in ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
      await openSettings(page, language)
      await page.setViewportSize(viewport)
      await expectAllTabsFit(page)

      const aiTab = page.getByRole('tab', { name: 'AI', exact: true })
      await aiTab.click()
      await expect(aiTab).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel')).toBeVisible()
      await expect(page.getByRole('button', { name: language === 'en' ? 'Copy prompt pack' : '复制提示包' })).toBeVisible()

      if (viewport.width === 412 && language === 'zh-CN') {
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
        expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])
      }
    })
  }
}

test('settings tab keyboard navigation and AI search are preserved', async ({ page }) => {
  await openSettings(page, 'en')

  const appearance = page.getByRole('tab', { name: 'Appearance', exact: true })
  await appearance.focus()
  await page.keyboard.press('ArrowRight')
  const background = page.getByRole('tab', { name: 'Background', exact: true })
  await expect(background).toBeFocused()
  await page.keyboard.press('Home')
  await expect(appearance).toBeFocused()
  await page.keyboard.press('End')
  const about = page.getByRole('tab', { name: 'About', exact: true })
  await expect(about).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(appearance).toBeFocused()

  const search = page.getByRole('searchbox', { name: 'Search settings' })
  await search.fill('AI')
  await expect(page.locator('.sd-section-title', { hasText: 'AI' })).toBeVisible()
})

test('settings tabs fit with a 1.5 device scale factor', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1.5,
    locale: 'en-US',
  })
  const page = await context.newPage()
  try {
    await openSettings(page, 'en')
    await expectAllTabsFit(page)
  } finally {
    await context.close()
  }
})
