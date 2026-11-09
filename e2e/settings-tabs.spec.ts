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
  const result = await page.locator('.sd-rail').evaluate(list => {
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')]
    const bounds = list.getBoundingClientRect()
    const horizontal = getComputedStyle(list).display === 'flex'
    return {
      count: tabs.length,
      horizontal,
      rows: new Set(tabs.map(tab => Math.round(tab.getBoundingClientRect().top))).size,
      clipped: list.scrollWidth > list.clientWidth + 1,
      bounds: { left: bounds.left, right: bounds.right },
      tabs: tabs.map(tab => {
        const rect = tab.getBoundingClientRect()
        const text = tab.querySelector('span')!
        return {
          x: rect.left, right: rect.right, width: rect.width, height: rect.height,
          textFits: text.scrollWidth <= text.clientWidth + 1,
        }
      }),
    }
  })

  expect(result.count).toBe(10)
  for (const tab of result.tabs) {
    expect(tab.width).toBeGreaterThan(0)
    expect(tab.height).toBeGreaterThan(0)
    expect(tab.textFits).toBe(true)
  }
  if (result.horizontal) {
    // Below 640px the rail scrolls sideways; every item stays on one row and the selected one is scrolled into view.
    expect(result.rows).toBe(1)
  } else {
    // Desktop rail: every item sits inside the rail without horizontal clipping.
    expect(result.clipped).toBe(false)
    expect(result.tabs.every(tab => tab.x >= result.bounds.left - 1 && tab.right <= result.bounds.right + 1)).toBe(true)
  }
  return result
}

for (const language of ['zh-CN', 'en'] as const) {
  for (const viewport of viewports) {
    test(`all settings tabs fit in ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
      await openSettings(page, language)
      await page.setViewportSize(viewport)
      await expectAllTabsFit(page)

      const aiTab = page.getByRole('tab', { name: language === 'en' ? 'AI assistant' : 'AI 助手', exact: true })
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

  const appearance = page.getByRole('tab', { name: 'Theme', exact: true })
  await appearance.focus()
  // This viewport is 420 px wide, where the rail runs horizontally.
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
