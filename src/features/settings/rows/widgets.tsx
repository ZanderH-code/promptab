import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Settings } from '../../../core/model'
import { defaultWeekStart, formatClock, formatDate } from '../../../core/layout/formats'
import type { MessageKey } from '../../../i18n'
import { areaNames } from '../../../core/layout/grid'
import { createProductivityWidget, type ProductivityWidgetType } from '../../../core/widgets/defaults'
import { RangeField, Row, Toggle } from '../controls'
import { Select, touch, type Ctx, type Item } from './shared'
import { WeatherSettings } from './WeatherSettings'
import { weatherText } from '../../../core/weatherMessages'

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

/** One collapsible widget group: a header visibility switch, a native disclosure, and its rows. */
function WidgetCard({ id, title, checked, onChange, defaultOpen, ctx, children }: {
  id: string; title: string; checked: boolean; onChange: (value: boolean) => void; defaultOpen: boolean; ctx: Ctx; children: ReactNode
}) {
  // A card with no rows is only its header switch; an empty disclosure would just look broken.
  if (children === null || children === undefined) return (
    <div className="sd-widget-card sd-widget-card-plain" data-widget-card={id}>
      <Toggle label={title} checked={checked} onChange={onChange} />
    </div>
  )
  const open = ctx.searching === true || (ctx.widgetCards?.[id] ?? defaultOpen)
  const bodyId = `${id}-body`
  return (
    <div className="sd-widget-card" data-widget-card={id}>
      <div className="sd-widget-switch"><Toggle label={title} checked={checked} onChange={onChange} /></div>
      <details className="sd-widget-details" open={open} onToggle={event => { if (!ctx.searching) ctx.onWidgetCardsChange?.({ ...ctx.widgetCards, [id]: event.currentTarget.open }) }}>
        <summary aria-expanded={open} aria-controls={bodyId}>{title}<ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></summary>
        <div className="sd-widget-card-body" id={bodyId}>{children}</div>
      </details>
    </div>
  )
}


export function widgetsItems(ctx: Ctx): Item[] {
  const { t, s, patch, change } = ctx
  const clock = ctx.profile.widgets.find(widget => widget.type === 'clock')
  const date = ctx.profile.widgets.find(widget => widget.type === 'date')
  const shortcuts = ctx.profile.widgets.find(widget => widget.type === 'bookmarks')
  const setHidden = (id: string, visible: boolean) => change(profile => touch({ ...profile, widgets: profile.widgets.map(widget => widget.id === id ? { ...widget, hidden: !visible } : widget) }))
  const clockRows: Item[] = []
  if (clock) {
    const p = clock.props
    const patchClock = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === clock.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['hours', 'settings.clockHours'], ['minutes', 'settings.clockMinutes'], ['seconds', 'settings.clockSeconds']] as const) clockRows.push({ id: `clock-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'seconds' ? !!p.seconds : p[key] !== false} onChange={value => patchClock({ [key]: value })} /> })
    clockRows.push({ id: 'clock-hour12', keys: ['settings.hour12'], node: <Toggle label={t('settings.hour12')} checked={p.hour12 ?? false} onChange={hour12 => patchClock({ hour12 })} /> })
    clockRows.push({ id: 'clock-separator', keys: ['settings.clockSeparator'], node: <Row label={t('settings.clockSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ':'} aria-label={t('settings.clockSeparator')} onChange={event => patchClock({ separator: event.target.value })} /></Row> })
    clockRows.push({ id: 'clock-spacing', keys: ['settings.clockSpacing'], node: <RangeField t={t} label={t('settings.clockSpacing')} value={p.separatorSpacing ?? 0} min={0} max={1} step={0.05} onChange={separatorSpacing => patchClock({ separatorSpacing })} /> })
    clockRows.push({ id: 'clock-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="clock" props={p} language={s.language} /> })
  }
  const dateRows: Item[] = []
  if (date) {
    const p = date.props
    const patchDate = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === date.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['weekday', 'settings.dateWeekday'], ['day', 'settings.dateDay'], ['month', 'settings.dateMonth'], ['year', 'settings.dateYear'], ['ordinal', 'settings.dateOrdinal'], ['uppercase', 'settings.dateUppercase']] as const) dateRows.push({ id: `date-${key}`, keys: [label], node: <Toggle label={t(label)} checked={key === 'ordinal' ? s.language === 'en' && !!p[key] : key === 'uppercase' ? !!p[key] : p[key] !== false} disabled={key === 'ordinal' && s.language !== 'en'} onChange={value => patchDate({ [key]: value, format: 'custom' })} /> })
    dateRows.push({ id: 'date-week-number', keys: ['settings.dateWeekNumber'], node: <Toggle label={t('settings.dateWeekNumber')} checked={!!p.weekNumber} onChange={weekNumber => patchDate({ weekNumber, order: p.order?.includes('weekNumber') ? p.order : [...(p.order ?? ['weekday', 'month', 'day', 'year']), 'weekNumber'] })} /> })
    dateRows.push({ id: 'date-week-start', keys: ['settings.weekStart'], node: <Row label={t('settings.weekStart')}><Select ctx={ctx} label={t('settings.weekStart')} value={p.weekStart ?? defaultWeekStart(s.language)} options={[['monday', 'settings.weekMonday'], ['sunday', 'settings.weekSunday'], ['saturday', 'settings.weekSaturday']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={weekStart => patchDate({ weekStart })} /></Row> })
    dateRows.push({ id: 'date-weekday-style', keys: ['settings.dateWeekday'], node: <Row label={t('settings.dateWeekday')}><Select ctx={ctx} label={t('settings.dateWeekday')} value={p.weekdayStyle ?? 'long'} options={['long','short'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : 'settings.dateStyleShort') }))} onChange={weekdayStyle => patchDate({ weekdayStyle, format: 'custom' })} /></Row> })
    dateRows.push({ id: 'date-month-style', keys: ['settings.dateMonth'], node: <Row label={t('settings.dateMonth')}><Select ctx={ctx} label={t('settings.dateMonth')} value={p.monthStyle ?? 'long'} options={['long','short','numeric'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : value === 'short' ? 'settings.dateStyleShort' : 'settings.dateStyleNumeric') }))} onChange={monthStyle => patchDate({ monthStyle, format: 'custom' })} /></Row> })
    dateRows.push({ id: 'date-separator', keys: ['settings.dateSeparator'], node: <Row label={t('settings.dateSeparator')}><input className="sd-input" maxLength={8} value={p.separator ?? ' '} aria-label={t('settings.dateSeparator')} onChange={event => patchDate({ separator: event.target.value, format: 'custom' })} /></Row> })
    const order = p.order ?? ['weekday', 'month', 'day', 'year']
    dateRows.push({ id: 'date-order', keys: ['settings.dateOrder'], node: <Row label={t('settings.dateOrder')}><button className="sd-button" onClick={() => patchDate({ order: [...order.slice(1), order[0]], format: 'custom' })}>{order.map(part => t(({ weekday: 'settings.dateWeekday', day: 'settings.dateDay', month: 'settings.dateMonth', year: 'settings.dateYear', weekNumber: 'settings.dateWeekNumber' } as const)[part])).join(' → ')}</button></Row> })
    dateRows.push({ id: 'date-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="date" props={p} language={s.language} /> })
  }
  // A card opens by default only when one of its rows differs from the default profile.
  const clockChanged = !!clock && (clock.props.hour12 === true || clock.props.seconds === true || clock.props.hours === false || clock.props.minutes === false || (clock.props.separator ?? ':') !== ':' || (clock.props.separatorSpacing ?? 0) !== 0)
  const weekStart = defaultWeekStart(s.language)
  const order = date?.props.order ?? ['weekday', 'month', 'day', 'year']
  const dateChanged = !!date && (date.props.weekday === false || date.props.day === false || date.props.month === false || date.props.year === false || date.props.ordinal === true || date.props.uppercase === true || date.props.weekNumber === true || (date.props.weekStart ?? weekStart) !== weekStart || (date.props.weekdayStyle ?? 'long') !== 'long' || (date.props.monthStyle ?? 'long') !== 'long' || (date.props.separator ?? ' ') !== ' ' || order.join() !== 'weekday,month,day,year')
  const rows = (list: Item[]) => list.map(item => <Fragment key={item.id}>{item.node}</Fragment>)
  const card = (id: string, title: string, checked: boolean, onChange: (value: boolean) => void, defaultOpen: boolean, keys: MessageKey[], children: ReactNode): Item => ({
    id, keys,
    node: <WidgetCard id={id} title={title} checked={checked} onChange={onChange} defaultOpen={defaultOpen} ctx={ctx}>{children}</WidgetCard>,
  })
  const items: Item[] = []
  if (clock) items.push(card('widget-clock', t('settings.showClock'), !clock.hidden, visible => setHidden(clock.id, visible), clockChanged, ['settings.showClock', ...clockRows.flatMap(row => row.keys)], rows(clockRows)))
  if (date) items.push(card('widget-date', t('settings.showDate'), !date.hidden, visible => setHidden(date.id, visible), dateChanged, ['settings.showDate', ...dateRows.flatMap(row => row.keys)], rows(dateRows)))
  items.push(card('showSearch', t('settings.showSearch'), s.showSearch, visible => patch({ showSearch: visible }), false, ['settings.showSearch'], null))
  if (shortcuts) items.push(card('widget-shortcuts', t('settings.shortcuts'), !shortcuts.hidden, visible => setHidden(shortcuts.id, visible), false, ['settings.shortcuts'], null))
  const productTypes: ProductivityWidgetType[] = ['todo', 'note', 'countdown', 'weather']
  const addGreeting = () => change(profile => {
    const area = profile.layout.areas.flatMap(row => row.trim().split(/\s+/)).find(name => name !== '.') ?? 'overview'
    const order = Math.max(-1, ...profile.widgets.filter(widget => widget.area === area).map(widget => widget.order)) + 1
    return touch({ ...profile, widgets: [...profile.widgets, { id: crypto.randomUUID(), type: 'greeting', area, order, props: {} }] })
  })
  const productLabel: Record<Exclude<ProductivityWidgetType, 'weather'>, MessageKey> = { todo: 'widgets.todo', note: 'widgets.note', countdown: 'widgets.countdown' }
  const productTitle = (type: ProductivityWidgetType) => type === 'weather' ? weatherText(s.language, 'title') : t(productLabel[type])
  const addProductivityWidget = (type: ProductivityWidgetType) => change(profile => {
    const area = profile.layout.areas.flatMap(row => row.trim().split(/\s+/)).find(name => name !== '.') ?? 'overview'
    const order = Math.max(-1, ...profile.widgets.filter(widget => widget.area === area).map(widget => widget.order)) + 1
    const widget = createProductivityWidget(type, area, crypto.randomUUID())
    return touch({ ...profile, widgets: [...profile.widgets, { ...widget, order }] })
  })
  items.push({ id: 'productivity-add', keys: ['settings.addProductivityWidget', 'settings.addGreeting'], node: <div className="sd-note"><strong>{t('settings.addProductivityWidget')}</strong><div className="sd-widget-actions"><button className="sd-button" type="button" onClick={addGreeting}>{t('settings.addGreeting')}</button>{productTypes.map(type => <button className="sd-button" type="button" key={type} onClick={() => addProductivityWidget(type)}>{productTitle(type)}</button>)}</div></div> })
  for (const widget of ctx.profile.widgets.filter(widget => widget.type === 'todo' || widget.type === 'note' || widget.type === 'countdown' || widget.type === 'weather')) {
    const patchWidget = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...updates } as typeof item.props } : item) as typeof profile.widgets }))
    const title = widget.type === 'countdown' ? widget.props.title : widget.type === 'weather' ? '' : widget.props.title ?? ''
    const controls = widget.type === 'weather' ? <WeatherSettings ctx={ctx} widget={widget} patch={patchWidget} /> : widget.type === 'todo' ? <>
      <Toggle label={t('settings.todoHideCompleted')} checked={widget.props.hideCompleted === true} onChange={hideCompleted => patchWidget({ hideCompleted })} />
      {widget.props.items.map(item => <Row key={item.id} label={t('settings.todoItem')}><input className="sd-input" maxLength={500} value={item.text} aria-label={t('settings.todoItem')} onChange={event => patchWidget({ items: widget.props.items.map(current => current.id === item.id ? { ...current, text: event.target.value } : current) })} /><button className="sd-button" type="button" aria-label={t('settings.removeWidget')} onClick={() => patchWidget({ items: widget.props.items.filter(current => current.id !== item.id) })}>−</button></Row>)}
      <button className="sd-button" type="button" onClick={() => patchWidget({ items: [...widget.props.items, { id: crypto.randomUUID(), text: '', done: false }] })}>{t('settings.todoAddItem')}</button>
    </> : widget.type === 'note' ? <Row label={t('settings.noteContent')} stack><textarea className="sd-input" rows={4} maxLength={10000} value={widget.props.content} aria-label={t('settings.noteContent')} onChange={event => patchWidget({ content: event.target.value })} /></Row> : <>
      <Row label={t('settings.countdownDate')}><input className="sd-input" type="date" value={widget.props.targetDate} aria-label={t('settings.countdownDate')} onChange={event => patchWidget({ targetDate: event.target.value })} /></Row>
      <Row label={t('settings.countdownFormat')}><Select ctx={ctx} label={t('settings.countdownFormat')} value={widget.props.format ?? 'days'} options={[{ value: 'days', label: t('settings.countdownDays') }, { value: 'detailed', label: t('settings.countdownDetailed') }]} onChange={format => patchWidget({ format })} /></Row>
    </>
    items.push(card(`productivity-${widget.id}`, productTitle(widget.type), !widget.hidden, visible => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, hidden: !visible } : item) })), true, [widget.type === 'weather' ? 'settings.widgets' : productLabel[widget.type], 'settings.widgetTitle', 'settings.widgetArea', 'settings.widgetOrder', 'settings.widgetSize', 'settings.widgetAlign', 'settings.removeWidget'], <>
      {widget.type !== 'weather' && <Row label={t('settings.widgetTitle')}><input className="sd-input" maxLength={120} value={title} aria-label={t('settings.widgetTitle')} onChange={event => patchWidget({ title: event.target.value })} /></Row>}
      {controls}
      <Row label={t('settings.widgetArea')}><Select ctx={ctx} label={t('settings.widgetArea')} value={widget.area} options={areaNames(ctx.profile.layout.areas).map(area => ({ value: area, label: area === 'overview' ? t('settings.areaOverview') : area }))} onChange={area => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, area, order: Math.max(-1, ...profile.widgets.filter(other => other.area === area).map(other => other.order)) + 1 } : item) }))} /></Row>
      <Row label={t('settings.widgetOrder')}><button className="sd-button" type="button" aria-label={t('settings.widgetOrder')} onClick={() => { const siblings = ctx.profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order); const index = siblings.findIndex(item => item.id === widget.id); if (index > 0) { [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]]; const order = new Map(siblings.map((item, i) => [item.id, i])); change(profile => touch({ ...profile, widgets: profile.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })) } }}>↑</button><button className="sd-button" type="button" onClick={() => { const siblings = ctx.profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order); const index = siblings.findIndex(item => item.id === widget.id); if (index < siblings.length - 1) { [siblings[index + 1], siblings[index]] = [siblings[index], siblings[index + 1]]; const order = new Map(siblings.map((item, i) => [item.id, i])); change(profile => touch({ ...profile, widgets: profile.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })) } }}>↓</button></Row>
      <RangeField t={t} label={t('settings.widgetSize')} value={widget.props.size ?? 1} min={0.5} max={3} step={0.1} onChange={size => patchWidget({ size })} />
      <Row label={t('settings.widgetAlign')}><Select ctx={ctx} label={t('settings.widgetAlign')} value={widget.props.align ?? 'center'} options={[['left', 'settings.alignLeft'], ['center', 'settings.alignCenter'], ['right', 'settings.alignRight']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={align => patchWidget({ align })} /></Row>
      <button className="sd-button" type="button" onClick={() => change(profile => touch({ ...profile, widgets: profile.widgets.filter(item => item.id !== widget.id) }))}>{t('settings.removeWidget')}</button>
    </>))
  }
  return items
}
