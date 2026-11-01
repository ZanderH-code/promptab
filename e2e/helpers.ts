import { expect, type Page } from '@playwright/test'

/** Opens a settings tab by its accessible name (the drawer shows one tab at a time). */
const TAB_LABELS = {
  appearance: ['外观', 'Appearance'], background: ['背景', 'Background'], layout: ['布局', 'Layout'],
  widgets: ['组件', 'Widgets'], shortcuts: ['快捷方式', 'Shortcuts'], search: ['搜索', 'Search'],
  style: ['样式', 'Style'], ai: ['AI', 'AI'], data: ['数据', 'Data'], about: ['关于', 'About'],
} as const

export async function openTab(page: Page, tab: keyof typeof TAB_LABELS) {
  const language = await page.locator('html').getAttribute('lang')
  const name = TAB_LABELS[tab][language === 'en' ? 1 : 0]
  await page.getByRole('tab', { name, exact: true }).click()
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true')
}

export async function setAccent(page: Page, value: string) {
  await openTab(page, 'appearance')
  const label = (await page.locator('html').getAttribute('lang')) === 'en' ? 'Accent value' : '强调色的色值'
  const field = page.getByLabel(label, { exact: true })
  await field.fill(value)
  await field.press('Enter')
}
