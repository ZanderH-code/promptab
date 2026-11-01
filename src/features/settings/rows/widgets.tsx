import { useEffect, useState } from 'react'
import type { Settings } from '../../../core/model'
import { formatClock, formatDate } from '../../../core/layout/formats'
import type { MessageKey } from '../../../i18n'
import { RangeField, Row, Toggle } from '../controls'
import { Select, touch, type Ctx, type Item } from './shared'

function usePreviewNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = () => { setNow(new Date()); timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000)) }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => window.clearTimeout(timer)
  }, [])
  return now
}


function WidgetFormatPreview({ type, props, language }: { type: 'clock' | 'date'; props: Record<string, unknown>; language: Settings['language'] }) {
  const now = usePreviewNow()
  return <div className="sd-note"><strong>{type === 'clock' ? formatClock(now, language, props as never) : formatDate(now, language, { ...props, format: 'custom' } as never)}</strong></div>
}


export function widgetsItems(ctx: Ctx): Item[] {
  const { t, s, patch, change } = ctx
  const flags = [['showSearch', 'settings.showSearch']] as const
  const byType = {
    clock: ctx.profile.widgets.find(widget => widget.type === 'clock'),
    date: ctx.profile.widgets.find(widget => widget.type === 'date'),
  }
  const widgetToggle = (type: 'clock' | 'date', label: MessageKey) => {
    const current = byType[type]
    return { id: `widget-${type}`, keys: [label], node: <Toggle label={t(label)} checked={!!current && !current.hidden} onChange={visible => change(profile => touch({ ...profile, widgets: profile.widgets.map(widget => widget.type === type ? { ...widget, hidden: !visible } : widget) }))} /> }
  }
  const clock = byType.clock
  const date = byType.date
  const formatRows: Item[] = []
  if (clock) {
    const p = clock.props
    const patchClock = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === clock.id ? { ...item, props: { ...item.props, ...updates } } : item) }))
    for (const [key, label] of [['hours', 'settings.clockHours'], ['minutes', 'settings.clockMinutes'], ['seconds', 'settings.clockSeconds']] as const) formatRows.push({ id: `clock-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'seconds' ? !!p.seconds : p[key] !== false} onChange={value => patchClock({ [key]: value })} /> })
    formatRows.push({ id: 'clock-hour12', keys: ['settings.hour12'], node: <Toggle label={t('settings.hour12')} checked={p.hour12 ?? false} onChange={hour12 => patchClock({ hour12 })} /> })
    formatRows.push({ id: 'clock-separator', keys: ['settings.clockSeparator'], node: <Row label={t('settings.clockSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ':'} aria-label={t('settings.clockSeparator')} onChange={event => patchClock({ separator: event.target.value })} /></Row> })
    formatRows.push({ id: 'clock-spacing', keys: ['settings.clockSpacing'], node: <RangeField t={t} label={t('settings.clockSpacing')} value={p.separatorSpacing ?? 0} min={0} max={1} step={0.05} onChange={separatorSpacing => patchClock({ separatorSpacing })} /> })
    formatRows.push({ id: 'clock-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="clock" props={p} language={s.language} /> })
  }
  if (date) {
    const p = date.props
    const patchDate = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === date.id ? { ...item, props: { ...item.props, ...updates } } : item) }))
    for (const [key, label] of [['weekday', 'settings.dateWeekday'], ['day', 'settings.dateDay'], ['month', 'settings.dateMonth'], ['year', 'settings.dateYear'], ['ordinal', 'settings.dateOrdinal'], ['uppercase', 'settings.dateUppercase']] as const) formatRows.push({ id: `date-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'ordinal' ? s.language === 'en' && !!p[key] : key === 'uppercase' ? !!p[key] : p[key] !== false} disabled={key === 'ordinal' && s.language !== 'en'} onChange={value => patchDate({ [key]: value, format: 'custom' })} /> })
    formatRows.push({ id: 'date-weekday-style', keys: ['settings.dateWeekday'], node: <Row label={t('settings.dateWeekday')}><Select ctx={ctx} label={t('settings.dateWeekday')} value={p.weekdayStyle ?? 'long'} options={['long','short'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : 'settings.dateStyleShort') }))} onChange={weekdayStyle => patchDate({ weekdayStyle, format: 'custom' })} /></Row> })
    formatRows.push({ id: 'date-month-style', keys: ['settings.dateMonth'], node: <Row label={t('settings.dateMonth')}><Select ctx={ctx} label={t('settings.dateMonth')} value={p.monthStyle ?? 'long'} options={['long','short','numeric'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : value === 'short' ? 'settings.dateStyleShort' : 'settings.dateStyleNumeric') }))} onChange={monthStyle => patchDate({ monthStyle, format: 'custom' })} /></Row> })
    formatRows.push({ id: 'date-separator', keys: ['settings.dateSeparator'], node: <Row label={t('settings.dateSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ' '} aria-label={t('settings.dateSeparator')} onChange={event => patchDate({ separator: event.target.value, format: 'custom' })} /></Row> })
    const order = p.order ?? ['weekday', 'month', 'day', 'year']
    formatRows.push({ id: 'date-order', keys: ['settings.dateOrder'], node: <Row label={t('settings.dateOrder')}><button className="sd-button" onClick={() => patchDate({ order: [...order.slice(1), order[0]], format: 'custom' })}>{order.map(part => t(({ weekday: 'settings.dateWeekday', day: 'settings.dateDay', month: 'settings.dateMonth', year: 'settings.dateYear' } as const)[part])).join(' → ')}</button></Row> })
    formatRows.push({ id: 'date-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="date" props={p} language={s.language} /> })
  }
  return [widgetToggle('clock', 'settings.showClock'), widgetToggle('date', 'settings.showDate'), ...flags.map(([key, label]) => ({ id: key, keys: [label], node: <Toggle label={t(label)} checked={s[key]} onChange={value => patch({ [key]: value })} /> })), ...formatRows]
}
