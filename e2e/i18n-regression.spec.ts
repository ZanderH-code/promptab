import { test, expect, type Page } from '@playwright/test'
import { expectLocalizedSurface, openTab, seedExistingUser } from './helpers'

const GOOD_PACK = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Regression theme' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
}
const GOOD_REPLY = `\n\`\`\`json\n${JSON.stringify(GOOD_PACK)}\n\`\`\``
const BAD_PACK = {
  kind: 'mnt.theme-pack',
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: 'teal' } },
  unknownField: true,
}
const BAD_REPLY = `\n\`\`\`json\n${JSON.stringify(BAD_PACK)}\n\`\`\``

async function open(page: Page) {
  await seedExistingUser(page)
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
}

async function switchLanguage(page: Page, language: 'zh-CN' | 'en') {
  if (language === 'zh-CN') return
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'about')
  await page.getByRole('combobox', { name: '语言', exact: true }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
}

test('switching language updates the first screen without reloading', async ({ page }) => {
  await seedExistingUser(page, {
    language: 'zh-CN',
    shortcuts: [{ id: 'example', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E' }],
  })
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  let loadCount = 0
  page.on('load', () => { loadCount++ })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page).toHaveTitle('新标签页')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'layout')
  await page.getByRole('combobox', { name: '布局方式', exact: true }).click()
  await page.getByRole('option', { name: '顶栏横幅', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await expect(page.getByRole('toolbar')).toHaveAttribute('aria-label', '工具栏')

  await switchLanguage(page, 'en')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('New Tab')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.getByRole('toolbar')).toHaveAttribute('aria-label', 'Toolbar')
  await expect(page.locator('.mnt-settings-entry')).toHaveAttribute('aria-label', 'Open settings')
  await expectLocalizedSurface(page)
  expect(loadCount).toBe(1)
})

for (const language of ['zh-CN', 'en'] as const) {
  test.describe(`${language} visible text regression`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page)
      await switchLanguage(page, language)
    })

    test('desktop and every settings tab stay localized', async ({ page }) => {
      await expectLocalizedSurface(page)
      await page.locator('.settings-button').click()
      for (const tab of ['appearance', 'background', 'layout', 'widgets', 'shortcuts', 'search', 'style', 'ai', 'data', 'about'] as const) {
        await openTab(page, tab)
        await expectLocalizedSurface(page)
        if (tab === 'about') {
          await expect(page.getByRole('link', { name: language === 'en' ? 'Privacy policy' : '隐私政策' })).toHaveAttribute('href', 'https://zanderh-code.github.io/promptab/privacy/')
        }
      }
    })

    test('website editor and context menu stay localized', async ({ page }) => {
      await page.locator('.add-shortcut').click()
      await expect(page.locator('.shortcut-editor')).toBeVisible()
      await expectLocalizedSurface(page)
      await page.getByRole('button', { name: language === 'en' ? 'Cancel' : '取消', exact: true }).click()

      await expectLocalizedSurface(page)
      await page.locator('.shortcut').first().click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await expectLocalizedSurface(page)
    })

    test('AI workbench stays localized', async ({ page }) => {
      await page.locator('.settings-button').click()
      await openTab(page, 'ai')
      await expectLocalizedSurface(page)
      const reply = page.getByRole('textbox', { name: language === 'en' ? "The AI's reply" : 'AI 的回复' })
      await reply.fill(GOOD_REPLY)
      await expect(page.locator('.sd-ai-ok')).toBeVisible()
      await expectLocalizedSurface(page)
      const malformedPack = { ...BAD_PACK, theme: { ...BAD_PACK.theme, color: { ...BAD_PACK.theme.color, accent: 'teal' as string, extra: true } } }
      const malformedReply = `\n\`\`\`json\n${JSON.stringify(malformedPack)}\n\`\`\``
      await reply.fill(malformedReply)
      await expect(page.locator('[data-kind="problem"]')).toBeVisible()
      await expect(page.locator('[data-kind="warning"]')).toBeVisible()
      await expectLocalizedSurface(page)
      const issueText = await page.locator('[data-kind="problem"]').innerText()
      const warningText = await page.locator('[data-kind="warning"]').innerText()
      expect(issueText).toContain(language === 'en' ? 'expected' : '需要')
      expect(issueText).toContain(language === 'en' ? 'color' : '颜色')
      expect(warningText).toContain(language === 'en' ? 'Unknown field' : '未识别的字段')
    })
  })
}
