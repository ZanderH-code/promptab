import { expect, type Page } from '@playwright/test'

/** Seeds a pre-existing v1 user before the app bootstraps, preserving upgrade-path defaults. */
const templateShortcuts = [
  ['amazon', 'Amazon', 'https://amazon.com', '232f3e'], ['reddit', 'Reddit', 'https://reddit.com', 'ff4500'],
  ['gmail', 'Gmail', 'https://mail.google.com', 'ea4335'], ['github', 'GitHub', 'https://github.com', '181717'],
  ['drive', 'Google Drive', 'https://drive.google.com', '4285f4'], ['film', 'Film', 'https://example.com/film', '3a5a80'],
  ['code', 'Code', 'https://example.com/code', '3a5a80'], ['calendar', 'Calendar', 'https://calendar.google.com', '4285f4'],
] as const
export const templateBookmarks = templateShortcuts.map(([id, name, url, hex]) => ({
  id, name, url, color: `#${hex}`, icon: name[0], iconMode: id === 'film' || id === 'code' ? 'lucide' : 'brand', iconName: id,
  ...(id === 'film' || id === 'code' ? {} : { iconColorMode: 'brand', brand: { slug: id, title: name, path: 'M12 2 22 12 12 22 2 12Z', hex } }),
}))

export async function seedTemplateUser(page: Page, language: 'zh-CN' | 'en' = 'zh-CN', wallpaper = false) {
  await seedExistingUser(page, {
    language, theme: 'light', accent: '#3a5a80', shortcuts: templateBookmarks, columns: 3,
    ...(wallpaper ? { wallpaper: '__template-wallpaper__', overlay: 40 } : {}),
  })
}

export async function seedExistingUser(page: Page, settings: Record<string, unknown> = {}) {
  const legacy = {
    schemaVersion: 1, language: 'zh-CN', theme: 'dark', accent: '#90d5cd', background: '#102932',
    showClock: true, showDate: true, showSearch: true, hour12: false,
    searchTemplate: 'https://www.google.com/search?q={query}',
    shortcuts: [{ id: 'example', name: '示例网站', url: 'https://example.com', color: '#90d5cd', icon: '例' }],
    columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35,
    ...settings,
  }
  await page.addInitScript(value => {
    if (value.wallpaper === '__template-wallpaper__') {
      const canvas = document.createElement('canvas')
      canvas.width = 480; canvas.height = 300
      const context = canvas.getContext('2d')!
      const gradient = context.createLinearGradient(0, 0, 480, 300)
      gradient.addColorStop(0, '#c7d5dc'); gradient.addColorStop(.48, '#627782'); gradient.addColorStop(1, '#182530')
      context.fillStyle = gradient; context.fillRect(0, 0, 480, 300)
      for (let i = 0; i < 18; i++) {
        const x = (i * 83) % 480, y = (i * 47) % 240
        const cloud = context.createRadialGradient(x, y, 2, x, y, 100 + (i % 3) * 30)
        cloud.addColorStop(0, `rgba(245,248,250,${.12 + (i % 4) * .025})`); cloud.addColorStop(1, 'rgba(245,248,250,0)')
        context.fillStyle = cloud; context.fillRect(x - 140, y - 140, 280, 280)
      }
      value.wallpaper = canvas.toDataURL('image/png')
    }
    localStorage.setItem('settings', JSON.stringify(value))
  }, legacy)
}

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
  'kimi', 'kindle', 'markdown', 'mb', 'md', 'mnt', 'nighttab', 'oklch', 'otf', 'png', 'prefers-reduced-motion', 'px', 'query', 'rgb', 'rrggbb', 'svg', 'ttf', 'url', 'user', 'webp', 'woff2', 'xml',
  // Kimi appears in the AI introduction; Kindle appears in the Chinese AI request placeholder; Aa is the preset preview sample. RRGGBB names the fixed color format in validation guidance.
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
  const text = (await visibleUiText(page)).replace(/MINIMAL\s*(?:\/\s*)?NEW\s+TAB/gi, '')
  if (language === 'en') {
    expect(text.match(/[㐀-鿿]/g)).toBeNull()
    return
  }
  const words = text.match(/\b[A-Za-z][A-Za-z0-9]*(?:[+.#/-][A-Za-z0-9]+)*\b/g) ?? []
  const unexpected = [...new Set(words.map(word => word.toLocaleLowerCase()).filter(word => word.length > 1 && !ZH_ENGLISH_WORD_WHITELIST.has(word)))]
  expect(unexpected).toEqual([])
}
