import { test, expect } from '@playwright/test'
import { mkdir, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openTab, seedExistingUser, templateBookmarks } from '../e2e/helpers'

const output = resolve(process.cwd(), 'store/screenshots')

test('generate original store screenshots', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1280, height: 800 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-08-01T19:17:00Z') })
  await seedExistingUser(page, { language: 'en', theme: 'light', shortcuts: templateBookmarks.slice(0, 3), columns: 3 })
  await page.route('**/favicon.ico', route => route.abort())
  await page.route('https://zanderh-code.github.io/promptab/gallery/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/promptab/gallery/', '')
    if (path !== 'index.json' && !/^packs\/[a-z0-9-]+\.json$/.test(path)) return route.abort()
    await route.fulfill({ body: await readFile(resolve(process.cwd(), 'docs/gallery', path)), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } })
  })
  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: {
    results: [{ id: 1, name: 'Portland', country: 'United States', latitude: 45.52, longitude: -122.68 }],
  } }))
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
    current: { temperature_2m: 22, weather_code: 2 },
    daily: { time: ['2026-08-01', '2026-08-02', '2026-08-03'], weather_code: [2, 1, 3], temperature_2m_max: [24, 26, 23], temperature_2m_min: [15, 16, 14] },
  } }))
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await mkdir(output, { recursive: true })

  async function capture(name: string, extraStyle = '') {
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(0, 0)
    await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled', style: `.undo-toast { visibility: hidden !important } ${extraStyle}` })
  }
  async function settings() {
    await page.locator('.mnt-settings-entry').first().click()
    await expect(page.locator('.drawer')).toBeVisible()
  }
  async function applyGalleryTheme(id: string) {
    const pack = JSON.parse(await readFile(resolve(process.cwd(), 'docs/gallery/packs', `${id}.json`), 'utf8'))
    await page.evaluate(({ theme, background }) => {
      const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
      const key = `profiles:v2:generation:${index.generation}`
      const snapshot = JSON.parse(localStorage.getItem(key)!)
      const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
      profile.theme = {
        ...profile.theme,
        ...theme,
        color: { ...profile.theme.color, ...theme.color },
        ...(theme.colorLight ? { colorLight: { ...profile.theme.colorLight, ...theme.colorLight } } : {}),
      }
      profile.background = { ...profile.background, ...background }
      localStorage.setItem(key, JSON.stringify(snapshot))
    }, { theme: pack.theme, background: pack.background })
    await page.reload()
    await expect(page.locator('.clock')).toBeVisible()
  }
  async function previewAiReply(id: string) {
    const source = JSON.parse(await readFile(resolve(process.cwd(), 'docs/gallery/packs', `${id}.json`), 'utf8'))
    const pack = { kind: source.kind, packVersion: source.packVersion, meta: { name: source.meta.name, author: source.meta.author }, theme: source.theme, background: source.background }
    await settings()
    await openTab(page, 'ai')
    await page.getByRole('textbox', { name: "The AI's reply" }).fill(`Here is your theme:\n\n\`\`\`json\n${JSON.stringify(pack, null, 2)}\n\`\`\``)
    await expect(page.locator('.sd-ai-ok')).toBeVisible()
    await page.locator('.sd-ai .sd-button', { hasText: /^Preview$/ }).click()
    await expect(page.locator('.mnt-banner[data-kind="preview"]')).toBeVisible()
  }

  await applyGalleryTheme('swiss-minimal')
  await capture('01-default')
  await applyGalleryTheme('warm-study')
  await capture('02-warm-study')
  await applyGalleryTheme('plum-night')
  await capture('03-plum-night')
  await applyGalleryTheme('cyber-grid')
  await settings()
  await openTab(page, 'appearance')
  await capture('04-settings')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await previewAiReply('ocean-depths')
  await capture('05-ai')
  await page.locator('.mnt-banner[data-kind="preview"]').getByRole('button', { name: 'Discard', exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()

  await applyGalleryTheme('violet-orbit')
  await settings()
  await openTab(page, 'layout')
  await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
  await page.getByRole('option', { name: 'Three-column dashboard', exact: true }).click()
  await openTab(page, 'widgets')
  async function moveLastWidget(area: string) {
    await page.getByRole('combobox', { name: 'Widget area', exact: true }).last().click()
    await page.getByRole('option', { name: area, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Weather', exact: true }).click()
  await moveLastWidget('date')
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Portland')
  await page.getByRole('button', { name: 'Search cities', exact: true }).click()
  await page.getByRole('option', { name: 'Portland, United States' }).click()
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  await page.getByRole('textbox', { name: 'Note content', exact: true }).fill('Make room for the things that matter.')
  await moveLastWidget('search')
  await page.getByRole('button', { name: 'Todo list', exact: true }).click()
  await page.getByRole('button', { name: 'Add todo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Todo item' }).fill('Plan the next adventure')
  await moveLastWidget('links')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const key = `profiles:v2:generation:${index.generation}`
    const snapshot = JSON.parse(localStorage.getItem(key)!)
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const search = profile.widgets.find((widget: { type: string }) => widget.type === 'search')
    const bookmarks = profile.widgets.find((widget: { type: string }) => widget.type === 'bookmarks')
    if (search) search.hidden = true
    if (bookmarks) bookmarks.hidden = true
    localStorage.setItem(key, JSON.stringify(snapshot))
  })
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  const weather = page.locator('[data-widget="weather"]')
  await weather.getByRole('button', { name: 'Update weather' }).click()
  await expect(weather.getByText('22°C')).toBeVisible()
  await capture('06-widgets-weather')

  await applyGalleryTheme('slate-rain')
  // A local storage mock makes the sync controls available in this web-preview capture.
  const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, key === 'settings' ? JSON.parse(value) : value])))
  await page.addInitScript((initial: Record<string, unknown>) => {
    const local: Record<string, unknown> = { ...initial }
    const sync: Record<string, unknown> = {}
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
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: {
      local: area(local), sync: area(sync), onChanged: { addListener() {}, removeListener() {} },
    } } })
  }, stored)
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  await settings()
  await openTab(page, 'data')
  await page.getByRole('heading', { name: 'Browser sync', exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('checkbox', { name: 'Sync this profile across devices' })).toBeEnabled()
  await page.getByText('Import from nightTab', { exact: true }).evaluate(element => element.closest('.sd-item')?.setAttribute('data-store-screenshot-hide', ''))
  await capture('07-sync-settings', '[data-store-screenshot-hide] { display: none !important }')
  for (const file of await readdir(output)) {
    if (!file.toLowerCase().endsWith('.png')) continue
    const image = await readFile(resolve(output, file))
    expect(image.readUInt32BE(16), `${file} width`).toBe(1280)
    expect(image.readUInt32BE(20), `${file} height`).toBe(800)
  }
  expect(errors).toEqual([])
})
