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

/**
 * English product and platform terms intentionally retained in the Chinese UI.
 * Keep this list narrow: adding a word here hides a missing translation from the scan.
 */
const ZH_ENGLISH_WORD_WHITELIST = new Set([
  'aa', 'ai', 'baidu', 'bing', 'chatgpt', 'claude', 'css', 'data', 'deepseek', 'english', 'google', 'http', 'https', 'image', 'jpeg', 'json', 'jsonc', 'kb',
  'kimi', 'kindle', 'markdown', 'mb', 'md', 'minimal', 'mnt', 'new', 'oklch', 'otf', 'png', 'prefers-reduced-motion', 'px', 'query', 'rgb', 's', 'svg', 'tab', 'ttf', 'url',
  'user', 'webp', 'woff2', 'xml',
])

/** Returns visible text nodes, excluding content supplied by the user. */
export async function visibleUiText(page: Page) {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const text: string[] = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      const element = node.parentElement
      if (!element || element.closest('[data-user-content],script,style,noscript')) continue
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || element.getClientRects().length === 0) continue
      text.push(node.textContent ?? '')
    }
    return text.join(' ')
  })
}

/** Fails when a visible surface leaks untranslated text for its current locale. */
export async function expectLocalizedSurface(page: Page) {
  const language = await page.locator('html').getAttribute('lang')
  const text = await visibleUiText(page)
  if (language === 'en') {
    expect(text.match(/[㐀-鿿]/g)).toBeNull()
    return
  }
  const words = text.match(/\b[A-Za-z][A-Za-z0-9]*(?:[+.#/-][A-Za-z0-9]+)*\b/g) ?? []
  const unexpected = [...new Set(words.map(word => word.toLocaleLowerCase()).filter(word => word.length > 1 && !ZH_ENGLISH_WORD_WHITELIST.has(word)))]
  expect(unexpected).toEqual([])
}
