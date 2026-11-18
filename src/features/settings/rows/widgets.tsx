import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Settings } from '../../../core/model'
import { defaultWeekStart, formatClock, formatDate } from '../../../core/layout/formats'
import type { MessageKey } from '../../../i18n'
import { areaNames } from '../../../core/layout/grid'
import { createProductivityWidget, type ProductivityWidgetType } from '../../../core/widgets/defaults'
import { RANGES } from '../../../core/schema/defaults'
import { DraftText } from '../../../ui/DraftText'
import { RangeField, Row, Toggle } from '../controls'
import { widgetDefaults } from '../rowDefaults'
import { Select, touch, type Ctx, type Item } from './shared'
import { WeatherSettings } from './WeatherSettings'
import { weatherText } from '../../../core/weatherMessages'
import '../../../i18n/lazy'

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


type ProfileWidget = Ctx['profile']['widgets'][number]
type EditableWidget = Extract<ProfileWidget, { type: 'greeting' | 'text' | 'spacer' | 'todo' | 'note' | 'countdown' | 'weather' }>

/** Waits for a just-added widget's settings card to render, then scrolls to it and opens it. */
function revealCard(id: string, tries = 20) {
  const card = document.querySelector<HTMLElement>(`[data-widget-card="${CSS.escape(id)}"]`)
  if (!card) { if (tries > 0) requestAnimationFrame(() => revealCard(id, tries - 1)); return }
  card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  const field = card.querySelector<HTMLElement>('.sd-widget-card-body :is(input:not([type="checkbox"]), textarea)') ?? card.querySelector<HTMLElement>('summary')
  field?.focus({ preventScroll: true })
}

export function widgetsItems(ctx: Ctx): Item[] {
  const { t, s, patch, change } = ctx
  const defaults = ctx.defaults ? widgetDefaults(ctx.defaults, s.language) : null
  const resetLabel = (label: MessageKey) => t('settings.resetRow', { label: t(label) })
  const clock = ctx.profile.widgets.find(widget => widget.type === 'clock')
  const date = ctx.profile.widgets.find(widget => widget.type === 'date')
  const shortcuts = ctx.profile.widgets.find(widget => widget.type === 'bookmarks')
  const moveWidget = (id: string, direction: -1 | 1) => change(profile => {
    const widget = profile.widgets.find(item => item.id === id)
    if (!widget) return profile
    const siblings = profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order)
    const from = siblings.findIndex(item => item.id === id), to = from + direction
    if (to < 0 || to >= siblings.length) return profile
    ;[siblings[from], siblings[to]] = [siblings[to], siblings[from]]
    const order = new Map(siblings.map((item, index) => [item.id, index]))
    return touch({ ...profile, widgets: profile.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })
  })
  const setHidden = (id: string, visible: boolean) => change(profile => touch({ ...profile, widgets: profile.widgets.map(widget => widget.id === id ? { ...widget, hidden: !visible } : widget) }))
  const clockRows: Item[] = []
  if (clock) {
    const p = clock.props
    const patchClock = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === clock.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['hours', 'settings.clockHours'], ['minutes', 'settings.clockMinutes'], ['seconds', 'settings.clockSeconds']] as const) {
      const current = key === 'seconds' ? !!p.seconds : p[key] !== false
      const fallback = defaults?.clock[key]
      clockRows.push({ id: `clock-${key}`, keys: [label], node: <Toggle label={t(label)} checked={current} changed={fallback !== undefined && current !== fallback} onReset={fallback !== undefined ? () => patchClock({ [key]: fallback }) : undefined} resetLabel={resetLabel(label)} onChange={value => patchClock({ [key]: value })} /> })
    }
    clockRows.push({ id: 'clock-hour12', keys: ['settings.hour12'], node: <Toggle label={t('settings.hour12')} checked={p.hour12 ?? false} changed={!!defaults && (p.hour12 ?? false) !== defaults.clock.hour12} onReset={defaults ? () => patchClock({ hour12: defaults.clock.hour12 }) : undefined} resetLabel={resetLabel('settings.hour12')} onChange={hour12 => patchClock({ hour12 })} /> })
    clockRows.push({ id: 'clock-separator', keys: ['settings.clockSeparator'], node: <Row label={t('settings.clockSeparator')} changed={!!defaults && (p.separator ?? ':') !== defaults.clock.separator} onReset={defaults ? () => patchClock({ separator: defaults.clock.separator }) : undefined} resetLabel={resetLabel('settings.clockSeparator')}><DraftText className="sd-input" maxLength={8} value={p.separator ?? ':'} aria-label={t('settings.clockSeparator')} onCommit={separator => patchClock({ separator })} /></Row> })
    clockRows.push({ id: 'clock-spacing', keys: ['settings.clockSpacing'], node: <RangeField t={t} label={t('settings.clockSpacing')} value={p.separatorSpacing ?? 0} min={0} max={1} step={0.05} changed={!!defaults && (p.separatorSpacing ?? 0) !== defaults.clock.spacing} onReset={defaults ? () => patchClock({ separatorSpacing: defaults.clock.spacing }) : undefined} resetLabel={resetLabel('settings.clockSpacing')} onChange={separatorSpacing => patchClock({ separatorSpacing })} /> })
    const simpleToggle = (rows: Item[], id: string, label: MessageKey, checked: boolean, onChange: (value: boolean) => void, disabled = false) => rows.push({ id, keys: [label], node: <Toggle label={t(label)} checked={checked} disabled={disabled} onChange={onChange} /> })
    simpleToggle(clockRows, 'clock-words', 'settings.clockWords', !!p.words, words => patchClock({ words: words || undefined }))
    simpleToggle(clockRows, 'clock-meridiem', 'settings.clockMeridiem', !!p.meridiem, meridiem => patchClock({ meridiem: meridiem || undefined }), !p.hour12)
    simpleToggle(clockRows, 'clock-separator-accent', 'settings.separatorAccent', !!p.separatorAccent, separatorAccent => patchClock({ separatorAccent: separatorAccent || undefined }))
    clockRows.push({ id: 'clock-preview', keys: ['settings.widgets'], node: <WidgetFormatPreview type="clock" props={p} language={s.language} /> })
  }
  const dateRows: Item[] = []
  if (date) {
    const p = date.props
    const patchDate = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === date.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    for (const [key, label] of [['weekday', 'settings.dateWeekday'], ['day', 'settings.dateDay'], ['month', 'settings.dateMonth'], ['year', 'settings.dateYear'], ['ordinal', 'settings.dateOrdinal'], ['uppercase', 'settings.dateUppercase']] as const) {
      const current = key === 'ordinal' ? s.language === 'en' && !!p[key] : key === 'uppercase' ? !!p[key] : p[key] !== false
      const fallback = defaults?.date[key]
      dateRows.push({ id: `date-${key}`, keys: [label], node: <Toggle label={t(label)} checked={current} disabled={key === 'ordinal' && s.language !== 'en'} changed={fallback !== undefined && current !== fallback} onReset={fallback !== undefined ? () => patchDate({ [key]: fallback, format: 'custom' }) : undefined} resetLabel={resetLabel(label)} onChange={value => patchDate({ [key]: value, format: 'custom' })} /> })
    }
    dateRows.push({ id: 'date-week-number', keys: ['settings.dateWeekNumber'], node: <Toggle label={t('settings.dateWeekNumber')} checked={!!p.weekNumber} changed={!!defaults && !!p.weekNumber !== defaults.date.weekNumber} onReset={defaults ? () => patchDate({ weekNumber: defaults.date.weekNumber, order: (p.order ?? ['weekday', 'month', 'day', 'year']).filter(part => part !== 'weekNumber'), format: 'custom' }) : undefined} resetLabel={resetLabel('settings.dateWeekNumber')} onChange={weekNumber => patchDate({ weekNumber, order: p.order?.includes('weekNumber') ? p.order : [...(p.order ?? ['weekday', 'month', 'day', 'year']), 'weekNumber'] })} /> })
    dateRows.push({ id: 'date-week-start', keys: ['settings.weekStart'], node: <Row label={t('settings.weekStart')} changed={!!defaults && (p.weekStart ?? defaultWeekStart(s.language)) !== defaults.date.weekStart} onReset={defaults ? () => patchDate({ weekStart: defaults.date.weekStart }) : undefined} resetLabel={resetLabel('settings.weekStart')}><Select ctx={ctx} label={t('settings.weekStart')} value={p.weekStart ?? defaultWeekStart(s.language)} options={[['monday', 'settings.weekMonday'], ['sunday', 'settings.weekSunday'], ['saturday', 'settings.weekSaturday']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={weekStart => patchDate({ weekStart })} /></Row> })
    dateRows.push({ id: 'date-weekday-style', keys: ['settings.dateWeekday'], node: <Row label={t('settings.dateWeekday')} changed={!!defaults && (p.weekdayStyle ?? 'long') !== defaults.date.weekdayStyle} onReset={defaults ? () => patchDate({ weekdayStyle: defaults.date.weekdayStyle, format: 'custom' }) : undefined} resetLabel={resetLabel('settings.dateWeekday')}><Select ctx={ctx} label={t('settings.dateWeekday')} value={p.weekdayStyle ?? 'long'} options={['long','short'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : 'settings.dateStyleShort') }))} onChange={weekdayStyle => patchDate({ weekdayStyle, format: 'custom' })} /></Row> })
    dateRows.push({ id: 'date-month-style', keys: ['settings.dateMonth'], node: <Row label={t('settings.dateMonth')} changed={!!defaults && (p.monthStyle ?? 'long') !== defaults.date.monthStyle} onReset={defaults ? () => patchDate({ monthStyle: defaults.date.monthStyle, format: 'custom' }) : undefined} resetLabel={resetLabel('settings.dateMonth')}><Select ctx={ctx} label={t('settings.dateMonth')} value={p.monthStyle ?? 'long'} options={['long','short','numeric'].map(value => ({ value, label: t(value === 'long' ? 'settings.dateStyleLong' : value === 'short' ? 'settings.dateStyleShort' : 'settings.dateStyleNumeric') }))} onChange={monthStyle => patchDate({ monthStyle, format: 'custom' })} /></Row> })
    dateRows.push({ id: 'date-separator', keys: ['settings.dateSeparator'], node: <Row label={t('settings.dateSeparator')} changed={!!defaults && (p.separator ?? ' ') !== defaults.date.separator} onReset={defaults ? () => patchDate({ separator: defaults.date.separator, format: 'custom' }) : undefined} resetLabel={resetLabel('settings.dateSeparator')}><DraftText className="sd-input" maxLength={8} value={p.separator ?? ' '} aria-label={t('settings.dateSeparator')} onCommit={separator => patchDate({ separator, format: 'custom' })} /></Row> })
    const order = p.order ?? ['weekday', 'month', 'day', 'year']
    dateRows.push({ id: 'date-order', keys: ['settings.dateOrder'], node: <Row label={t('settings.dateOrder')} changed={!!defaults && order.join() !== defaults.date.order.join()} onReset={defaults ? () => patchDate({ order: [...defaults.date.order], format: 'custom' }) : undefined} resetLabel={resetLabel('settings.dateOrder')}><button className="sd-button" onClick={() => patchDate({ order: [...order.slice(1), order[0]], format: 'custom' })}>{order.map(part => t(({ weekday: 'settings.dateWeekday', day: 'settings.dateDay', month: 'settings.dateMonth', year: 'settings.dateYear', weekNumber: 'settings.dateWeekNumber' } as const)[part])).join(' → ')}</button></Row> })
    dateRows.push({ id: 'date-day-words', keys: ['settings.dateDayWords'], node: <Toggle label={t('settings.dateDayWords')} checked={p.dayStyle === 'word'} onChange={word => patchDate({ dayStyle: word ? 'word' : undefined, format: 'custom' })} /> })
    dateRows.push({ id: 'date-separator-accent', keys: ['settings.separatorAccent'], node: <Toggle label={t('settings.separatorAccent')} checked={!!p.separatorAccent} onChange={separatorAccent => patchDate({ separatorAccent: separatorAccent || undefined, format: 'custom' })} /> })
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
  const search = ctx.profile.widgets.find(widget => widget.type === 'search')
  const patchSearch = (updates: Record<string, unknown>) => search && change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === search.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
  items.push(card('showSearch', t('settings.showSearch'), s.showSearch, visible => patch({ showSearch: visible }), false, ['settings.showSearch', ...(search ? ['settings.searchEngineName', 'settings.searchFindBookmarks'] as const : [])], search ? <>
    <Toggle label={t('settings.searchEngineName')} checked={!!search.props.namePlaceholder} onChange={on => patchSearch({ namePlaceholder: on || undefined })} />
    <Toggle label={t('settings.searchFindBookmarks')} checked={!!search.props.findBookmarks} onChange={on => patchSearch({ findBookmarks: on || undefined })} />
  </> : null))
  if (shortcuts) items.push(card('widget-shortcuts', t('settings.shortcuts'), !shortcuts.hidden, visible => setHidden(shortcuts.id, visible), false, ['settings.shortcuts'], null))
  for (const widget of ctx.profile.widgets) {
    if (widget.type !== 'toolbar') continue
    const patchToolbar = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof profile.widgets }))
    const actions = widget.props.actions ?? ['add', 'edit', 'settings']
    const toggleAction = (action: 'accent' | 'add' | 'edit', on: boolean) => patchToolbar({ actions: (['accent', 'add', 'edit', 'settings'] as const).filter(item => item === action ? on : actions.includes(item)) })
    const cornerOptions = [['', 'settings.toolbarInArea'], ['top-left', 'settings.posTopLeft'], ['top-right', 'settings.posTopRight'], ['bottom-left', 'settings.posBottomLeft'], ['bottom-right', 'settings.posBottomRight']] as const
    items.push(card(`widget-toolbar-${widget.id}`, t('widgets.toolbar'), !widget.hidden, visible => setHidden(widget.id, visible), false, ['widgets.toolbar', 'settings.toolbarStyle', 'settings.toolbarPlace', 'settings.toolbarAccent'], <>
      <Row label={t('settings.toolbarStyle')}><Select ctx={ctx} label={t('settings.toolbarStyle')} value={widget.props.style ?? 'icons'} options={([['icons', 'settings.toolbarIcons'], ['buttons', 'settings.toolbarButtons']] as const).map(([value, key]) => ({ value, label: t(key) }))} onChange={style => patchToolbar({ style: style === 'buttons' ? 'buttons' : undefined })} /></Row>
      <Row label={t('settings.toolbarPlace')}><Select ctx={ctx} label={t('settings.toolbarPlace')} value={widget.props.corner ?? ''} options={cornerOptions.map(([value, key]) => ({ value, label: t(key) }))} onChange={corner => patchToolbar({ corner: corner || undefined })} /></Row>
      <Toggle label={t('settings.toolbarAccent')} checked={actions.includes('accent')} onChange={on => toggleAction('accent', on)} />
      <Toggle label={t('shortcuts.add')} checked={actions.includes('add')} onChange={on => toggleAction('add', on)} />
      <Toggle label={t('edit.enter')} checked={actions.includes('edit')} onChange={on => toggleAction('edit', on)} />
    </>))
  }
  const productTypes: ProductivityWidgetType[] = ['todo', 'note', 'countdown', 'weather']
  const firstArea = (profile: typeof ctx.profile) => profile.layout.areas.flatMap(row => row.trim().split(/\s+/)).find(name => name !== '.') ?? 'overview'
  /** Adds a widget at the end of the first area, then brings its settings card into view so the next step is obvious. */
  const addWidget = (make: (area: string, id: string) => ProfileWidget) => {
    const id = crypto.randomUUID()
    change(profile => {
      const area = firstArea(profile)
      const order = Math.max(-1, ...profile.widgets.filter(widget => widget.area === area).map(widget => widget.order)) + 1
      return touch({ ...profile, widgets: [...profile.widgets, { ...make(area, id), order }] })
    })
    revealCard(`productivity-${id}`)
  }
  const hasGreeting = ctx.profile.widgets.some(widget => widget.type === 'greeting')
  const productLabel: Record<Exclude<ProductivityWidgetType, 'weather'>, MessageKey> = { todo: 'widgets.todo', note: 'widgets.note', countdown: 'widgets.countdown' }
  const productTitle = (type: ProductivityWidgetType) => type === 'weather' ? weatherText(s.language, 'title') : t(productLabel[type])
  items.push({ id: 'productivity-add', keys: ['settings.addProductivityWidget', 'settings.addGreeting'], node: <div className="sd-note"><strong>{t('settings.addProductivityWidget')}</strong><div className="sd-widget-actions">
    {!hasGreeting && <button className="sd-button" type="button" onClick={() => addWidget((area, id) => ({ id, type: 'greeting', area, order: 0, props: {} }))}>{t('settings.addGreeting')}</button>}
    {productTypes.map(type => <button className="sd-button" type="button" key={type} onClick={() => addWidget((area, id) => createProductivityWidget(type, area, id))}>{productTitle(type)}</button>)}
  </div></div> })
  const editable = ctx.profile.widgets.filter((widget): widget is EditableWidget => ['greeting', 'text', 'spacer', 'todo', 'note', 'countdown', 'weather'].includes(widget.type))
  for (const widget of editable) {
    const patchWidget = (updates: Record<string, unknown>) => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...updates } as typeof item.props } : item) as typeof profile.widgets }))
    const label = widget.type === 'greeting' ? t('settings.widgetGreeting') : widget.type === 'text' ? t('settings.widgetText') : widget.type === 'spacer' ? t('settings.widgetSpacer') : productTitle(widget.type)
    // Name same-type cards by their title so two todo lists can be told apart.
    const named = (widget.type === 'todo' || widget.type === 'note' || widget.type === 'countdown') && widget.props.title ? `${label} · ${widget.props.title}` : widget.type === 'weather' && widget.props.city ? `${label} · ${widget.props.city}` : label
    let controls: ReactNode = null
    switch (widget.type) {
      case 'weather': controls = <WeatherSettings ctx={ctx} widget={widget} patch={patchWidget} />; break
      case 'greeting': controls = <>
        <Row label={t('settings.greetingName')} hint={t('settings.greetingNameHint')}><DraftText className="sd-input" maxLength={60} value={widget.props.name ?? ''} aria-label={t('settings.greetingName')} onCommit={name => patchWidget({ name: name.trim() || undefined })} /></Row>
        <Toggle label={t('settings.greetingTransition')} checked={widget.props.transitional === true} onChange={transitional => patchWidget({ transitional })} />
      </>; break
      case 'text': controls = <Row label={t('settings.widgetText')} stack><DraftText multiline className="sd-input" rows={3} maxLength={500} value={widget.props.text ?? ''} aria-label={t('settings.widgetText')} onCommit={text => patchWidget({ text })} /></Row>; break
      case 'spacer': controls = <RangeField t={t} label={t('settings.spacerHeight')} value={widget.props.height ?? 40} min={8} max={400} step={4} unit="px" onChange={height => patchWidget({ height })} />; break
      case 'todo': controls = <>
        <Toggle label={t('settings.todoHideCompleted')} checked={widget.props.hideCompleted === true} onChange={hideCompleted => patchWidget({ hideCompleted })} />
        {widget.props.items.map(item => <Row key={item.id} label={t('settings.todoItem')}>
          <DraftText className="sd-input" maxLength={500} value={item.text} aria-label={t('settings.todoItem')} onCommit={text => change(profile => touch({ ...profile, widgets: profile.widgets.map(current => current.id === widget.id && current.type === 'todo' ? { ...current, props: { ...current.props, items: current.props.items.map(entry => entry.id === item.id ? { ...entry, text } : entry) } } : current) }))} />
          <button className="sd-button" type="button" aria-label={t('widgets.todoRemove', { item: item.text || t('settings.todoItem') })} title={t('widgets.todoRemove', { item: item.text || t('settings.todoItem') })} onClick={() => patchWidget({ items: widget.props.items.filter(current => current.id !== item.id) })}>−</button>
        </Row>)}
        <button className="sd-button" type="button" onClick={() => patchWidget({ items: [...widget.props.items, { id: crypto.randomUUID(), text: '', done: false }] })}>{t('settings.todoAddItem')}</button>
      </>; break
      case 'note': controls = <Row label={t('settings.noteContent')} stack><DraftText multiline className="sd-input" rows={4} maxLength={10000} value={widget.props.content} aria-label={t('settings.noteContent')} onCommit={content => patchWidget({ content })} /></Row>; break
      case 'countdown': controls = <>
        <Row label={t('settings.countdownDate')}><input className="sd-input" type="date" value={widget.props.targetDate} aria-label={t('settings.countdownDate')} onChange={event => { if (event.target.value) patchWidget({ targetDate: event.target.value }) }} /></Row>
        <Row label={t('settings.countdownFormat')}><Select ctx={ctx} label={t('settings.countdownFormat')} value={widget.props.format ?? 'days'} options={[{ value: 'days', label: t('settings.countdownDays') }, { value: 'detailed', label: t('settings.countdownDetailed') }]} onChange={format => patchWidget({ format })} /></Row>
      </>; break
    }
    const titled = widget.type === 'todo' || widget.type === 'note' || widget.type === 'countdown'
    const keys: MessageKey[] = [widget.type === 'greeting' ? 'settings.widgetGreeting' : widget.type === 'text' ? 'settings.widgetText' : widget.type === 'spacer' ? 'settings.widgetSpacer' : widget.type === 'weather' ? 'settings.widgets' : productLabel[widget.type], 'settings.widgetTitle', 'settings.widgetArea', 'settings.widgetOrder', 'settings.widgetSize', 'settings.widgetAlign', 'settings.removeWidget']
    items.push(card(`productivity-${widget.id}`, named, !widget.hidden, visible => setHidden(widget.id, visible), true, keys, <>
      {titled && <Row label={t('settings.widgetTitle')}><DraftText className="sd-input" maxLength={120} value={widget.props.title ?? ''} placeholder={label} aria-label={t('settings.widgetTitle')} onCommit={title => patchWidget({ title })} /></Row>}
      {controls}
      <Row label={t('settings.widgetArea')}><Select ctx={ctx} label={t('settings.widgetArea')} value={widget.area} options={areaNames(ctx.profile.layout.areas).map(area => ({ value: area, label: area === 'overview' ? t('settings.areaOverview') : area }))} onChange={area => change(profile => touch({ ...profile, widgets: profile.widgets.map(item => item.id === widget.id ? { ...item, area, order: Math.max(-1, ...profile.widgets.filter(other => other.area === area).map(other => other.order)) + 1 } : item) }))} /></Row>
      <Row label={t('settings.widgetOrder')}>
        <button className="sd-button" type="button" aria-label={t('settings.widgetMoveUp')} title={t('settings.widgetMoveUp')} onClick={() => moveWidget(widget.id, -1)}>↑</button>
        <button className="sd-button" type="button" aria-label={t('settings.widgetMoveDown')} title={t('settings.widgetMoveDown')} onClick={() => moveWidget(widget.id, 1)}>↓</button>
      </Row>
      {widget.type !== 'spacer' && <RangeField t={t} label={t('settings.widgetSize')} value={widget.props.size ?? 1} min={RANGES.widgetSize.min} max={RANGES.widgetSize.max} step={0.1} onChange={size => patchWidget({ size })} />}
      {widget.type !== 'spacer' && <Row label={t('settings.widgetAlign')}><Select ctx={ctx} label={t('settings.widgetAlign')} value={widget.props.align ?? 'center'} options={[['left', 'settings.alignLeft'], ['center', 'settings.alignCenter'], ['right', 'settings.alignRight']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={align => patchWidget({ align })} /></Row>}
      <button className="sd-button" type="button" onClick={() => change(profile => touch({ ...profile, widgets: profile.widgets.filter(item => item.id !== widget.id) }))}>{t('settings.removeWidget')}</button>
    </>))
  }
  return items
}
