import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const runtimeErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
})

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=', 'base64')

const INDEX_KEY = 'profiles:v2:index'
const GENERATION_KEY = 'profiles:v2:generation:'

/** Reads the committed v2 snapshot through the same keys the app publishes. */
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

/** Rewrites the active profile inside the committed generation (test seeding only; revision is unchanged). */
async function seedActiveProfile(page: Page, mutate: (profile: any) => void) {
  await page.evaluate(([indexKey, generationKey, code]) => {
    const index = JSON.parse(localStorage.getItem(indexKey)!)
    const key = generationKey + index.generation
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    ;(0, eval)(`(${code})`)(snapshot.profiles.profiles[snapshot.profiles.activeProfileId])
    localStorage.setItem(key, JSON.stringify(snapshot))
  }, [INDEX_KEY, GENERATION_KEY, mutate.toString()] as const)
}

const v1Settings = (accent: string) => ({
  schemaVersion: 1, language: 'zh-CN', theme: 'dark', accent, background: '#102932', showClock: true, showDate: true, showSearch: true, hour12: false,
  searchTemplate: 'https://www.google.com/search?q={query}',
  shortcuts: [{ id: 'example', name: '示例网站', url: 'https://example.com', color: '#90d5cd', icon: '例' }],
  columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35,
})

async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-10-31T10:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
}

for (const [width, height] of [[1440, 900], [1920, 1080], [800, 600], [400, 800]]) {
  test(`desktop baseline ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await open(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const widths = await page.locator('.search, .shortcuts-heading').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width))
    expect(widths[0]).toBe(widths[1])
    await expect(page).toHaveScreenshot(`desktop-${width}x${height}.png`, { fullPage: true })
  })
}

test('light theme has readable clock and coordinated surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page)
  await page.locator('.settings-button').click()
  await page.getByRole('combobox', { name: '主题', exact: true }).click()
  await page.getByRole('option', { name: '浅色', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置' }).click()
  const contrast = await page.evaluate(() => {
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    const luminance = (color: number[]) => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
    const fg = luminance(rgb(getComputedStyle(document.querySelector('.clock')!).color))
    const bg = luminance(rgb(getComputedStyle(document.querySelector('.app')!).backgroundColor))
    return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05)
  })
  expect(contrast).toBeGreaterThanOrEqual(4.5)
  await expect(page).toHaveScreenshot('light-1440x900.png', { fullPage: true })
})

test('drawer and dialog surfaces follow background in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page)
  await page.locator('.settings-button').click()
  for (const theme of ['深色', '浅色']) {
    await page.getByRole('combobox', { name: '主题', exact: true }).click()
    await page.getByRole('option', { name: theme, exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === '浅色' ? 'light' : 'dark')
    await expect(page.locator('.drawer')).toBeVisible()
    const surface = await page.locator('.drawer').evaluate(el => getComputedStyle(el).backgroundColor)
    expect(surface).toContain('oklch')
    await page.locator('.add-shortcut').click({ force: true })
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal')).toHaveCSS('background-color', surface)
    await page.locator('.editor-close').click()
  }
})

test('export reset and import restore websites appearance and wallpaper', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#e0b080')
  await page.locator('input[type=file]').first().setInputFiles({ name: 'wallpaper.png', mimeType: 'image/png', buffer: image })
  await expect(page.locator('.app')).toHaveCSS('background-image', /blob:/)
  await page.locator('.add-shortcut').click()
  await page.getByLabel('网址', { exact: true }).fill('https://example.org')
  await page.getByLabel('名称', { exact: true }).fill('Restored website')
  await page.getByRole('button', { name: '保存网站', exact: true }).click()
  await expect(page.locator('.shortcut')).toHaveCount(2)
  await expect.poll(async () => {
    const profile = await activeProfile(page)
    return [profile.theme.color.accent, profile.background.type, profile.bookmarks.groups.flatMap((g: any) => g.items).length]
  }).toEqual(['#e0b080', 'image', 2])
  const before = await activeProfile(page)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  const backup = JSON.parse(await readFile(path!, 'utf8'))
  expect(backup).toMatchObject({ kind: 'mnt.backup', backupVersion: 2, activeProfileId: before.meta.id })
  expect(backup.profiles).toEqual([before])
  expect(backup.assets).toHaveLength(1)
  expect(backup.assets[0]).toMatchObject({ id: before.background.image.asset.replace('mnt-asset:', ''), mime: 'image/png' })
  expect(backup.settings).toBeUndefined()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '恢复默认设置', exact: true }).click()
  await expect(page.locator('.shortcut')).toHaveCount(1)
  await page.getByRole('button', { name: '移除壁纸', exact: true }).click()
  await expect(page.locator('.app')).toHaveCSS('background-image', 'none')
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('2 个网站')
    expect(dialog.message()).toContain('包含壁纸')
    await dialog.accept()
  })
  // Import must reload the page so every context reads the new generation.
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('导入备份', { exact: true }).setInputFiles(path!)
  await reloaded
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.drawer')).toHaveCount(0)
  await expect(page.locator('.shortcut')).toHaveCount(2)
  await expect(page.locator('.app')).toHaveCSS('background-image', /blob:/)
  expect(await activeProfile(page)).toEqual(before)
})

test('imports a v1 backup when saved profiles cannot be loaded', async ({ page }) => {
  await open(page)
  await page.evaluate(key => localStorage.setItem(key, '{broken'), INDEX_KEY)
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Could not read saved settings')
  await expect(page.getByRole('button', { name: '导出备份' })).toHaveCount(0)
  page.once('dialog', dialog => dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('Import backup', { exact: true }).setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: '2026-10-31T10:24:00Z', settings: v1Settings('#aabbcc') })) })
  await reloaded
  await expect(page.locator('.clock')).toBeVisible()
  expect((await activeProfile(page)).theme.color.accent).toBe('#aabbcc')
})

test('imports a v2 backup when saved profiles cannot be loaded', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#778899')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#778899')
  const profile = await activeProfile(page)
  await page.evaluate(key => localStorage.setItem(key, '{broken'), INDEX_KEY)
  await page.reload()
  await expect(page.getByRole('alert')).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('Import backup', { exact: true }).setInputFiles({ name: 'v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'mnt.backup', backupVersion: 2, exportedAt: '2026-10-31T10:24:00Z', activeProfileId: profile.meta.id, profiles: [profile], assets: [] })) })
  await reloaded
  await expect(page.locator('.clock')).toBeVisible()
  expect(await activeProfile(page)).toEqual(profile)
})

test('invalid and cancelled imports preserve the current setup', async ({ page }) => {
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#b4d2a8')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#b4d2a8')
  const before = await page.evaluate(key => localStorage.getItem(key), INDEX_KEY)
  await page.getByLabel('导入备份', { exact: true }).setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') })
  await expect(page.getByRole('alert')).toContainText('不是有效的 JSON')
  expect(await page.evaluate(key => localStorage.getItem(key), INDEX_KEY)).toBe(before)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByLabel('导入备份', { exact: true }).setInputFiles({
    name: 'valid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: '2026-10-31T10:24:00Z', settings: v1Settings('#abcdef') })),
  })
  await expect(page.locator('section[aria-busy]').first()).toHaveAttribute('aria-busy', 'false')
  expect(await page.evaluate(key => localStorage.getItem(key), INDEX_KEY)).toBe(before)
})

test('language switching and portal selection follow the accent color', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 })
  await open(page)
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#c3a6ef')
  await page.getByRole('combobox', { name: '语言', exact: true }).click()
  const selected = page.locator('.dropdown-item[data-state=checked]')
  await expect(selected).toHaveCSS('color', 'rgb(195, 166, 239)')
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Personalize', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('combobox', { name: 'Language', exact: true }).click()
  await expect(selected).toHaveCSS('color', 'rgb(195, 166, 239)')
  await page.getByRole('option', { name: '简体中文', exact: true }).click()
  await expect(page.getByRole('heading', { name: '个性化设置', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('split and reversed layouts remain inside narrow windows with many shortcuts', async ({ page }) => {
  await open(page)
  // Seed the committed v2 generation after a real UI edit.
  await page.locator('.settings-button').click()
  await page.locator('input[type=color]').first().fill('#90d5cc')
  await expect.poll(async () => (await activeProfile(page)).theme.color.accent).toBe('#90d5cc')
  await seedActiveProfile(page, profile => {
    const bookmarks = profile.widgets.find((w: any) => w.type === 'bookmarks')
    bookmarks.props.columns = 10
    bookmarks.props.layout = 'split'
    bookmarks.props.reverse = true
    profile.layout.areas = ['bookmarks overview']
    profile.theme.iconSize = 120
    const group = profile.bookmarks.groups[0]
    group.items = Array.from({ length: 15 }, (_, i) => ({ ...group.items[0], id: String(i), name: `Long website name ${i}` }))
  })
  for (const [width, height] of [[1440, 900], [1920, 1080], [800, 600], [400, 800]]) {
    await page.setViewportSize({ width, height })
    await page.reload()
    await expect(page.locator('.shortcut')).toHaveCount(15)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const boxes = await page.locator('.shortcut').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= innerWidth
    }))
    expect(boxes.every(Boolean)).toBe(true)
  }
})
