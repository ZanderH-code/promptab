import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Widget } from '../../../core/schema/profile'
import { locationProblem, requestWeatherPermission, searchWeatherCities, weatherCityDetail, weatherCityLabel, type WeatherCity } from '../../../core/weather'
import { weatherText, type WeatherMessage } from '../../../core/weatherMessages'
import { isExtensionEnvironment, extensionApi } from '../../../platform/extension'
import { Row, Toggle } from '../controls'
import { Select, type Ctx } from './shared'

type WeatherWidget = Extract<Widget, { type: 'weather' }>
type Props = { ctx: Ctx; widget: WeatherWidget; patch: (updates: Record<string, unknown>) => void }

/** Wait after the last keystroke before asking Open-Meteo, so typing "Shanghai" sends one request, not eight. */
const SEARCH_DELAY = 300

async function canSearchCities() {
  if (!isExtensionEnvironment()) return true
  try { return await extensionApi()?.permissions?.contains?.({ origins: ['https://geocoding-api.open-meteo.com/*'] }) ?? false } catch { return false }
}

export function WeatherSettings({ ctx, widget, patch }: Props) {
  const cityId = useId()
  const listId = useId()
  const savedLabel = widget.props.currentLocation ? weatherText(ctx.s.language, 'currentLocation') : widget.props.city ?? ''
  const [query, setQuery] = useState(savedLabel)
  useEffect(() => { if (widget.props.currentLocation) setQuery(weatherText(ctx.s.language, 'currentLocation')) }, [ctx.s.language, widget.props.currentLocation])
  const [cities, setCities] = useState<WeatherCity[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [status, setStatus] = useState<{ key: WeatherMessage; city?: string } | null>(null)
  const request = useRef(0)
  const message = (key: WeatherMessage, params?: Record<string, string>) => weatherText(ctx.s.language, key, params)

  useEffect(() => { void canSearchCities().then(setAllowed) }, [])

  const runSearch = async (text: string) => {
    const id = ++request.current
    if (text.trim().length < 2) { setCities([]); setBusy(null); return }
    setBusy('search')
    try {
      const results = await searchWeatherCities(text, { language: ctx.s.language === 'zh-CN' ? 'zh' : 'en' })
      if (id !== request.current) return
      setCities(results)
      setActive(0)
      setStatus(results.length ? null : { key: 'noCities' })
    } catch {
      if (id === request.current) { setCities([]); setStatus({ key: 'searchFailed' }) }
    } finally {
      if (id === request.current) setBusy(null)
    }
  }

  // Search as the person types once network access is allowed; the saved label itself is not a search.
  useEffect(() => {
    if (!open || !allowed || query === savedLabel) return
    const timer = window.setTimeout(() => void runSearch(query), SEARCH_DELAY)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, allowed])

  /** Runs inside a click or Enter so the browser can show its one-time permission prompt. */
  const allowSearch = async () => {
    const granted = await requestWeatherPermission('all')
    setAllowed(granted)
    if (!granted) { setStatus({ key: 'permissionDenied' }); return }
    setOpen(true)
    void runSearch(query)
  }

  const selectCity = (city: WeatherCity) => {
    const name = weatherCityLabel(city)
    request.current++
    patch({ city: name, latitude: city.latitude, longitude: city.longitude, currentLocation: false })
    setQuery(name)
    setCities([])
    setOpen(false)
    setBusy(null)
    setStatus({ key: 'citySaved', city: name })
  }

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) { setStatus({ key: 'locationUnavailable' }); return }
    // Ask for Open-Meteo access in the same click so the forecast can load without a second prompt.
    const granted = await requestWeatherPermission('all')
    setAllowed(granted)
    if (!granted) { setStatus({ key: 'permissionDenied' }); return }
    setBusy('locate')
    setStatus({ key: 'locating' })
    setOpen(false)
    navigator.geolocation.getCurrentPosition(position => {
      patch({ city: '', latitude: position.coords.latitude, longitude: position.coords.longitude, currentLocation: true })
      setQuery(message('currentLocation'))
      setStatus({ key: 'locationSaved' })
      setBusy(null)
    }, error => {
      setStatus({ key: locationProblem(error.code) })
      setBusy(null)
    }, { maximumAge: 600_000, timeout: 15_000 })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!cities.length) return
      event.preventDefault()
      setOpen(true)
      setActive(current => (current + (event.key === 'ArrowDown' ? 1 : -1) + cities.length) % cities.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (!allowed) void allowSearch()
      else if (open && cities[active]) selectCity(cities[active])
      else { setOpen(true); void runSearch(query) }
    } else if (event.key === 'Escape' && open) {
      // Close the list first; a second Escape closes Settings as usual.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  const showList = open && query.trim().length >= 2 && query !== savedLabel && (!allowed || busy === 'search' || cities.length > 0)
  const activeId = showList && allowed && cities[active] ? `${listId}-${cities[active].id}` : undefined

  return <div className="sd-note" data-testid="weather-settings">
    <p>{message('privacyHint')}</p>
    <Row label={message('city')} stack htmlFor={cityId}>
      <div className="sd-weather-search">
        <input id={cityId} className="sd-input" role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls={listId} aria-activedescendant={activeId}
          autoComplete="off" maxLength={100} value={query} placeholder={message('cityPlaceholder')} aria-label={message('city')}
          onFocus={event => { if (query === savedLabel) event.currentTarget.select() }}
          onChange={event => { setQuery(event.target.value); setOpen(true); setStatus(null) }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown} />
        {showList && <ul id={listId} className="sd-weather-results" role="listbox" aria-label={message('cityResults')}>
          {!allowed
            ? <li><button type="button" className="sd-weather-allow" onMouseDown={event => event.preventDefault()} onClick={() => void allowSearch()}>{message('allowSearch')}</button></li>
            : busy === 'search' && !cities.length
              ? <li className="sd-weather-pending" aria-live="polite">{message('searching')}</li>
              : cities.map((city, index) => <li key={city.id} id={`${listId}-${city.id}`} role="option" aria-selected={index === active} aria-label={weatherCityLabel(city)}
                  onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => selectCity(city)}>
                  <strong>{city.name}</strong><span>{weatherCityDetail(city)}</span>
                </li>)}
        </ul>}
      </div>
      <div className="sd-widget-actions">
        <button className="sd-button" type="button" disabled={busy === 'locate'} onClick={() => void useCurrentLocation()}>{busy === 'locate' ? message('locating') : message('useLocation')}</button>
      </div>
    </Row>
    <Row label={message('unit')}>
      <Select ctx={ctx} label={message('unit')} value={widget.props.unit ?? 'celsius'} options={[{ value: 'celsius', label: message('celsius') }, { value: 'fahrenheit', label: message('fahrenheit') }]} onChange={unit => patch({ unit })} />
    </Row>
    <Toggle label={message('showForecast')} checked={widget.props.showForecast !== false} onChange={showForecast => patch({ showForecast })} />
    {status && <p role="status" className="sd-weather-status">{message(status.key, status.city ? { city: status.city } : undefined)}</p>}
  </div>
}
