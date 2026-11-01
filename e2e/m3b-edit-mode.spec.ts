import { test, expect } from '@playwright/test'

test('desktop edit mode is separate from settings and can be toggled with E', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.onboarding-card')).toBeVisible()
  await expect(page.locator('.shortcut')).toHaveCount(0)

  await page.keyboard.press('e')
  await expect(page.locator('.edit-toolbar')).toBeVisible()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-edit-mode', '')
  await expect(page.locator('.mnt-area').first()).toHaveCSS('outline-style', 'dashed')

  await page.getByRole('navigation', { name: '桌面编辑工具' }).getByRole('button', { name: '完成', exact: true }).click()
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.getByRole('button', { name: '设置' }).click()
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await page.getByRole('button', { name: '编辑桌面' }).click()
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
