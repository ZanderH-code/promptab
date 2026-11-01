import { test, expect } from '@playwright/test'

test('desktop edit mode is separate from settings and can be toggled with E', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.onboarding-card')).toBeVisible()
  await expect(page.locator('.bookmarks .shortcuts-heading')).toHaveCount(0)
  await expect(page.locator('.bookmarks .add-shortcut')).toHaveCount(0)
  await expect(page.locator('.shortcut')).toHaveCount(0)
  await expect(page.locator('.onboarding-actions button[data-primary]')).toHaveText('用 AI 创建')
  await expect(page.locator('.onboarding-actions button').filter({ hasText: '添加第一个网站' })).not.toHaveAttribute('data-primary')
  await expect(page).toHaveScreenshot('onboarding-fresh-1440x900.png')

  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toBeVisible()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-edit-mode', '')
  await expect(page.locator('.mnt-area').first()).toHaveCSS('outline-style', 'dashed')

  await page.getByRole('navigation', { name: '桌面编辑工具' }).getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.getByRole('button', { name: '设置' }).click()
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.getByRole('dialog').getByRole('button', { name: '编辑桌面', exact: true }).click()
  await expect(page.locator('.edit-toolbar')).toBeVisible()
})

test('onboarding card disappears after the user chooses an action', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.onboarding-card')).toBeVisible()
  await page.getByRole('button', { name: '选择主题' }).click()
  await expect(page.locator('.onboarding-card')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.onboarding-card')).toHaveCount(0)
})
