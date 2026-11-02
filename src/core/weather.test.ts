import { describe, expect, it, vi } from 'vitest'
import { fetchWeatherForecast, parseOpenMeteoForecast, weatherIconForCode, type WeatherCache } from './weather'

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

describe('weather data', () => {
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
