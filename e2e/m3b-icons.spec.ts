import { test, expect, type Page } from '@playwright/test'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

async function addShortcut(page: Page, name: string) {
  await page.locator('.add-shortcut').click()
  await page.getByLabel('网址', { exact: true }).fill('https://example.org')
  await page.getByLabel('名称', { exact: true }).fill(name)
}
async function save(page: Page) {
  await page.getByRole('button', { name: '保存网站', exact: true }).click()
  await expect(page.locator('.shortcut-editor')).toHaveCount(0)
}

test('brand catalog loads on demand and chosen icons survive reload', async ({ page }) => {
  const directory = join(process.cwd(), 'dist', 'assets')
  const scripts = (await readdir(directory)).filter(name => name.endsWith('.js'))
  const sized = await Promise.all(scripts.map(async name => ({ name, size: (await stat(join(directory, name))).size })))
  const brandChunk = sized.sort((a, b) => b.size - a.size)[0]
  expect(brandChunk.size).toBeGreaterThan(1_000_000)
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/' + brandChunk.name)) requests.push(request.url()) })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await addShortcut(page, 'Brand test')
  expect(requests).toHaveLength(0)
  await page.locator('.icon-choice').filter({ hasText: '品牌图标' }).click()
  await expect.poll(() => requests.length).toBe(1)
  await page.getByLabel('搜索品牌').fill('github')
  await page.getByRole('button', { name: 'GitHub', exact: true }).click()
  await page.getByLabel('图标颜色').selectOption('custom')
  await page.getByLabel('自定义颜色', { exact: true }).fill('#123456')
  await save(page)
  const brand = page.locator('.shortcut').filter({ hasText: 'Brand test' }).locator('.shortcut-icon svg')
  await expect(brand.locator('path')).toHaveCount(1)
  await expect(brand).toHaveCSS('color', 'rgb(18, 52, 86)')
  await page.reload()
  await expect(brand.locator('path')).toHaveCount(1)
  await expect(brand).toHaveCSS('color', 'rgb(18, 52, 86)')

  await addShortcut(page, 'Lucide test')
  await page.locator('.icon-choice').filter({ hasText: '通用图标' }).click()
  await page.getByRole('button', { name: 'house', exact: true }).click()
  await save(page)
  await addShortcut(page, 'Emoji test')
  await page.locator('.icon-choice').filter({ hasText: '表情' }).click()
  await page.getByRole('button', { name: '🌻', exact: true }).click()
  await save(page)
  await expect(page.locator('body')).toContainText('Emoji test')
  await page.reload()
  await expect(page.locator('.shortcut').filter({ hasText: 'Lucide test' }).locator('svg.lucide-house')).toBeVisible()
  await expect(page.locator('body')).toContainText('Emoji test')
  await expect(page.locator('body')).toContainText('🌻')
})
