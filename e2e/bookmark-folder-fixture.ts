import { expect, type Page } from '@playwright/test'
import { seedExistingUser } from './helpers'

export async function seedBookmarkFolders(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = `profiles:v2:generation:${index.generation}`
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const example = profile.bookmarks.groups[0].items[0]
    profile.bookmarks.groups = [
      { id: 'folder-first', name: 'First', collapsed: false, items: [{ ...example, id: 'first-link', name: 'First Link', builtinName: undefined, builtinGroup: undefined }] },
      { id: 'folder-second', name: 'Work Folder', collapsed: true, items: [{ ...example, id: 'second-link', name: 'Second Link', url: 'https://example.com/second', builtinName: undefined, builtinGroup: undefined }, { ...example, id: 'third-link', name: 'Third Link', url: 'https://example.com/third', builtinName: undefined, builtinGroup: undefined }] },
      { id: 'folder-empty', name: 'Empty Folder', collapsed: false, items: [] },
    ]
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Open folder Work Folder with 2 bookmarks' })).toBeVisible()
}

export async function readBookmarkGroups(page: Page) {
  return page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId].bookmarks.groups
  })
}
