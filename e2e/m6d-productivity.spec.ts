import { test, expect } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const INDEX_KEY = 'profiles:v2:index'
const GENERATION_KEY = 'profiles:v2:generation:'

async function activeProfile(page: import('@playwright/test').Page) {
  return page.evaluate(([indexKey, generationKey]) => {
    const index = JSON.parse(localStorage.getItem(indexKey)!)
    const snapshot = JSON.parse(localStorage.getItem(generationKey + index.generation)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  }, [INDEX_KEY, GENERATION_KEY] as const)
}

test('productivity widgets add, update, persist, export, and undo locally', async ({ page }) => {
  await seedExistingUser(page)
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-clock')).toBeVisible()

  await page.locator('.settings-button').click()
  await openTab(page, 'widgets')
  await page.getByRole('button', { name: '待办清单', exact: true }).click()
  await page.getByRole('button', { name: '添加待办', exact: true }).click()
  await page.getByRole('textbox', { name: '待办事项' }).fill('Read the release notes')
  await page.getByRole('button', { name: '便签', exact: true }).click()
  await page.getByRole('textbox', { name: '便签内容', exact: true }).fill('Remember the launch checklist')
  await page.getByRole('button', { name: '倒计时', exact: true }).click()
  await page.getByRole('textbox', { name: '标题' }).last().fill('Launch')
  await page.getByLabel('目标日期', { exact: true }).fill('2026-11-05')
  await page.getByRole('combobox', { name: '日期显示', exact: true }).click()
  await page.getByRole('option', { name: '日期与天数', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()

  await expect(page.getByText('Read the release notes')).toBeVisible()
  await expect(page.getByText('Remember the launch checklist')).toBeVisible()
  await expect(page.getByText('还有 5 天')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Read the release notes' }).click()
  await expect(page.getByRole('checkbox', { name: 'Read the release notes' })).toBeChecked()
  await expect(page.locator('.undo-toast')).toBeVisible()
  await page.locator('.undo-toast').getByRole('button', { name: '撤销' }).click()
  await expect(page.getByRole('checkbox', { name: 'Read the release notes' })).not.toBeChecked()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Read the release notes' })).not.toBeChecked()
  await expect(page.getByLabel('编辑便签内容')).toHaveValue('Remember the launch checklist')
  await expect(page.getByText('还有 5 天')).toBeVisible()
  const profile = await activeProfile(page)
  expect(profile.widgets.map((widget: { type: string }) => widget.type)).toEqual(expect.arrayContaining(['todo', 'note', 'countdown']))

  await page.locator('.settings-button').click()
  await openTab(page, 'data')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  const fs = await import('node:fs/promises')
  const backup = JSON.parse(await fs.readFile(path!, 'utf8'))
  expect(backup.profiles[0].widgets).toEqual(expect.arrayContaining(profile.widgets.filter((widget: { type: string }) => ['todo', 'note', 'countdown'].includes(widget.type))))
  page.once('dialog', dialog => dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('导入备份', { exact: true }).setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await reloaded
  expect(await activeProfile(page)).toEqual(profile)
})
