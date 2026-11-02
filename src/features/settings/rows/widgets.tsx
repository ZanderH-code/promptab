import { useEffect, useState } from 'react'
import type { Settings } from '../../../core/model'
import { formatClock, formatDate } from '../../../core/layout/formats'
import type { MessageKey } from '../../../i18n'
import { areaNames } from '../../../core/layout/grid'
import { createProductivityWidget, type ProductivityWidgetType } from '../../../core/widgets/defaults'
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
    const patchClock = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === clock.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['hours', 'settings.clockHours'], ['minutes', 'settings.clockMinutes'], ['seconds', 'settings.clockSeconds']] as const) formatRows.push({ id: `clock-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'seconds' ? !!p.seconds : p[key] !== false} onChange={value => patchClock({ [key]: value })} /> })
    formatRows.push({ id: 'clock-hour12', keys: ['settings.hour12'], node: <Toggle label={t('settings.hour12')} checked={p.hour12 ?? false} onChange={hour12 => patchClock({ hour12 })} /> })
    formatRows.push({ id: 'clock-separator', keys: ['settings.clockSeparator'], node: <Row label={t('settings.clockSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ':'} aria-label={t('settings.clockSeparator')} onChange={event => patchClock({ separator: event.target.value })} /></Row> })
    formatRows.push({ id: 'clock-spacing', keys: ['settings.clockSpacing'], node: <RangeField t={t} label={t('settings.clockSpacing')} value={p.separatorSpacing ?? 0} min={0} max={1} step={0.05} onChange={separatorSpacing => patchClock({ separatorSpacing })} /> })
    formatRows.push({ id: 'clock-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="clock" props={p} language={s.language} /> })
  }
  if (date) {
    const p = date.props
    const patchDate = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === date.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['weekday', 'settings.dateWeekday'], ['day', 'settings.dateDay'], ['month', 'settings.dateMonth'], ['year', 'settings.dateYear'], ['ordinal', 'settings.dateOrdinal'], ['uppercase', 'settings.dateUppercase']] as const) formatRows.push({ id: `date-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'ordinal' ? s.language === 'en' && !!p[key] : key === 'uppercase' ? !!p[key] : p[key] !== false} disabled={key === 'ordinal' && s.language !== 'en'} onChange={value => patchDate({ [key]: value, format: 'custom' })} /> })
    formatRows.push({ id: 'date-weekday-style', keys: ['settings.dateWeekday'], node: <Row label={t('settings.dateWeekday')}><Select ctx={ctx} label={t('settings.dateWeekday')} value={p.weekdayStyle ?? 'long'} options={['long','short'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : 'settings.dateStyleShort') }))} onChange={weekdayStyle => patchDate({ weekdayStyle, format: 'custom' })} /></Row> })
    formatRows.push({ id: 'date-month-style', keys: ['settings.dateMonth'], node: <Row label={t('settings.dateMonth')}><Select ctx={ctx} label={t('settings.dateMonth')} value={p.monthStyle ?? 'long'} options={['long','short','numeric'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : value === 'short' ? 'settings.dateStyleShort' : 'settings.dateStyleNumeric') }))} onChange={monthStyle => patchDate({ monthStyle, format: 'custom' })} /></Row> })
    formatRows.push({ id: 'date-separator', keys: ['settings.dateSeparator'], node: <Row label={t('settings.dateSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ' '} aria-label={t('settings.dateSeparator')} onChange={event => patchDate({ separator: event.target.value, format: 'custom' })} /></Row> })
    const order = p.order ?? ['weekday', 'month', 'day', 'year']
    formatRows.push({ id: 'date-order', keys: ['settings.dateOrder'], node: <Row label={t('settings.dateOrder')}><button className="sd-button" onClick={() => patchDate({ order: [...order.slice(1), order[0]], format: 'custom' })}>{order.map(part => t(({ weekday: 'settings.dateWeekday', day: 'settings.dateDay', month: 'settings.dateMonth', year: 'settings.dateYear' } as const)[part])).join(' → ')}</button></Row> })
    formatRows.push({ id: 'date-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="date" props={p} language={s.language} /> })
  }
  const productTypes: ProductivityWidgetType[] = ['todo', 'note', 'countdown']
  const productLabel: Record<ProductivityWidgetType, MessageKey> = { todo: 'widgets.todo', note: 'widgets.note', countdown: 'widgets.countdown' }
  const addProductivityWidget = (type: ProductivityWidgetType) => change(profile => {
    const area = profile.layout.areas.flatMap(row => row.trim().split(/\s+/)).find(name => name !== '.') ?? 'overview'
    const order = Math.max(-1, ...profile.widgets.filter(widget => widget.area === area).map(widget => widget.order)) + 1
    const widget = createProductivityWidget(type, area, crypto.randomUUID())
    return touch({ ...profile, widgets: [...profile.widgets, { ...widget, order }] })
  })
  const productivityItems: Item[] = [
    { id: 'productivity-add', keys: ['settings.addProductivityWidget'], node: <div className="sd-note"><strong>{t('settings.addProductivityWidget')}</strong><div className="sd-widget-actions">{productTypes.map(type => <button className="sd-button" type="button" key={type} onClick={() => addProductivityWidget(type)}>{t(productLabel[type])}</button>)}</div></div> },
    ...ctx.profile.widgets.filter(widget => widget.type === 'todo' || widget.type === 'note' || widget.type === 'countdown').map((widget): Item => {
      const patchWidget = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...updates } as typeof item.props } : item) as typeof profile.widgets }))
      const title = widget.type === 'countdown' ? widget.props.title : widget.props.title ?? ''
      const controls = widget.type === 'todo' ? <>
        <Toggle label={t('settings.todoHideCompleted')} checked={widget.props.hideCompleted === true} onChange={hideCompleted => patchWidget({ hideCompleted })} />
        {widget.props.items.map(item => <Row key={item.id} label={t('settings.todoItem')}><input className="sd-input" maxLength={500} value={item.text} aria-label={t('settings.todoItem')} onChange={event => patchWidget({ items: widget.props.items.map(current => current.id === item.id ? { ...current, text: event.target.value } : current) })} /><button className="sd-button" type="button" aria-label={t('settings.removeWidget')} onClick={() => patchWidget({ items: widget.props.items.filter(current => current.id !== item.id) })}>−</button></Row>)}
        <button className="sd-button" type="button" onClick={() => patchWidget({ items: [...widget.props.items, { id: crypto.randomUUID(), text: '', done: false }] })}>{t('settings.todoAddItem')}</button>
      </> : widget.type === 'note' ? <Row label={t('settings.noteContent')} stack><textarea className="sd-input" rows={4} maxLength={10000} value={widget.props.content} aria-label={t('settings.noteContent')} onChange={event => patchWidget({ content: event.target.value })} /></Row> : <>
        <Row label={t('settings.countdownDate')}><input className="sd-input" type="date" value={widget.props.targetDate} aria-label={t('settings.countdownDate')} onChange={event => patchWidget({ targetDate: event.target.value })} /></Row>
        <Row label={t('settings.countdownFormat')}><Select ctx={ctx} label={t('settings.countdownFormat')} value={widget.props.format ?? 'days'} options={[{ value: 'days', label: t('settings.countdownDays') }, { value: 'detailed', label: t('settings.countdownDetailed') }]} onChange={format => patchWidget({ format })} /></Row>
      </>
      return { id: `productivity-${widget.id}`, keys: [productLabel[widget.type], 'settings.widgetTitle', 'settings.widgetArea', 'settings.widgetOrder', 'settings.widgetSize', 'settings.widgetAlign', 'settings.removeWidget'], node: <div className="sd-note"><strong>{t(productLabel[widget.type])}</strong>
        <Toggle label={t('settings.widgets')} checked={!widget.hidden} onChange={visible => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, hidden: !visible } : item) }))} />
        <Row label={t('settings.widgetTitle')}><input className="sd-input" maxLength={120} value={title} aria-label={t('settings.widgetTitle')} onChange={event => patchWidget({ title: event.target.value })} /></Row>
        {controls}
        <Row label={t('settings.widgetArea')}><Select ctx={ctx} label={t('settings.widgetArea')} value={widget.area} options={areaNames(ctx.profile.layout.areas).map(area => ({ value: area, label: area === 'overview' ? t('settings.areaOverview') : area }))} onChange={area => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, area, order: Math.max(-1, ...profile.widgets.filter(other => other.area === area).map(other => other.order)) + 1 } : item) }))} /></Row>
        <Row label={t('settings.widgetOrder')}><button className="sd-button" type="button" aria-label={t('settings.widgetOrder')} onClick={() => { const siblings = ctx.profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order); const index = siblings.findIndex(item => item.id === widget.id); if (index > 0) { [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]]; const order = new Map(siblings.map((item, i) => [item.id, i])); change(profile => touch({ ...profile, widgets: profile.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })) } }}>↑</button><button className="sd-button" type="button" onClick={() => { const siblings = ctx.profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order); const index = siblings.findIndex(item => item.id === widget.id); if (index < siblings.length - 1) { [siblings[index + 1], siblings[index]] = [siblings[index], siblings[index + 1]]; const order = new Map(siblings.map((item, i) => [item.id, i])); change(profile => touch({ ...profile, widgets: profile.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })) } }}>↓</button></Row>
        <RangeField t={t} label={t('settings.widgetSize')} value={widget.props.size ?? 1} min={0.5} max={3} step={0.1} onChange={size => patchWidget({ size })} />
        <Row label={t('settings.widgetAlign')}><Select ctx={ctx} label={t('settings.widgetAlign')} value={widget.props.align ?? 'center'} options={[['left', 'settings.alignLeft'], ['center', 'settings.alignCenter'], ['right', 'settings.alignRight']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={align => patchWidget({ align })} /></Row>
        <button className="sd-button" type="button" onClick={() => change(profile => touch({ ...profile, widgets: profile.widgets.filter(item => item.id !== widget.id) }))}>{t('settings.removeWidget')}</button>
      </div> }
    }),
  ]
  return [widgetToggle('clock', 'settings.showClock'), widgetToggle('date', 'settings.showDate'), ...flags.map(([key, label]) => ({ id: key, keys: [label], node: <Toggle label={t(label)} checked={s[key]} onChange={value => patch({ [key]: value })} /> })), ...formatRows, ...productivityItems]
}
