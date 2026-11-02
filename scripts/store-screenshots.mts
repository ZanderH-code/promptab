import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openTab, seedExistingUser, templateBookmarks } from '../e2e/helpers'

const output = resolve(process.cwd(), 'store/screenshots')

test('generate original store screenshots', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-08-01T19:17:00Z') })
  await seedExistingUser(page, { language: 'en', theme: 'light', accent: '#3a5a80', shortcuts: templateBookmarks.slice(0, 6), columns: 3 })
  await page.route('**/favicon.ico', route => route.abort())
  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: {
    results: [{ id: 1, name: 'Portland', country: 'United States', latitude: 45.52, longitude: -122.68 }],
  } }))
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
    current: { temperature_2m: 22, weather_code: 2 },
    daily: { time: ['2026-08-01', '2026-08-02', '2026-08-03'], weather_code: [2, 1, 3], temperature_2m_max: [24, 26, 23], temperature_2m_min: [15, 16, 14] },
  } }))
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await mkdir(output, { recursive: true })

  async function capture(name: string) {
    await page.mouse.move(0, 0)
    await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled', style: '.undo-toast { visibility: hidden !important }' })
  }
  async function settings() {
    await page.locator('.mnt-settings-entry').first().click()
    await expect(page.locator('.drawer')).toBeVisible()
  }
  async function template(name: string, id: string) {
    await settings()
    await openTab(page, 'layout')
    await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
    await page.getByRole('option', { name, exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', id)
  }

  await capture('01-default')
  await template('Side split · icons only', 'icon-split')
  await capture('02-template-a')
  await template('Top bar and grid', 'top-grid')
  await capture('03-template-b')
  await settings()
  await openTab(page, 'appearance')
  await capture('04-settings')
  await openTab(page, 'ai')
  await page.locator('.sd-ai-request').fill('A calm, welcoming workspace for planning my week.')
  await capture('05-ai')
  await page.getByRole('button', { name: 'Close settings' }).click()

  await template('Three-column dashboard', 'dashboard')
  await settings()
  await openTab(page, 'widgets')
  async function moveLastWidget(area: string) {
    await page.getByRole('combobox', { name: 'Widget area', exact: true }).last().click()
    await page.getByRole('option', { name: area, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Todo list', exact: true }).click()
  await page.getByRole('button', { name: 'Add todo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Todo item' }).fill('Plan the next adventure')
  await moveLastWidget('links')
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  await page.getByRole('textbox', { name: 'Note content', exact: true }).fill('Make room for the things that matter.')
  await moveLastWidget('search')
  await page.getByRole('button', { name: 'Weather', exact: true }).click()
  await moveLastWidget('date')
  await page.getByRole('textbox', { name: 'City', exact: true }).fill('Portland')
  await page.getByRole('button', { name: 'Search cities', exact: true }).click()
  await page.getByRole('option', { name: 'Portland, United States' }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const weather = page.locator('[data-widget="weather"]')
  await weather.getByRole('button', { name: 'Update weather' }).click()
  await expect(weather.getByText('22°C')).toBeVisible()
  await expect(page.getByText('Plan the next adventure')).toBeVisible()
  await capture('06-widgets-weather')

  // A local storage mock makes the sync controls available in this web-preview capture.
  await page.addInitScript(() => {
    const local: Record<string, unknown> = { settings: { language: 'en' } }
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
  })
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  await settings()
  await openTab(page, 'data')
  const syncHeading = page.getByRole('heading', { name: 'Browser sync', exact: true })
  await syncHeading.scrollIntoViewIfNeeded()
  await expect(page.getByRole('checkbox', { name: 'Sync this profile across devices' })).toBeEnabled()
  await capture('07-sync-settings')
  expect(errors).toEqual([])
})
