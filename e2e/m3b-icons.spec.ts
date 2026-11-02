import { test, expect, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

async function addShortcut(page: Page, name: string) {
  await page.locator('.add-shortcut').click()
  await page.getByLabel('网址', { exact: true }).fill('https://example.org')
  await page.getByLabel('名称', { exact: true }).fill(name)
}
async function save(page: Page) {
  await page.getByRole('button', { name: '保存网站', exact: true }).click()
  await expect(page.locator('.shortcut-editor')).toHaveCount(0)
}

test('saved brand icons render without requesting the brand catalog chunk', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/brand-catalog.json')) requests.push(request.url()) })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = 'profiles:v2:generation:' + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const group = profile.bookmarks.groups[0]
    group.items = [{ ...group.items[0], id: 'stored-brand', name: 'Stored brand', builtinName: undefined, builtinIcon: undefined, builtinGroup: undefined, url: 'https://github.com', iconMode: 'brand', iconName: 'github', iconColorMode: 'brand', brand: { slug: 'github', title: 'GitHub', path: 'M12 .297a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.65.25 2.87.13 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.8 5.64-5.48 5.94.43.37.81 1.1.81 2.22v3.3c0 .32.22.69.83.57A12 12 0 0 0 12 .297', hex: '181717' } }]
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  const stored = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem('profiles:v2:generation:' + index.generation)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId].bookmarks.groups[0].items[0]
  })
  expect(stored.brand).toBeTruthy()
  expect(stored.iconMode).toBe('brand')
  await expect(page.locator('.shortcut').filter({ hasText: 'Stored brand' }).locator('.shortcut-icon svg path')).toHaveCount(1)
  expect(requests).toHaveLength(0)
})

test('brand catalog loads on demand and chosen icons survive reload', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/brand-catalog.json')) requests.push(request.url()) })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await addShortcut(page, 'Brand test')
  expect(requests).toHaveLength(0)
  await page.locator('.icon-choice').filter({ hasText: '品牌图标' }).click()
  expect(requests).toHaveLength(0)
  await page.getByLabel('搜索品牌').focus()
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
