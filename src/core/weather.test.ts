import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeatherForecast, hasPlacePermission, hasWeatherPermission, isForecastFresh, locationProblem, lookupPlaceName, parseOpenMeteoForecast, readCachedForecast, requestWeatherPermission, searchWeatherCities, weatherCityDetail, weatherCityLabel, weatherIconForCode, type WeatherCache } from './weather'

afterEach(() => vi.unstubAllGlobals())

const payload = {
  current: { temperature_2m: 18.5, weather_code: 2 },
  daily: {
    time: ['2026-11-02', '2026-11-03'],
    weather_code: [2, 61],
    temperature_2m_max: [21, 17],
    temperature_2m_min: [12, 9],
  },
}

function memoryCache(): WeatherCache {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('weather permissions', () => {
  it.each(['forecast', 'geocoding'] as const)('requests Firefox location consent with %s access in the user gesture', async service => {
    const request = vi.fn().mockResolvedValue(false)
    vi.stubGlobal('browser', { runtime: { getURL: () => 'moz-extension://id/' }, permissions: { request } })
    const result = requestWeatherPermission(service)
    const origin = service === 'forecast' ? 'https://api.open-meteo.com/*' : 'https://geocoding-api.open-meteo.com/*'
    expect(request).toHaveBeenCalledWith({ origins: [origin], data_collection: ['locationInfo'] })
    await expect(result).resolves.toBe(false)
  })

  it('allows web-origin requests without extension permissions', async () => {
    vi.stubGlobal('chrome', undefined)
    vi.stubGlobal('browser', undefined)
    await expect(requestWeatherPermission('forecast')).resolves.toBe(true)
  })

  it('requests only host access on Chromium', async () => {
    const request = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request } })
    await expect(requestWeatherPermission('forecast')).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith({ origins: ['https://api.open-meteo.com/*'] })
  })
})

describe('weather access for automatic loads', () => {
  it('asks for both Open-Meteo hosts at once so choosing a city also allows the forecast', async () => {
    const request = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request } })
    await requestWeatherPermission('all')
    expect(request).toHaveBeenCalledWith({ origins: ['https://api.open-meteo.com/*', 'https://geocoding-api.open-meteo.com/*'] })
  })

  it('adds the place-name host only when the current location is used', async () => {
    const request = vi.fn().mockResolvedValue(true)
    const contains = vi.fn().mockResolvedValue(false)
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request, contains } })
    await requestWeatherPermission('location')
    expect(request).toHaveBeenCalledWith({ origins: ['https://api.open-meteo.com/*', 'https://geocoding-api.open-meteo.com/*', 'https://api.bigdatacloud.net/*'] })
    await expect(hasPlacePermission()).resolves.toBe(false)
    expect(contains).toHaveBeenCalledWith({ origins: ['https://api.bigdatacloud.net/*'] })
  })

  it('checks the forecast permission without prompting', async () => {
    const contains = vi.fn().mockResolvedValue(true)
    const request = vi.fn()
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request, contains } })
    await expect(hasWeatherPermission()).resolves.toBe(true)
    expect(contains).toHaveBeenCalledWith({ origins: ['https://api.open-meteo.com/*'] })
    expect(request).not.toHaveBeenCalled()
  })
})

describe('weather cities and location', () => {
  it('names the current location from the reverse geocoder', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ city: 'Portland', locality: 'Downtown', principalSubdivision: 'Oregon', countryName: 'United States' })))
    await expect(lookupPlaceName(45.52, -122.68, { fetcher, language: 'en' })).resolves.toBe('Portland, Oregon, United States')
    const url = fetcher.mock.calls[0][0] as URL
    expect(url.origin + url.pathname).toBe('https://api.bigdatacloud.net/data/reverse-geocode-client')
    expect(url.searchParams.get('localityLanguage')).toBe('en')
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit' })
  })

  it('falls back to the locality, drops a region that repeats the city, and returns nothing without a name', async () => {
    const reply = (body: object) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body)))
    await expect(lookupPlaceName(31.2, 121.5, { fetcher: reply({ city: '', locality: '上海市', principalSubdivision: '上海市', countryName: '中国' }) })).resolves.toBe('上海市, 中国')
    await expect(lookupPlaceName(0, 0, { fetcher: reply({ city: '', locality: '', countryName: '' }) })).resolves.toBe('')
    await expect(lookupPlaceName(0, 0, { fetcher: vi.fn().mockResolvedValue(new Response('', { status: 429 })) })).rejects.toThrow()
  })

  it('labels same-named cities by region and drops a region that repeats the city', () => {
    expect(weatherCityLabel({ name: '北京', region: '北京市', country: '中国' })).toBe('北京, 中国')
    expect(weatherCityLabel({ name: '北京', region: '重庆市', country: '中国' })).toBe('北京, 重庆市, 中国')
    expect(weatherCityDetail({ name: 'London', region: 'England', country: 'United Kingdom' })).toBe('England, United Kingdom')
    expect(weatherCityLabel({ name: 'Singapore', region: '', country: 'Singapore' })).toBe('Singapore, Singapore')
  })

  it('keeps the region from geocoding results', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 1, name: '北京', admin1: '重庆市', country: '中国', latitude: 30.7, longitude: 108.7 }] })))
    await expect(searchWeatherCities('北京', { fetcher })).resolves.toEqual([{ id: 1, name: '北京', region: '重庆市', country: '中国', latitude: 30.7, longitude: 108.7 }])
  })

  it('turns geolocation error codes into actionable messages', () => {
    expect(locationProblem(1)).toBe('locationDenied')
    expect(locationProblem(2)).toBe('locationUnavailable')
    expect(locationProblem(3)).toBe('locationTimeout')
  })
})

describe('weather data', () => {
  it('reads any saved forecast for instant display and reports freshness', () => {
    const cache = memoryCache()
    const forecast = parseOpenMeteoForecast(payload, 1_000)
    cache.setItem('weather:51.50000:-0.12000:celsius', JSON.stringify(forecast))
    expect(readCachedForecast(51.5, -0.12, 'celsius', cache)).toEqual(forecast)
    expect(readCachedForecast(51.5, -0.12, 'fahrenheit', cache)).toBeNull()
    expect(isForecastFresh(forecast, 1_000 + 29 * 60_000)).toBe(true)
    expect(isForecastFresh(forecast, 1_000 + 31 * 60_000)).toBe(false)
  })

  it('skips a fresh cache when forced by the refresh button', async () => {
    const cache = memoryCache()
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload)))
    await fetchWeatherForecast(51.5, -0.12, 'celsius', { cache, fetcher, now: () => 1_000 })
    await fetchWeatherForecast(51.5, -0.12, 'celsius', { cache, fetcher, now: () => 2_000 })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await fetchWeatherForecast(51.5, -0.12, 'celsius', { cache, fetcher, now: () => 3_000, force: true })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('converts an Open-Meteo response into a compact forecast snapshot', () => {
    expect(parseOpenMeteoForecast(payload, 1_800_000_000_000)).toEqual({
      temperature: 18.5,
      code: 2,
      high: 21,
      low: 12,
      days: [
        { date: '2026-11-02', code: 2, high: 21, low: 12 },
        { date: '2026-11-03', code: 61, high: 17, low: 9 },
      ],
      updatedAt: 1_800_000_000_000,
    })
  })

  it('maps documented weather codes to stable icon names', () => {
    expect([0, 1, 2, 3, 45, 51, 61, 71, 95, 999].map(weatherIconForCode)).toEqual([
      'Sun', 'CloudSun', 'CloudSun', 'Cloud', 'CloudFog', 'CloudDrizzle', 'CloudRain', 'CloudSnow', 'CloudLightning', 'Cloud',
    ])
  })

  it('rejects invalid coordinates before requesting weather', async () => {
    const fetcher = vi.fn()
    await expect(fetchWeatherForecast(91, 0, 'celsius', { cache: memoryCache(), fetcher })).rejects.toThrow('location')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('uses a fresh local cache without making a request', async () => {
    const cache = memoryCache()
    const fetcher = vi.fn()
    const fresh = parseOpenMeteoForecast(payload, 1_800_000_000_000)
    cache.setItem('weather:51.50000:-0.12000:celsius', JSON.stringify(fresh))

    await expect(fetchWeatherForecast(51.5, -0.12, 'celsius', {
      cache, fetcher, now: () => 1_800_000_000_000 + 10 * 60_000,
    })).resolves.toMatchObject({ forecast: fresh, offline: false, cached: true })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns the last cached forecast when refresh fails after expiry', async () => {
    const cache = memoryCache()
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))
    const stale = parseOpenMeteoForecast(payload, 1_800_000_000_000)
    cache.setItem('weather:51.50000:-0.12000:celsius', JSON.stringify(stale))

    await expect(fetchWeatherForecast(51.5, -0.12, 'celsius', {
      cache, fetcher, now: () => 1_800_000_000_000 + 31 * 60_000,
    })).resolves.toEqual({ forecast: stale, offline: true, cached: true })
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
