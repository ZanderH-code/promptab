import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const pack = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Firefox smoke theme' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
}

test('Firefox build opens, settings work and AI replies preview', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'browser', {
      configurable: true,
      value: { permissions: { request: async () => true } },
    })
  })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.mnt-settings-entry')).toBeVisible()
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  await page.getByRole('textbox', { name: "The AI's reply" }).fill(`\`\`\`json\n${JSON.stringify(pack)}\n\`\`\``)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await page.locator('.sd-ai .sd-button', { hasText: /^(Preview|预览)$/ }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Firefox smoke theme')
  await expect(page.locator('.undo-toast')).toHaveCount(0)
})
