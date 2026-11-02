import { useEffect, useState } from 'react'
import type { Widget } from '../../../core/schema/profile'
import { requestWeatherPermission, searchWeatherCities, type WeatherCity } from '../../../core/weather'
import { weatherText, type WeatherMessage } from '../../../core/weatherMessages'
import { Row, Toggle } from '../controls'
import { Select, type Ctx } from './shared'

type WeatherWidget = Extract<Widget, { type: 'weather' }>
type Props = { ctx: Ctx; widget: WeatherWidget; patch: (updates: Record<string, unknown>) => void }

export function WeatherSettings({ ctx, widget, patch }: Props) {
  const [query, setQuery] = useState(widget.props.currentLocation ? weatherText(ctx.s.language, 'currentLocation') : widget.props.city ?? '')
  useEffect(() => { if (widget.props.currentLocation) setQuery(weatherText(ctx.s.language, 'currentLocation')) }, [ctx.s.language, widget.props.currentLocation])
  const [cities, setCities] = useState<WeatherCity[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<WeatherMessage | null>(null)
  const message = (key: WeatherMessage) => weatherText(ctx.s.language, key)

  const search = async () => {
    const text = query.trim()
    if (text.length < 2) { setStatus('searchTooShort'); return }
    setBusy(true)
    setStatus(null)
    try {
      const granted = await requestWeatherPermission('geocoding')
      if (!granted) { setStatus('permissionDenied'); return }
      const results = await searchWeatherCities(text, { language: ctx.s.language === 'zh-CN' ? 'zh' : 'en' })
      setCities(results)
      if (!results.length) setStatus('noCities')
    } catch { setStatus('searchFailed') }
    finally { setBusy(false) }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setStatus('locationUnavailable'); return }
    setBusy(true)
    setStatus(null)
    navigator.geolocation.getCurrentPosition(position => {
      patch({ city: '', latitude: position.coords.latitude, longitude: position.coords.longitude, currentLocation: true })
      setQuery(message('currentLocation'))
      setBusy(false)
    }, () => {
      setStatus('locationFailed')
      setBusy(false)
    }, { maximumAge: 300_000, timeout: 10_000 })
  }

  const selectCity = (city: WeatherCity) => {
    const name = city.country ? `${city.name}, ${city.country}` : city.name
    patch({ city: name, latitude: city.latitude, longitude: city.longitude, currentLocation: false })
    setQuery(name)
    setCities([])
    setStatus(null)
  }

  return <div className="sd-note" data-testid="weather-settings">
    <p>{message('privacyHint')}</p>
    <Row label={message('city')} stack>
      <div className="sd-widget-actions">
        <input className="sd-input" maxLength={100} value={query} aria-label={message('city')} onChange={event => setQuery(event.target.value)} />
        <button className="sd-button" type="button" disabled={busy} onClick={() => void search()}>{message('searchCity')}</button>
        <button className="sd-button" type="button" disabled={busy} onClick={useCurrentLocation}>{message('useLocation')}</button>
      </div>
      {cities.length > 0 && <div className="sd-widget-actions" role="listbox" aria-label={message('cityResults')}>
        {cities.map(city => <button className="sd-button" type="button" role="option" key={city.id} onClick={() => selectCity(city)}>{city.name}{city.country ? `, ${city.country}` : ''}</button>)}
      </div>}
    </Row>
    <Row label={message('unit')}>
      <Select ctx={ctx} label={message('unit')} value={widget.props.unit ?? 'celsius'} options={[{ value: 'celsius', label: message('celsius') }, { value: 'fahrenheit', label: message('fahrenheit') }]} onChange={unit => patch({ unit })} />
    </Row>
    <Toggle label={message('showForecast')} checked={widget.props.showForecast !== false} onChange={showForecast => patch({ showForecast })} />
    {status && <p role="status">{message(status)}</p>}
  </div>
}
