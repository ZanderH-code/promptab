import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, RotateCw, Sun } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../core/model'
import type { Widget } from '../core/schema/profile'
import { fetchWeatherForecast, hasPlacePermission, hasWeatherPermission, lookupPlaceName, isForecastFresh, readCachedForecast, requestWeatherPermission, weatherIconForCode, type WeatherForecast, type WeatherUnit } from '../core/weather'
import { weatherText, type WeatherMessage } from '../core/weatherMessages'

type WeatherWidgetData = Extract<Widget, { type: 'weather' }>
/** Saves a change to this widget (the looked-up place name). */
type WeatherUpdate = (id: string, update: (widget: Widget) => Widget) => void
type Props = { widget: WeatherWidgetData; language: Settings['language']; onChooseCity?: () => void; onChange?: WeatherUpdate }

const icons = { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning }
/** How often an open tab checks whether its forecast is older than the 30-minute cache. */
const RECHECK = 5 * 60_000

function temperature(value: number, unit: WeatherUnit) {
  return `${Math.round(value)}°${unit === 'celsius' ? 'C' : 'F'}`
}

function WeatherDay({ day, unit, language }: { day: WeatherForecast['days'][number]; unit: WeatherUnit; language: string }) {
  const Icon = icons[weatherIconForCode(day.code)]
  const date = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T00:00:00Z`))
  return <li><span>{date}</span><Icon aria-hidden="true" size={18} /><span>{temperature(day.high, unit)} / {temperature(day.low, unit)}</span></li>
}

export function WeatherWidget({ widget, language, onChooseCity, onChange }: Props) {
  const unit = widget.props.unit ?? 'celsius'
  const { latitude, longitude } = widget.props
  const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number'
  // Show the last saved forecast at once; a new tab should never open on an empty weather card.
  const [forecast, setForecast] = useState<WeatherForecast | null>(() => hasCoordinates ? readCachedForecast(latitude, longitude, unit) : null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'permission' | 'refresh' | null>(null)
  const place = useRef('')
  const named = useRef('')
  const needsName = hasCoordinates && widget.props.currentLocation === true && !widget.props.city

  const load = useCallback(async (fromClick: boolean) => {
    if (!hasCoordinates) return
    const key = `${latitude}:${longitude}:${unit}`
    setBusy(true)
    try {
      // Only a click may show the browser's permission prompt; automatic loads just check it. A current location
      // without a place name also asks for the name lookup in that click.
      const granted = fromClick ? await requestWeatherPermission(needsName ? 'location' : 'forecast') : await hasWeatherPermission()
      if (!granted) { setStatus('permission'); return }
      const result = await fetchWeatherForecast(latitude, longitude, unit, { force: fromClick })
      if (place.current !== key) return
      setForecast(result.forecast)
      setOffline(result.offline)
      setStatus(null)
    } catch { if (place.current === key) setStatus('refresh') }
    finally { if (place.current === key) setBusy(false) }
  }, [hasCoordinates, latitude, longitude, unit, needsName])

  // Locations saved before place names existed (or whose lookup failed) get their name once access allows it.
  useEffect(() => {
    const key = `${latitude}:${longitude}`
    if (!needsName || !onChange || named.current === key) return
    let cancelled = false
    void (async () => {
      try {
        if (!await hasPlacePermission() || cancelled) return
        // One lookup per place, so a place without a name is not asked about on every refresh.
        named.current = key
        const name = await lookupPlaceName(latitude!, longitude!, { language: language === 'zh-CN' ? 'zh' : 'en' })
        if (name && !cancelled) onChange(widget.id, item => item.type === 'weather' && item.props.latitude === latitude && item.props.longitude === longitude && !item.props.city ? { ...item, props: { ...item.props, city: name } } : item)
      } catch { /* "Current location" stays as the title. */ }
    })()
    return () => { cancelled = true }
  }, [needsName, onChange, widget.id, latitude, longitude, language, busy])

  // A new city or unit replaces the card and loads by itself.
  useEffect(() => {
    place.current = `${latitude}:${longitude}:${unit}`
    setForecast(hasCoordinates ? readCachedForecast(latitude!, longitude!, unit) : null)
    setOffline(false)
    setStatus(null)
    setBusy(false)
    void load(false)
  }, [load, hasCoordinates, latitude, longitude, unit])

  // Tabs left open refresh when they come back into view or every few minutes, using the 30-minute cache.
  useEffect(() => {
    if (!hasCoordinates) return
    const recheck = () => { if (document.visibilityState === 'visible') void load(false) }
    const timer = window.setInterval(recheck, RECHECK)
    document.addEventListener('visibilitychange', recheck)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', recheck) }
  }, [hasCoordinates, load])

  const Icon = forecast ? icons[weatherIconForCode(forecast.code)] : CloudSun
  const statusMessage: WeatherMessage | null = status === 'permission' ? 'needsAccess' : status === 'refresh' ? 'refreshFailed' : null
  const title = widget.props.city || (widget.props.currentLocation ? weatherText(language, 'currentLocation') : weatherText(language, 'title'))
  const time = forecast ? new Intl.DateTimeFormat(language, { timeStyle: 'short' }).format(forecast.updatedAt) : ''
  const note = !forecast ? null : offline ? weatherText(language, 'offline') : busy && !isForecastFresh(forecast) ? weatherText(language, 'stale', { time }) : weatherText(language, 'updatedAt', { time })

  return <section className="mnt-weather" aria-label={title} aria-busy={busy}>
    <header className="mnt-weather-heading">
      <h2>{title}</h2>
      {hasCoordinates && <button type="button" className="mnt-weather-refresh" disabled={busy} aria-label={weatherText(language, 'refresh')} title={weatherText(language, 'refresh')} onClick={() => void load(true)}>
        <RotateCw size={14} aria-hidden="true" className={busy ? 'is-spinning' : undefined} />
      </button>}
    </header>
    {!hasCoordinates
      ? <div className="mnt-weather-empty"><p>{weatherText(language, 'chooseLocation')}</p>{onChooseCity && <button type="button" className="mnt-weather-action" onClick={onChooseCity}>{weatherText(language, 'setLocation')}</button>}</div>
      : forecast ? <>
        <div className="mnt-weather-current"><Icon aria-hidden="true" size={34} /><strong>{temperature(forecast.temperature, unit)}</strong><span>{temperature(forecast.high, unit)} / {temperature(forecast.low, unit)}</span></div>
        {widget.props.showForecast !== false && <ul className="mnt-weather-days">{forecast.days.map(day => <WeatherDay key={day.date} day={day} unit={unit} language={language} />)}</ul>}
        <p className="mnt-weather-updated" aria-live="polite">{note}</p>
      </>
        : !statusMessage && <p className="mnt-weather-empty">{weatherText(language, 'tapToLoad')}</p>}
    {statusMessage && <div className="mnt-weather-status" role="status">
      <p>{weatherText(language, statusMessage)}</p>
      {status === 'permission' && <button type="button" className="mnt-weather-action" onClick={() => void load(true)}>{weatherText(language, 'allowAccess')}</button>}
    </div>}
  </section>
}
