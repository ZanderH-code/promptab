import { test, expect, type Page } from '@playwright/test'
import { expectLocalizedSurface, openTab } from './helpers'

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
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
}

async function switchLanguage(page: Page, language: 'zh-CN' | 'en') {
  if (language === 'zh-CN') return
  await page.locator('.settings-button').click()
  await openTab(page, 'about')
  await page.getByRole('combobox', { name: '语言', exact: true }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
}

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
