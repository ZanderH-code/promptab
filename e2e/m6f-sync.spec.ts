import { test, expect } from '@playwright/test'
import { openTab } from './helpers'

async function installStorageMock(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const local: Record<string, unknown> = { settings: { language: 'en' } }
    const sync: Record<string, unknown> = {}
    const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
    const area = (data: Record<string, unknown>) => ({
      async get(keys: string[] | string | null) {
        if (keys === null) return { ...data }
        const list = Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(list.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]))
      },
      async set(items: Record<string, unknown>) { Object.assign(data, items) },
      async remove(keys: string[] | string) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key] },
      async getKeys() { return Object.keys(data) },
    })
    Object.defineProperty(window, 'chrome', { configurable: true, value: { storage: {
      local: area(local), sync: area(sync),
      onChanged: {
        addListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) { listeners.add(listener) },
        removeListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) { listeners.delete(listener) },
      },
      __syncData: sync,
      __notify(changes: Record<string, { newValue?: unknown }>, name: string) { for (const listener of listeners) listener(changes, name) },
    } } })
  })
}

test('browser sync is opt-in and removes its stored copy when disabled', async ({ page }) => {
  await installStorageMock(page)
  await page.goto('/')
  await expect(page.locator('.mnt-clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'data')

  const toggle = page.getByRole('checkbox', { name: 'Sync this profile across devices' })
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await expect(page.getByRole('status').filter({ hasText: 'Profile synced.' })).toBeVisible()
  const snapshot = await page.evaluate(async () => {
    const storage = (window.chrome as unknown as { storage: { sync: { get(keys: null): Promise<Record<string, unknown>> } } }).storage.sync
    const values = await storage.get(null)
    const count = JSON.parse(String(values['mnt.sync.manifest'])).count as number
    return Array.from({ length: count }, (_, index) => String(values[`mnt.sync.chunk.${index}`])).join('')
  })
  expect(snapshot).toContain('mnt.profile-sync')
  expect(snapshot).not.toContain('mnt-asset:')

  await toggle.uncheck()
  await expect(page.getByRole('status').filter({ hasText: 'Browser sync is off' })).toBeVisible()
  const keys = await page.evaluate(async () => Object.keys(await (window.chrome as unknown as { storage: { sync: { get(keys: null): Promise<Record<string, unknown>> } } }).storage.sync.get(null)))
  expect(keys.filter(key => key.startsWith('mnt.sync.'))).toEqual([])
})

test('a newer synced profile can be pulled and undone', async ({ page }) => {
  await installStorageMock(page)
  await page.goto('/')
  await expect(page.locator('.mnt-clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'data')
  const toggle = page.getByRole('checkbox', { name: 'Sync this profile across devices' })
  await toggle.check()
  await expect(toggle).toBeChecked()

  await page.evaluate(async () => {
    const storage = window.chrome as unknown as { storage: { sync: { get(keys: null): Promise<Record<string, unknown>> }; __syncData: Record<string, unknown>; __notify(changes: Record<string, { newValue?: unknown }>, area: string): void } }
    const values = await storage.storage.sync.get(null)
    const manifest = JSON.parse(String(values['mnt.sync.manifest'])) as { count: number }
    const current = Array.from({ length: manifest.count }, (_, index) => String(values[`mnt.sync.chunk.${index}`])).join('')
    const payload = JSON.parse(current)
    payload.profile.meta.updatedAt = '9999-01-01T00:00:00.000Z'
    payload.profile.meta.name = 'Cloud profile'
    const text = JSON.stringify(payload)
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += 3_500) chunks.push(text.slice(i, i + 3_500))
    const next = { version: 1, count: chunks.length }
    for (let i = 0; i < chunks.length; i++) storage.storage.__syncData[`mnt.sync.chunk.${i}`] = chunks[i]
    storage.storage.__syncData['mnt.sync.manifest'] = JSON.stringify(next)
    storage.storage.__notify({ 'mnt.sync.manifest': { newValue: JSON.stringify(next) } }, 'sync')
  })

  await expect(page.getByText('A newer profile was found in browser sync. Choose which copy to use.')).toBeVisible()
  await page.getByRole('button', { name: 'Pull newer profile' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Newer profile pulled.' })).toBeVisible()
  await page.getByRole('button', { name: 'Undo pulled profile' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pulled profile was undone.' })).toBeVisible()
})
