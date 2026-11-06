import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

async function savedNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    return profile.bookmarks.groups.flatMap((group: { items: { name: string }[] }) => group.items.map(item => item.name))
  })
}

test('a new shortcut fills its name from the URL and keeps a typed name', async ({ page }) => {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  const english = await page.locator('html').getAttribute('lang') === 'en'
  await page.locator('.add-shortcut').click()
  const url = page.getByLabel(english ? 'URL' : '网址', { exact: true })
  const name = page.getByLabel(english ? 'Name' : '名称', { exact: true })
  await url.fill('https://claude.ai')
  await expect(name).toHaveValue('Claude')
  await name.fill('My Claude')
  await url.fill('https://github.com')
  await expect(name).toHaveValue('My Claude')
  await page.getByRole('button', { name: english ? 'Save website' : '保存网站', exact: true }).click()
  await expect(page.locator('.shortcut-editor')).toHaveCount(0)
  await expect.poll(() => savedNames(page)).toContain('My Claude')
})

test('bookmark import shortens long titles and names empty or host-only titles', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'chrome', {
      configurable: true,
      value: {
        runtime: { getURL: (path: string) => `chrome-extension://test${path.startsWith('/') ? path : '/' + path}` },
        permissions: { request: async () => true, contains: async () => false },
        bookmarks: {
          getTree: async () => [{
            id: 'root', title: '', children: [{
              id: 'folder', title: 'Reading', children: [
                { id: 'brokers', title: 'Home | Interactive Brokers', url: 'https://www.interactivebrokers.com/en/home.php' },
                { id: 'claude', title: '', url: 'https://claude.ai' },
                { id: 'host', title: 'docs.example.com', url: 'https://docs.example.com/guide' },
              ],
            }],
          }],
        },
      },
    })
  })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  const english = await page.locator('html').getAttribute('lang') === 'en'
  await page.locator('.settings-button').click()
  await openTab(page, 'data')
  await page.getByRole('button', { name: english ? 'Choose folders' : '选择文件夹', exact: true }).click()
  await page.getByRole('checkbox', { name: /Reading/ }).click()
  await page.getByRole('button', { name: english ? 'Import selected folders' : '导入所选文件夹', exact: true }).click()
  await expect.poll(() => savedNames(page)).toEqual(expect.arrayContaining(['Interactive Brokers', 'Claude', 'Example']))
})
