import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const BAD_PACK = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Neon' },
  theme: { mode: 'sepia', radius: 400, color: { bg: 'not-a-colour', text: '#ffffff', accent: '#7ee0c3' } },
}
const GOOD_PACK = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Neon' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
  css: '.mnt-clock { letter-spacing: 0.1em; }',
}
const reply = (pack: unknown) => `Here is a neon theme for you!\n\n\`\`\`json\n${JSON.stringify(pack, null, 2)}\n\`\`\`\n\nEnjoy.`

const settingsEntry = (page: Page) => page.locator('.mnt-settings-entry')
const replyBox = (page: Page) => page.locator('.sd-ai textarea:not(.sd-ai-request)')
const cssEditor = (page: Page) => page.locator('.sd-css textarea')
const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim().toLowerCase())

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(settingsEntry(page)).toBeVisible()
})

test('a faulty AI reply is located, fixed and applied, with an undo snapshot', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })

  await settingsEntry(page).click()
  await openTab(page, 'ai')
  await replyBox(page).fill(reply(BAD_PACK))

  const problems = page.locator('.sd-ai-group[data-kind="problem"]')
  await expect(problems).toBeVisible()
  await expect(problems).toContainText('theme.mode')
  await expect(problems).toContainText('theme.radius')
  await expect(problems).toContainText('theme.color.bg')
  const apply = page.locator('.sd-ai .sd-primary')
  await expect(apply).toHaveCount(0)

  // "Copy errors to AI" hands the same problems back, numbered, ready to paste into the chat.
  await page.locator('.sd-ai .sd-button', { hasText: /^(复制错误给 AI|Copy errors for the AI)$/ }).click()
  const feedback = await page.evaluate(() => navigator.clipboard.readText())
  expect(feedback).toContain('1. ')
  expect(feedback).toContain('theme.mode')
  expect(feedback).toContain('json')

  // The corrected reply passes, previews behind a banner, and applies from there.
  await replyBox(page).fill(reply(GOOD_PACK))
  await expect(problems).toHaveCount(0)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  const before = await accent(page)
  await page.locator('.sd-ai .sd-button', { hasText: /^(预览|Preview)$/ }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Neon')
  await expect.poll(() => accent(page)).toBe('#7ee0c3')

  await banner.getByRole('button', { name: /^(应用|Apply)$/ }).click()
  await expect(banner).toHaveCount(0)
  await expect(page.locator('.undo-toast')).toBeVisible()
  await expect.poll(() => accent(page)).toBe('#7ee0c3')
  expect(before).not.toBe('#7ee0c3')

  await page.reload()
  await expect(settingsEntry(page)).toBeVisible()
  await expect.poll(() => accent(page)).toBe('#7ee0c3')
  expect(errors.filter(text => /Content Security Policy|CSP/i.test(text))).toEqual([])
})

test('discarding a preview leaves the saved theme alone', async ({ page }) => {
  await settingsEntry(page).click()
  await openTab(page, 'ai')
  await replyBox(page).fill(reply(GOOD_PACK))
  const before = await accent(page)
  await page.locator('.sd-ai .sd-button', { hasText: /^(预览|Preview)$/ }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: /^(放弃|Discard)$/ }).click()
  await expect(banner).toHaveCount(0)
  await expect.poll(() => accent(page)).toBe(before)
})

test('CSS cannot hide the settings entry even with !important, and stays applied', async ({ page }) => {
  await settingsEntry(page).click()
  await openTab(page, 'style')

  // Hiding attempts lose to the guard layer even with !important.
  await cssEditor(page).fill('.mnt-settings-entry { display: none !important; visibility: hidden !important; opacity: 0 !important; transform: translateX(-9999px) !important; }\n.mnt-header { display: none !important; }')
  await page.locator('.sd-css .sd-button', { hasText: /^(应用|Apply)$/ }).click()
  await page.getByRole('button', { name: /^(关闭设置|Close settings)$/ }).click()
  // The stylesheet is still in the page (nothing was rolled back): the guard layer alone kept the entry usable.
  await expect(page.locator('#mnt-user-css')).toHaveCount(1)
  await expect(settingsEntry(page)).toBeVisible()
  const box = await settingsEntry(page).boundingBox()
  expect(box && box.width > 8 && box.height > 8 && box.x >= 0 && box.y >= 0).toBe(true)
  await settingsEntry(page).click()
  await expect(page.getByRole('tab', { name: /^(外观|Appearance)$/ })).toBeVisible()
})

test('a stylesheet that paints over the settings entry is removed automatically', async ({ page }) => {
  await settingsEntry(page).click()
  await openTab(page, 'style')
  await cssEditor(page).fill('body::after { content: ""; position: fixed; inset: 0; z-index: 2147483000; }\nhtml::before { content: ""; position: fixed; inset: 0; z-index: 2147483000; }')
  await page.locator('.sd-css .sd-button', { hasText: /^(应用|Apply)$/ }).click()
  await expect(page.locator('#mnt-user-css')).toHaveCount(0, { timeout: 5000 })
  await expect(page.locator('.error[role="alert"]')).toBeVisible()
  await expect(settingsEntry(page)).toBeVisible()
  await page.getByRole('button', { name: /^(关闭设置|Close settings)$/ }).click()
  await settingsEntry(page).click()
})

test('#safe pauses custom CSS and the banner exits it', async ({ page }) => {
  await settingsEntry(page).click()
  await openTab(page, 'style')
  await cssEditor(page).fill('.mnt-clock { color: rgb(255, 0, 0); }')
  await page.locator('.sd-css .sd-button', { hasText: /^(应用|Apply)$/ }).click()
  await expect(page.locator('#mnt-user-css')).toHaveCount(1)

  await page.goto('/#safe')
  await page.reload()
  const banner = page.locator('.mnt-banner[data-kind="safe"]')
  await expect(banner).toBeVisible()
  await expect(page.locator('#mnt-user-css')).toHaveCount(0)
  await banner.getByRole('button', { name: /^(退出|Exit)$/ }).click()
  await expect(banner).toHaveCount(0)
  await expect(page.locator('#mnt-user-css')).toHaveCount(1)
})

test('three quick Esc presses enter safe mode', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.locator('.mnt-banner[data-kind="safe"]')).toBeVisible()
  expect(page.url()).toContain('#safe')
})
