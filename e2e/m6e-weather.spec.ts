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
  let placeQuery = ''
  await page.route('https://api.bigdatacloud.net/**', route => {
    placeQuery = new URL(route.request().url()).search
    return route.fulfill({ json: { city: '旧金山', locality: 'Mission District', principalSubdivision: '加利福尼亚州', countryName: '美国' } })
  })
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
  // Before a city is chosen the card says so and makes no request.
  const widget = page.locator('[data-widget="weather"]')
  await expect(widget.getByText('选择城市后即可显示天气。')).toBeVisible()
  expect(forecastCalls).toBe(0)

  // Typing shows matching cities in a list; no separate search button.
  const city = page.getByRole('combobox', { name: '城市' })
  await city.fill('London')
  await expect(page.getByRole('option', { name: 'London, United Kingdom' })).toBeVisible()
  await page.getByRole('option', { name: 'London, United Kingdom' }).click()
  await expect(city).toHaveValue('London, United Kingdom')
  await expect(page.getByText('已保存「London, United Kingdom」，天气组件会自动加载。')).toBeVisible()

  // Arrow keys and Enter pick from the list too.
  await city.fill('Par')
  await expect(page.getByRole('option')).toHaveCount(2)
  await city.press('ArrowDown')
  await city.press('Enter')
  await expect(city).toHaveValue('Paris, France')

  await page.getByRole('button', { name: '使用当前位置', exact: true }).click()
  // The current location is named, not just called "Current location".
  await expect(city).toHaveValue('旧金山, 加利福尼亚州, 美国')
  expect(placeQuery).toBe('?latitude=37.7749&longitude=-122.4194&localityLanguage=zh')
  await page.getByRole('combobox', { name: '温度单位' }).click()
  await page.getByRole('option', { name: '华氏度', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()

  // The widget loads by itself for the chosen place; nobody has to press refresh.
  await expect(widget.getByRole('heading', { name: '旧金山, 加利福尼亚州, 美国' })).toBeVisible()
  await expect(widget.getByText('68°F')).toBeVisible()
  await expect(widget.getByText('75°F / 58°F').first()).toBeVisible()
  await expect(widget.getByText('周一', { exact: true })).toBeVisible()
  expect(forecastCoordinates).toBe('37.7749,-122.4194')

  // A reload shows the saved forecast straight away from the 30-minute cache.
  const callsBeforeReload = forecastCalls
  await page.reload()
  await expect(widget.getByText('68°F')).toBeVisible()
  expect(forecastCalls).toBe(callsBeforeReload)

  online = false
  await page.clock.fastForward(31 * 60_000)
  await widget.getByRole('button', { name: '更新天气' }).click()
  await expect(widget.getByText('离线 · 显示已保存的天气')).toBeVisible()
  await expect(widget.getByText('68°F')).toBeVisible()
  expect(forecastCalls).toBeGreaterThan(callsBeforeReload)
})
