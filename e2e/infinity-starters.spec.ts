import { test, expect, type Page } from '@playwright/test'
import { openTab } from './helpers'

async function names(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    return profile.bookmarks.groups.flatMap((group: { items: { name: string }[] }) => group.items.map(item => item.name))
  })
}

test('starter removal and Infinity add, undo and replace', async ({ page }) => {
  const remote: string[] = []
  page.on('request', request => {
    if (/favicon|youtube\.com|mail\.google\.com|maps\.google\.com|wikipedia\.org|reddit\.com|amazon\.com|chatgpt\.com|outlook\.live\.com|infinitynewtab\.com/i.test(request.url())) remote.push(request.url())
  })
  await page.goto('./')
  await expect(page.locator('.shortcut')).toHaveCount(8)
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'data')
  const english = await page.locator('html').getAttribute('lang') === 'en'
  const button = (en: string, zh: string) => page.getByRole('button', { name: english ? en : zh, exact: true })
  const undo = () => page.locator('.undo-toast').getByRole('button', { name: /^(撤销|Undo)$/i }).click()
  await button('Remove starter sites', '移除初始网站').click()
  await expect.poll(() => names(page)).toEqual([])
  await undo()
  await expect.poll(async () => (await names(page)).length).toBe(8)

  const backup = { version: 'v2', data: { site: { sites: [[{ type: 'web', name: 'Imported', target: 'https://imported.example', bgType: 'color', bgColor: '#123456', bgText: 'I' }]] } } }
  const upload = async () => page.getByLabel(english ? 'Choose Infinity backup' : '选择 Infinity 备份', { exact: true }).setInputFiles({ name: 'synthetic.infinity', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await upload()
  await button('Add to my bookmarks', '添加到我的书签').click()
  await expect.poll(() => names(page)).toContain('Imported')
  expect(await names(page)).toContain('YouTube')
  await undo()
  await expect.poll(() => names(page)).not.toContain('Imported')
  await upload()
  await button('Replace my bookmarks', '替换我的书签').click()
  await expect.poll(() => names(page)).toEqual(['Imported'])
  await undo()
  await expect.poll(async () => (await names(page)).length).toBe(8)
  // Amazon, ChatGPT and Outlook now use automatic icons, so their sites may be contacted for icons.
  // The Infinity import itself must never call the Infinity service.
  expect(remote.filter(url => /infinitynewtab\.com/i.test(url))).toEqual([])
})
