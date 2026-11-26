import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const INDEX_KEY = 'profiles:v2:index'
const GENERATION_KEY = 'profiles:v2:generation:'
const GROUP_NAME = 'Dropped group'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

async function activeProfile(page: Page) {
  return page.evaluate(([indexKey, generationKey]) => {
    const index = JSON.parse(localStorage.getItem(indexKey)!)
    const snapshot = JSON.parse(localStorage.getItem(generationKey + index.generation)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  }, [INDEX_KEY, GENERATION_KEY] as const)
}

async function openBackupTab(page: Page) {
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'data')
  await expect(page.locator('section[aria-labelledby="data-settings"]')).toBeVisible()
}

/** A v2 backup whose active profile appends a colliding group with two new URLs and one duplicate. */
function appendedBackup(profile: { meta: { id: string }; bookmarks: { groups: { id: string; items: { id: string; url: string }[] }[] } }) {
  const group = profile.bookmarks.groups[0]
  const link = group.items[0]
  const incoming = {
    ...structuredClone(profile),
    bookmarks: {
      groups: [{
        ...structuredClone(group),
        id: group.id,
        name: GROUP_NAME,
        items: [
          { ...structuredClone(link), id: link.id, name: 'Dropped', url: 'https://dropped.example' },
          { ...structuredClone(link), id: 'fresh-link', name: 'Fresh', url: 'https://fresh.example' },
          { ...structuredClone(link), id: 'duplicate-link', name: 'Duplicate', url: link.url },
        ],
      }],
    },
  }
  return JSON.stringify({
    kind: 'mnt.backup', backupVersion: 2, exportedAt: '2026-10-31T10:24:00Z',
    activeProfileId: profile.meta.id, profiles: [incoming], assets: [],
  })
}

test('dropping a backup appends only its new websites after the current groups', async ({ page }) => {
  await openBackupTab(page)
  const before = await activeProfile(page)
  const json = appendedBackup(before)
  await page.evaluate(([body]) => {
    const section = document.querySelector('.backup-section')!
    const data = new DataTransfer()
    data.items.add(new File([body], 'backup.json', { type: 'application/json' }))
    for (const type of ['dragenter', 'dragover', 'drop']) section.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }))
  }, [json] as const)

  const append = page.getByLabel('追加到现有网站之后', { exact: true })
  await expect(append).toBeVisible()
  await append.check()
  await expect(page.getByText('将追加 1 个分组、2 个网站，跳过 1 个已存在的网址。')).toBeVisible()
  await page.locator('section[aria-labelledby="data-settings"]').getByRole('button', { name: '恢复备份', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('追加 1 个分组、2 个网站')
  await expect(dialog).toContainText('跳过 1 个已存在的网址')
  await dialog.getByRole('button', { name: '继续', exact: true }).click()
  await expect(page.getByText('备份已导入。')).toBeVisible()

  const after = await activeProfile(page)
  expect(after.bookmarks.groups).toHaveLength(2)
  expect(after.bookmarks.groups[0]).toEqual(before.bookmarks.groups[0])
  expect(after.bookmarks.groups[1].name).toBe(GROUP_NAME)
  expect(after.bookmarks.groups[1].id).not.toBe(before.bookmarks.groups[0].id)
  expect(after.bookmarks.groups[1].items.map((item: { url: string }) => item.url)).toEqual(['https://dropped.example', 'https://fresh.example'])
  const links = after.bookmarks.groups.flatMap((group: { items: { id: string }[] }) => group.items)
  expect(new Set(links.map((item: { id: string }) => item.id)).size).toBe(links.length)

  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect.poll(async () => (await activeProfile(page)).bookmarks).toEqual(before.bookmarks)
})

test('pasting backup JSON uses the same validation path as the file picker', async ({ page }) => {
  await openBackupTab(page)
  const before = await activeProfile(page)
  const zone = page.getByRole('group', { name: '拖放或粘贴备份' })
  await zone.focus()

  await page.evaluate(() => navigator.clipboard.writeText('{'))
  await page.keyboard.press('Control+V')
  await expect(page.getByRole('alert')).toContainText('不是有效的 JSON')

  await page.evaluate(json => navigator.clipboard.writeText(json), appendedBackup(before))
  await zone.focus()
  await page.keyboard.press('Control+V')
  await expect(page.getByLabel('追加到现有网站之后', { exact: true })).toBeVisible()
  await expect(page.getByLabel('替换现有网站', { exact: true })).toBeChecked()
  await expect(page.getByText('将追加 1 个分组、2 个网站，跳过 1 个已存在的网址。')).toHaveCount(0)
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByLabel('追加到现有网站之后', { exact: true })).toHaveCount(0)
})
