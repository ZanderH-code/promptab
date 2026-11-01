import { useEffect, useState } from 'react'
import type { Settings } from '../../../core/model'
import { RANGES } from '../../../core/schema/defaults'
import { profileIssues, type ProfileV2 } from '../../../core/schema/profile'
import { applyTemplate, detectTemplate } from '../../../core/layout/profile'
import { areaGridProblem, areaNames } from '../../../core/layout/grid'
import { LAYOUT_TEMPLATES } from '../../../core/layout/templates'
import type { MessageKey } from '../../../i18n'
import { ColorField, RangeField, Row, Toggle } from '../controls'
import { Select, touch, type Ctx, type Item } from './shared'

function AreaBleedToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const [value, setValue] = useState(checked)
  useEffect(() => { setValue(checked) }, [checked])
  return <Toggle label={label} checked={value} onChange={next => { setValue(next); onChange(next) }} />
}


export function layoutItems(ctx: Ctx): Item[] {
  const { t, s, profile, change, patch } = ctx
  const choice = (id: string, label: MessageKey, value: string, options: [string, MessageKey][], set: (value: string) => void): Item => ({
    id, keys: [label, ...options.map(([, key]) => key)],
    node: <Row label={t(label)}><Select ctx={ctx} label={t(label)} value={value} onChange={set} options={options.map(([v, key]) => ({ value: v, label: t(key) }))} /></Row>,
  })
  const textField = (id: string, label: MessageKey, value: string, set: (value: string) => void, issue?: string): Item => ({
    id, keys: [label], node: <Row label={t(label)} stack><textarea data-user-content className="sd-input sd-code" rows={Math.min(5, Math.max(2, value.split('\n').length))} value={value} aria-label={t(label)} onChange={event => set(event.target.value)} />{issue && <small role="alert">{issue}</small>}</Row>,
  })
  const templateLabels: Record<(typeof LAYOUT_TEMPLATES)[number], MessageKey> = { stacked: 'settings.layoutStacked', split: 'settings.layoutSplit', 'top-grid': 'settings.layoutTopGrid', websites: 'settings.layoutWebsites', zen: 'settings.layoutZen', dashboard: 'settings.layoutDashboard' }
  const baseGrid = profile.layout
  const narrow = profile.layout.breakpoints?.narrow
  const areas = areaNames(ctx.layoutDrafts?.base?.areas !== undefined ? ctx.layoutDrafts.base.areas.split('\n').map(line => line.trim()).filter(Boolean) : baseGrid.areas)
  const areaLabel = (area: string) => area === 'overview' ? t('settings.areaOverview') : area === 'bookmarks' ? t('settings.shortcuts') : area
  const widgetLabel = (widget: ProfileV2['widgets'][number]) => ({ clock: t('settings.showClock'), date: t('settings.showDate'), search: t('settings.showSearch'), bookmarks: t('settings.shortcuts'), greeting: t('settings.widgetGreeting'), text: t('settings.widgetText'), spacer: t('settings.widgetSpacer') })[widget.type]
  type GridKey = 'areas' | 'columns' | 'rows'
  const parse = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean)
  const candidateFor = (current: ProfileV2, key: GridKey, value: string, narrowGrid: boolean) => {
    const candidate = structuredClone(current)
    const target = narrowGrid ? candidate.layout.breakpoints?.narrow : candidate.layout
    if (!target) return null
    const lines = parse(value)
    if (key === 'areas') target.areas = lines
    else target[key] = lines.length ? lines : undefined
    const moved: string[] = []
    if (key === 'areas') {
      const grids = [candidate.layout, ...Object.values(candidate.layout.breakpoints ?? {}).filter(grid => grid !== undefined)]
      const common = areaNames(candidate.layout.areas).filter(name => grids.every(grid => areaNames(grid.areas).includes(name)))
      const destination = common[0]
      if (destination) candidate.widgets = candidate.widgets.map(widget => {
        if (common.includes(widget.area)) return widget
        moved.push(`${widget.id} → ${destination}`)
        return { ...widget, area: destination }
      })
      if (!narrowGrid && candidate.layout.areaStyles) {
        const names = areaNames(candidate.layout.areas)
        candidate.layout.areaStyles = Object.fromEntries(Object.entries(candidate.layout.areaStyles).filter(([name]) => names.includes(name)))
      }
    }
    return { candidate, moved }
  }
  const editGrid = (key: GridKey, value: string, narrowGrid = false) => {
    const gridKey = narrowGrid ? 'narrow' : 'base'
    ctx.onLayoutDraftsChange?.({ ...ctx.layoutDrafts, [gridKey]: { ...ctx.layoutDrafts?.[gridKey], [key]: value } })
    const draftArea = ctx.layoutDrafts?.[gridKey]?.areas
    const result = candidateFor(profile, draftArea !== undefined ? 'areas' : key, draftArea ?? value, narrowGrid)
    if (result && key !== 'areas') {
      const target = narrowGrid ? result.candidate.layout.breakpoints?.narrow : result.candidate.layout
      if (target) target[key] = parse(value).length ? parse(value) : undefined
    }
    if (!result || profileIssues(result.candidate, s.language).length) return
    change(current => {
      const latest = candidateFor(current, draftArea !== undefined ? 'areas' : key, draftArea ?? value, narrowGrid)
      if (latest && key !== 'areas') {
        const target = narrowGrid ? latest.candidate.layout.breakpoints?.narrow : latest.candidate.layout
        if (target) target[key] = parse(value).length ? parse(value) : undefined
      }
      if (!latest || profileIssues(latest.candidate, s.language).length) return current
      ctx.onGridCommit?.(latest.candidate)
      return touch(latest.candidate)
    })
    if (key === 'areas' || draftArea !== undefined) ctx.onMovedWidgets?.(result.moved)
  }
  const gridEditor = (narrowGrid = false): Item[] => {
    const grid = narrowGrid ? narrow : baseGrid
    if (!grid) return []
    const prefix = narrowGrid ? 'narrow' : 'base'
    const label = narrowGrid ? 'settings.layoutNarrow' : 'settings.layoutAreas'
    const field = (key: GridKey) => ctx.layoutDrafts?.[prefix]?.[key] ?? grid[key]?.join('\n') ?? ''
    const fieldIssue = (key: GridKey) => {
      if (ctx.layoutDrafts?.[prefix]?.[key] === undefined) return undefined
      const result = candidateFor(profile, key, field(key), narrowGrid)
      const path = `${narrowGrid ? 'layout.breakpoints.narrow' : 'layout'}.${key}`
      return (key === 'areas' ? areaGridProblem(parse(field(key))) : null) ?? (result ? profileIssues(result.candidate, s.language).find(issue => issue.path === path)?.expected : undefined)
    }
    return [
      textField(`${prefix}-areas`, label, field('areas'), value => editGrid('areas', value, narrowGrid), fieldIssue('areas')),
      textField(`${prefix}-columns`, 'settings.layoutColumns', field('columns'), value => editGrid('columns', value, narrowGrid), fieldIssue('columns')),
      textField(`${prefix}-rows`, 'settings.layoutRows', field('rows'), value => editGrid('rows', value, narrowGrid), fieldIssue('rows')),
    ]
  }
  const patchWidget = (id: string, props: Record<string, unknown>) => change(p => touch({ ...p, widgets: p.widgets.map(item => item.id === id ? { ...item, props: { ...item.props, ...props } as typeof item.props } : item) }))
  const widgetMove = (id: string, direction: -1 | 1) => change(p => {
    const widget = p.widgets.find(item => item.id === id)
    if (!widget) return p
    const siblings = p.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order)
    const from = siblings.findIndex(item => item.id === id), to = from + direction
    if (to < 0 || to >= siblings.length) return p
    ;[siblings[from], siblings[to]] = [siblings[to], siblings[from]]
    const order = new Map(siblings.map((item, index) => [item.id, index]))
    return touch({ ...p, widgets: p.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })
  })
  const widgetItems: Item[] = profile.widgets.map(widget => ({
    id: `widget-${widget.id}`, keys: ['settings.widgetArea', 'settings.widgetOrder', 'settings.widgetSize', 'settings.widgetAlign', 'settings.widgetEyebrow'],
    node: <div className="sd-note"><strong>{widgetLabel(widget)}</strong>
      <Toggle label={widget.type === 'clock' ? t('settings.showClock') : widget.type === 'date' ? t('settings.showDate') : widget.type === 'search' ? t('settings.showSearch') : widget.type === 'bookmarks' ? t('settings.shortcuts') : t('settings.widgets')} checked={!widget.hidden} onChange={visible => change(p => touch({ ...p, widgets: p.widgets.map(item => item.id === widget.id ? { ...item, hidden: !visible } : item) }))} />
      <Row label={t('settings.widgetArea')}><Select ctx={ctx} label={t('settings.widgetArea')} value={widget.area} options={areas.map(area => ({ value: area, label: areaLabel(area) }))} onChange={area => change(p => touch({ ...p, widgets: p.widgets.map(item => item.id === widget.id ? { ...item, area } : item) }))} /></Row>
      <Row label={t('settings.widgetOrder')}><button className="sd-button" disabled={widget.order <= 0} onClick={() => widgetMove(widget.id, -1)}>↑</button><button className="sd-button" onClick={() => widgetMove(widget.id, 1)}>↓</button></Row>
      <RangeField t={t} label={t('settings.widgetSize')} value={widget.props.size ?? 1} min={0.5} max={3} step={0.1} onChange={size => patchWidget(widget.id, { size })} />
      <Row label={t('settings.widgetAlign')}><Select ctx={ctx} label={t('settings.widgetAlign')} value={widget.props.align ?? 'center'} options={[['left', 'settings.alignLeft'], ['center', 'settings.alignCenter'], ['right', 'settings.alignRight']].map(([value, key]) => ({ value, label: t(key as MessageKey) }))} onChange={align => patchWidget(widget.id, { align })} /></Row>
      {widget.type === 'clock' && <Toggle label={t('settings.widgetEyebrow')} checked={widget.props.eyebrow === true} onChange={eyebrow => patchWidget(widget.id, { eyebrow })} />}
    </div>,
  }))
  const areaControls: Item[] = areas.map(area => {
    const style = profile.layout.areaStyles?.[area] ?? {}
    const setStyle = (updates: Record<string, unknown>) => change(p => touch({ ...p, layout: { ...p.layout, areaStyles: { ...p.layout.areaStyles, [area]: { ...p.layout.areaStyles?.[area], ...updates } } } }))
    return { id: `area-style-${area}`, keys: ['settings.areaStyle', 'settings.areaBlur', 'settings.areaPadding', 'settings.areaBackground', 'settings.areaOpacity', 'settings.areaBleed', 'settings.areaAlign', 'settings.areaBorderTop', 'settings.areaBorderRight', 'settings.areaBorderBottom', 'settings.areaBorderLeft'], node: <div className="sd-note"><strong data-user-content>{areaLabel(area)}</strong>
      <Row label={t('settings.areaBackground')}><Select ctx={ctx} label={t('settings.areaBackground')} value={style.background ?? 'surface'} options={[{ value: 'surface', label: t('settings.colorSurface') }, { value: 'accent', label: t('settings.accent') }, { value: 'bg', label: t('settings.background') }, { value: '#102932', label: t('common.custom') }]} onChange={background => setStyle({ background })} /></Row>
      {style.background && style.background.startsWith('#') && <ColorField t={t} label={t('settings.areaBackground')} value={style.background} onChange={background => setStyle({ background })} />}
      <RangeField t={t} label={t('settings.areaOpacity')} value={style.opacity ?? 100} min={0} max={100} unit="%" onChange={opacity => setStyle({ opacity })} />
      <RangeField t={t} label={t('settings.areaBlur')} value={style.blur ?? 0} min={0} max={40} unit="px" onChange={blur => setStyle({ blur })} />
      <RangeField t={t} label={t('settings.areaPadding')} value={style.padding ?? 0} min={0} max={200} unit="px" onChange={padding => setStyle({ padding })} />
      <AreaBleedToggle label={t('settings.areaBleed')} checked={style.bleed ?? false} onChange={bleed => setStyle({ bleed })} />
      <Row label={t('settings.areaAlign')}><Select ctx={ctx} label={t('settings.areaAlign')} value={style.align ?? 'center-center'} options={(['top-left','top-center','top-right','center-left','center-center','center-right','bottom-left','bottom-center','bottom-right'] as const).map((value, index) => ({ value, label: t((['settings.posTopLeft','settings.posTop','settings.posTopRight','settings.posLeft','settings.posCenter','settings.posRight','settings.posBottomLeft','settings.posBottom','settings.posBottomRight'] as const)[index]) }))} onChange={align => setStyle({ align })} /></Row>
      {(['top', 'right', 'bottom', 'left'] as const).map(side => <RangeField key={side} t={t} label={t(`settings.areaBorder${side[0].toUpperCase()}${side.slice(1)}` as MessageKey)} value={style.border?.[side] ?? 0} min={0} max={16} unit="px" onChange={width => setStyle({ border: { ...style.border, [side]: width } })} />)}
    </div> }
  })
  const gridItems = [...gridEditor(), ...(narrow ? gridEditor(true) : [{ id: 'narrow-grid', keys: ['settings.layoutNarrow'], node: <button type="button" className="sd-button" onClick={() => change(p => touch({ ...p, layout: { ...p.layout, breakpoints: { ...p.layout.breakpoints, narrow: { areas: p.layout.areas } } } }))}>{t('settings.layoutNarrow')}</button> } as Item]) ]
  return [
    { id: 'layout-template', keys: ['settings.layout', ...Object.values(templateLabels)], node: <Row label={t('settings.layout')}><Select ctx={ctx} label={t('settings.layout')} value={detectTemplate(profile)} options={LAYOUT_TEMPLATES.map(value => ({ value, label: t(templateLabels[value]) }))} onChange={value => change(p => touch(applyTemplate(p, value as (typeof LAYOUT_TEMPLATES)[number])))} /></Row> },
    ...gridItems,
    ...(ctx.movedWidgets?.length ? [{ id: 'widget-area-moved', keys: ['settings.widgetArea'], node: <div className="sd-note" role="status">{ctx.movedWidgets.map(message => <div key={message}>{t('settings.widgetMoved', { message })}</div>)}</div> } as Item] : []),
    ...widgetItems, ...areaControls,
    choice('alignment', 'settings.alignment', s.alignment, [['center', 'settings.alignCenter'], ['left', 'settings.alignLeft']], value => patch({ alignment: value as Settings['alignment'] })),
    { id: 'content-width', keys: ['settings.contentWidth'], node: <RangeField t={t} label={t('settings.contentWidth')} value={profile.layout.contentWidth} min={RANGES.contentWidth.min} max={RANGES.contentWidth.max} step={10} unit="px" onChange={contentWidth => change(p => touch({ ...p, layout: { ...p.layout, contentWidth } }))} /> },
    { id: 'gap', keys: ['settings.gap'], node: <RangeField t={t} label={t('settings.gap')} value={profile.layout.gap} min={RANGES.gap.min} max={RANGES.gap.max} unit="px" onChange={gap => change(p => touch({ ...p, layout: { ...p.layout, gap } }))} /> },
    { id: 'columns', keys: ['settings.columns'], node: <RangeField t={t} label={t('settings.columns')} value={s.columns} min={2} max={10} onChange={columns => patch({ columns })} /> },
    { id: 'icon-size', keys: ['settings.iconSize'], node: <RangeField t={t} label={t('settings.iconSize')} value={s.iconSize} min={40} max={120} unit="px" onChange={iconSize => patch({ iconSize })} /> },
    choice('icon-shape', 'settings.iconShape', s.iconShape, [['circle', 'settings.shapeCircle'], ['rounded', 'settings.shapeRounded'], ['square', 'settings.shapeSquare']], value => patch({ iconShape: value as Settings['iconShape'] })),
  ]
}
