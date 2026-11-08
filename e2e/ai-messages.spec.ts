import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

test('the AI workbench shows Chinese copy with no raw message keys', async ({ page }) => {
  await seedExistingUser(page, { language: 'zh-CN' })
  await page.goto('/')
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  const drawer = page.locator('.drawer.sd')
  await expect(drawer.getByText('把提示包交给你正在使用的 AI')).toBeVisible()
  const text = await drawer.innerText()
  expect(text).not.toMatch(/\b(?:ai|gallery)\.[a-zA-Z]/)
  expect(text).toContain('提示包')
})
