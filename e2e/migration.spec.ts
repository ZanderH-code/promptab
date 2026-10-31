import { test, expect, type Page } from '@playwright/test'

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
})

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII='
const INDEX_KEY = 'profiles:v2:index'
const GENERATION_KEY = 'profiles:v2:generation:'
const DEFAULT_ACCENT = '#90d5cd'

async function readV2(page: Page) {
  return page.evaluate(([indexKey, generationKey]) => {
    const raw = localStorage.getItem(indexKey)
    if (raw === null) return null
    const index = JSON.parse(raw)
    return JSON.parse(localStorage.getItem(generationKey + index.generation)!)
  }, [INDEX_KEY, GENERATION_KEY] as const)
}

async function activeProfile(page: Page) {
  const snapshot = await readV2(page)
  return snapshot ? snapshot.profiles.profiles[snapshot.profiles.activeProfileId] : null
}

async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
}

test('migrates a real v1 IndexedDB wallpaper and legacy settings to v2', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  // Seed on the app origin without running the app: a blank document served at a throwaway path.
  await page.route('**/__seed', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
  await page.goto('/__seed')
  const legacy = JSON.stringify({
    schemaVersion: 1, language: 'zh-CN', theme: 'dark', accent: '#c0ffee', background: '#102932', showClock: true, showDate: true, showSearch: true, hour12: false,
    searchTemplate: 'https://www.google.com/search?q={query}',
    shortcuts: [
      { id: 'a', name: 'Legacy A', url: 'https://example.com', color: '#90d5cd', icon: 'A' },
      { id: 'b', name: 'Legacy B', url: 'https://example.org', color: '#b0a092', icon: 'B' },
    ],
    columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 50,
  })
  await page.evaluate(async ([settings, base64]) => {
    localStorage.setItem('settings', settings)
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('minimal-new-tab', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('images')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite')
      tx.objectStore('images').put(new Blob([bytes], { type: 'image/png' }), 'wallpaper')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, [legacy, png] as const)

  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.shortcut')).toHaveCount(2)
  await expect(page.locator('.app')).toHaveCSS('background-image', /blob:/)
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', '#c0ffee')

  const snapshot = await readV2(page)
  expect(snapshot.revision).toBe(1)
  const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  expect(profile.schemaVersion).toBe(2)
  expect(profile.theme.color.accent).toBe('#c0ffee')
  expect(profile.background.type).toBe('image')
  expect(profile.background.image.asset).toMatch(/^mnt-asset:[a-f0-9]{64}$/)
  expect(profile.bookmarks.groups.flatMap((group: any) => group.items).map((item: any) => item.name)).toEqual(['Legacy A', 'Legacy B'])
  // The asset lives in the independent `assets` database, and the v1 data is kept for rollback.
  await expect.poll(() => page.evaluate(async asset => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('assets')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const record = await new Promise<any>((resolve, reject) => {
      const request = db.transaction('assets').objectStore('assets').get(asset.replace('mnt-asset:', ''))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return record ? { type: record.blob.type, size: record.blob.size, refCount: record.refCount } : null
  }, profile.background.image.asset)).toMatchObject({ type: 'image/png' })
  expect(await page.evaluate(() => localStorage.getItem('settings'))).toBe(legacy)
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('backup:v1-original')))!)).toEqual({ backend: 'local', value: legacy })

  // A second load reuses the published generation instead of migrating again.
  await page.reload()
  await expect(page.locator('.shortcut')).toHaveCount(2)
  expect((await readV2(page)).revision).toBe(1)
})

test('Ctrl+Z undoes the last settings edit', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#112233')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#112233')
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', '#112233')
  await page.getByRole('button', { name: '关闭设置' }).click()
  await page.keyboard.press('Control+z')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe(DEFAULT_ACCENT)
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)
})

test('undo notice button reverts the last edit', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#445566')
  await page.getByRole('button', { name: '关闭设置' }).click()
  await page.getByRole('status').getByRole('button', { name: '撤销' }).click()
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe(DEFAULT_ACCENT)
})

test('profiles can be created and switched with independent settings', async ({ page }) => {
  await open(page)
  const original = await activeProfile(page)
  await page.locator('.settings-button').click()
  page.once('dialog', dialog => dialog.accept('工作'))
  await page.getByRole('button', { name: '新建配置', exact: true }).click()
  await expect.poll(async () => Object.keys((await readV2(page)).profiles.profiles).length).toBe(2)
  const work = Object.values<any>((await readV2(page)).profiles.profiles).find(p => p.meta.name === '工作')
  expect(work.meta.id).not.toBe(original.meta.id)

  const select = page.getByLabel('当前配置', { exact: true })
  await select.selectOption({ label: '工作' })
  await expect.poll(async () => (await readV2(page)).profiles.activeProfileId).toBe(work.meta.id)
  await page.locator('input[type=color]').first().fill('#334455')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#334455')
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', '#334455')

  await select.selectOption({ value: original.meta.id })
  await expect.poll(async () => (await readV2(page)).profiles.activeProfileId).toBe(original.meta.id)
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)

  await page.reload()
  expect((await readV2(page)).profiles.activeProfileId).toBe(original.meta.id)
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)
})

test('history preview, restore and pin', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await expect(page.getByText('暂无历史记录。', { exact: true })).toBeVisible()
  await page.locator('input[type=color]').first().fill('#112233')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#112233')
  const id = (await readV2(page)).profiles.activeProfileId
  const entries = page.locator('section[aria-labelledby] li')
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText('编辑')

  // Preview shows the snapshot without committing it.
  await entries.first().getByRole('button', { name: '预览', exact: true }).click()
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)
  expect((await activeProfile(page)).theme.color.accent).toBe('#112233')
  await entries.first().getByRole('button', { name: '停止预览', exact: true }).click()
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', '#112233')

  // Pin is persisted and toggles its label.
  const pin = entries.first().getByRole('button', { name: '置顶', exact: true })
  await pin.click()
  await expect(entries.first().getByRole('button', { name: '取消置顶', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await readV2(page)).history.profiles[id].snapshots.filter((s: any) => s.pinned).length).toBe(1)

  // Restore asks for confirmation, applies the snapshot and records a restore entry.
  page.once('dialog', dialog => { expect(dialog.message()).toContain('恢复此历史记录'); void dialog.accept() })
  await entries.first().getByRole('button', { name: '恢复', exact: true }).click()
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe(DEFAULT_ACCENT)
  await expect(page.locator('html')).toHaveCSS('--mnt-accent', DEFAULT_ACCENT)
  await expect.poll(async () => (await readV2(page)).history.profiles[id].snapshots.map((s: any) => s.kind)).toContain('restore')
  await expect(page.locator('section[aria-labelledby] li', { hasText: '恢复' }).first()).toBeVisible()
})
