import { test, expect } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const forecast = {
  current: { temperature_2m: 68, weather_code: 2 },
  daily: {
    time: ['2026-11-02', '2026-11-03', '2026-11-04'],
    weather_code: [2, 61, 0],
    temperature_2m_max: [75, 63, 70],
    temperature_2m_min: [58, 50, 54],
  },
}

test('weather searches cities, changes units, caches results, and falls back offline', async ({ page }) => {
  await seedExistingUser(page)
  await page.clock.install({ time: new Date('2026-11-02T10:24:00Z') })
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-clock')).toBeVisible()

  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({
    json: { results: [
      { id: 1, name: 'London', country: 'United Kingdom', latitude: 51.5, longitude: -0.12 },
      { id: 2, name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
    ] },
  }))
  let online = true
  let forecastCalls = 0
  let forecastCoordinates = ''
  await page.route('https://api.open-meteo.com/**', route => {
    forecastCalls += 1
    const url = new URL(route.request().url())
    forecastCoordinates = `${url.searchParams.get('latitude')},${url.searchParams.get('longitude')}`
    return online ? route.fulfill({ json: forecast }) : route.abort()
  })

  await page.locator('.settings-button').click()
  await openTab(page, 'widgets')
  await page.getByRole('button', { name: '天气', exact: true }).click()
  const city = page.getByRole('textbox', { name: '城市' })
  await city.fill('London')
  await page.getByRole('button', { name: '搜索城市', exact: true }).click()
  await page.getByRole('option', { name: 'London, United Kingdom' }).click()
  await city.fill('Paris')
  await page.getByRole('button', { name: '搜索城市', exact: true }).click()
  await page.getByRole('option', { name: 'Paris, France' }).click()
  await expect(city).toHaveValue('Paris, France')
  await page.getByRole('button', { name: '使用当前位置', exact: true }).click()
  await expect(city).toHaveValue('当前位置')
  await page.getByRole('combobox', { name: '温度单位' }).click()
  await page.getByRole('option', { name: '华氏度', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()

  const widget = page.locator('[data-widget="weather"]')
  await expect(widget.getByRole('heading', { name: '当前位置' })).toBeVisible()
  expect(forecastCalls).toBe(0)
  await widget.getByRole('button', { name: '更新天气' }).click()
  await expect(widget.getByText('68°F')).toBeVisible()
  await expect(widget.getByText('75°F / 58°F').first()).toBeVisible()
  await expect(widget.getByText('周一', { exact: true })).toBeVisible()
  expect(forecastCalls).toBe(1)
  expect(forecastCoordinates).toBe('37.7749,-122.4194')

  online = false
  await page.clock.fastForward(31 * 60_000)
  await widget.getByRole('button', { name: '更新天气' }).click()
  await expect(widget.getByText('离线 · 显示已保存的天气')).toBeVisible()
  await expect(widget.getByText('68°F')).toBeVisible()
  expect(forecastCalls).toBe(2)
})
