import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { useState } from 'react'
import type { Settings } from '../core/model'
import type { Widget } from '../core/schema/profile'
import { fetchWeatherForecast, requestWeatherPermission, weatherIconForCode, type WeatherForecast, type WeatherUnit } from '../core/weather'
import { weatherText, type WeatherMessage } from '../core/weatherMessages'

type WeatherWidgetData = Extract<Widget, { type: 'weather' }>
type Props = { widget: WeatherWidgetData; language: Settings['language'] }

const icons = { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning }

function temperature(value: number, unit: WeatherUnit) {
  return `${Math.round(value)}°${unit === 'celsius' ? 'C' : 'F'}`
}

function WeatherDay({ day, unit, language }: { day: WeatherForecast['days'][number]; unit: WeatherUnit; language: string }) {
  const Icon = icons[weatherIconForCode(day.code)]
  const date = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T00:00:00Z`))
  return <li><span>{date}</span><Icon aria-hidden="true" size={18} /><span>{temperature(day.high, unit)} / {temperature(day.low, unit)}</span></li>
}

export function WeatherWidget({ widget, language }: Props) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'permission' | 'refresh' | 'location' | null>(null)
  const unit = widget.props.unit ?? 'celsius'
  const hasCoordinates = typeof widget.props.latitude === 'number' && typeof widget.props.longitude === 'number'

  const refresh = async () => {
    if (!hasCoordinates) { setStatus('location'); return }
    setBusy(true)
    setStatus(null)
    try {
      const granted = await requestWeatherPermission('forecast')
      if (!granted) { setStatus('permission'); return }
      const result = await fetchWeatherForecast(widget.props.latitude!, widget.props.longitude!, unit)
      setForecast(result.forecast)
      setOffline(result.offline)
    } catch { setStatus('refresh') }
    finally { setBusy(false) }
  }

  const Icon = forecast ? icons[weatherIconForCode(forecast.code)] : CloudSun
  const statusMessage: WeatherMessage | null = status === 'permission' ? 'permissionDenied' : status === 'location' ? 'chooseLocation' : status === 'refresh' ? 'refreshFailed' : null
  const title = widget.props.currentLocation ? weatherText(language, 'currentLocation') : widget.props.city || weatherText(language, 'title')
  return <section className="mnt-weather" aria-label={title}>
    <header className="mnt-weather-heading"><h2>{title}</h2><button type="button" className="mnt-weather-refresh" disabled={busy} onClick={() => void refresh()}>{busy ? weatherText(language, 'loading') : weatherText(language, 'refresh')}</button></header>
    {forecast ? <>
      <div className="mnt-weather-current"><Icon aria-hidden="true" size={34} /><strong>{temperature(forecast.temperature, unit)}</strong><span>{temperature(forecast.high, unit)} / {temperature(forecast.low, unit)}</span></div>
      {widget.props.showForecast !== false && <ul className="mnt-weather-days">{forecast.days.map(day => <WeatherDay key={day.date} day={day} unit={unit} language={language} />)}</ul>}
      <p className="mnt-weather-updated" aria-live="polite">{offline ? weatherText(language, 'offline') : weatherText(language, 'updatedAt', { time: new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(forecast.updatedAt) })}</p>
    </> : <p className="mnt-weather-empty">{weatherText(language, 'tapToLoad')}</p>}
    {statusMessage && <p className="mnt-weather-status" role="status">{weatherText(language, statusMessage)}</p>}
  </section>
}
