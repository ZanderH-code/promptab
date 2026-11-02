import { extensionApi } from '../platform/extension'

export type WeatherUnit = 'celsius' | 'fahrenheit'

export type WeatherDay = { date: string; code: number; high: number; low: number }
export type WeatherForecast = {
  temperature: number
  code: number
  high: number
  low: number
  days: WeatherDay[]
  updatedAt: number
}

export type WeatherCache = Pick<Storage, 'getItem' | 'setItem'>
export type WeatherResult = { forecast: WeatherForecast; offline: boolean; cached: boolean }

type OpenMeteoResponse = {
  current: { temperature_2m: number; weather_code: number }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] }
}

const CACHE_TTL = 30 * 60_000
const FORECAST_ORIGIN = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_ORIGIN = 'https://geocoding-api.open-meteo.com/v1/search'

export type WeatherCity = { id: number; name: string; country: string; latitude: number; longitude: number }

export async function requestWeatherPermission(service: 'forecast' | 'geocoding') {
  const origin = service === 'forecast' ? 'https://api.open-meteo.com' : 'https://geocoding-api.open-meteo.com'
  const permissions = extensionApi()?.permissions
  return permissions ? permissions.request({ origins: [`${origin}/*`] }) : true
}

export async function searchWeatherCities(query: string, options: { fetcher?: typeof fetch; language?: string } = {}): Promise<WeatherCity[]> {
  const name = query.trim()
  if (name.length < 2 || name.length > 100) return []
  const url = new URL(GEOCODING_ORIGIN)
  url.search = new URLSearchParams({ name, count: '8', language: options.language ?? 'en', format: 'json' }).toString()
  const response = await (options.fetcher ?? fetch)(url, { credentials: 'omit', redirect: 'error', cache: 'no-store' })
  if (!response.ok) throw new Error(`City search failed (${response.status})`)
  const payload = await response.json() as { results?: unknown }
  if (!Array.isArray(payload.results)) return []
  return payload.results.slice(0, 8).flatMap((item): WeatherCity[] => {
    if (!item || typeof item !== 'object') return []
    const city = item as Record<string, unknown>
    if (!isNumber(city.id) || typeof city.name !== 'string' || !isNumber(city.latitude) || !isNumber(city.longitude)) return []
    return [{ id: city.id, name: city.name.slice(0, 100), country: typeof city.country === 'string' ? city.country.slice(0, 100) : '', latitude: city.latitude, longitude: city.longitude }]
  })
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseOpenMeteoForecast(payload: OpenMeteoResponse, updatedAt = Date.now()): WeatherForecast {
  if (!payload || !payload.current || !payload.daily || !isNumber(payload.current.temperature_2m) || !isNumber(payload.current.weather_code)) {
    throw new Error('Invalid weather response')
  }
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = payload.daily
  if (![time, weather_code, temperature_2m_max, temperature_2m_min].every(Array.isArray) || !time.length ||
    time.length !== weather_code.length || time.length !== temperature_2m_max.length || time.length !== temperature_2m_min.length ||
    !time.every((date: unknown) => typeof date === 'string') || !weather_code.every(isNumber) ||
    !temperature_2m_max.every(isNumber) || !temperature_2m_min.every(isNumber)) {
    throw new Error('Invalid weather response')
  }
  const days = time.map((date, index) => ({ date, code: weather_code[index], high: temperature_2m_max[index], low: temperature_2m_min[index] }))
  return {
    temperature: payload.current.temperature_2m,
    code: payload.current.weather_code,
    high: days[0].high,
    low: days[0].low,
    days,
    updatedAt,
  }
}

export function weatherIconForCode(code: number): 'Sun' | 'CloudSun' | 'Cloud' | 'CloudFog' | 'CloudDrizzle' | 'CloudRain' | 'CloudSnow' | 'CloudLightning' {
  if (code === 0) return 'Sun'
  if (code === 1 || code === 2) return 'CloudSun'
  if (code === 45 || code === 48) return 'CloudFog'
  if ([51, 53, 55, 56, 57].includes(code)) return 'CloudDrizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'CloudRain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'CloudSnow'
  if ([95, 96, 99].includes(code)) return 'CloudLightning'
  return 'Cloud'
}

export function weatherCacheKey(latitude: number, longitude: number, unit: WeatherUnit) {
  return `weather:${latitude.toFixed(5)}:${longitude.toFixed(5)}:${unit}`
}

function readCached(cache: WeatherCache, key: string): WeatherForecast | null {
  try {
    const value = cache.getItem(key)
    if (!value) return null
    const parsed = JSON.parse(value) as WeatherForecast
    if (!isNumber(parsed.temperature) || !isNumber(parsed.code) || !isNumber(parsed.high) || !isNumber(parsed.low) ||
      !isNumber(parsed.updatedAt) || !Array.isArray(parsed.days)) return null
    return parsed
  } catch {
    return null
  }
}

export async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
  unit: WeatherUnit,
  options: { cache?: WeatherCache; fetcher?: typeof fetch; now?: () => number } = {},
): Promise<WeatherResult> {
  if (!isNumber(latitude) || !isNumber(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('location')
  const cache = options.cache ?? localStorage
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? Date.now
  const key = weatherCacheKey(latitude, longitude, unit)
  const cached = readCached(cache, key)
  const currentTime = now()
  if (cached && currentTime - cached.updatedAt >= 0 && currentTime - cached.updatedAt < CACHE_TTL) {
    return { forecast: cached, offline: false, cached: true }
  }

  try {
    const url = new URL(FORECAST_ORIGIN)
    url.search = new URLSearchParams({
      latitude: String(latitude), longitude: String(longitude),
      current: 'temperature_2m,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      temperature_unit: unit, forecast_days: '3', timezone: 'auto',
    }).toString()
    const response = await fetcher(url, { credentials: 'omit', redirect: 'error', cache: 'no-store' })
    if (!response.ok) throw new Error(`Weather request failed (${response.status})`)
    const forecast = parseOpenMeteoForecast(await response.json() as OpenMeteoResponse, now())
    try { cache.setItem(key, JSON.stringify(forecast)) } catch { /* The forecast still works when storage is full or unavailable. */ }
    return { forecast, offline: false, cached: false }
  } catch (error) {
    if (cached) return { forecast: cached, offline: true, cached: true }
    throw error
  }
}
