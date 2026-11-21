import { areaNames } from '../../../core/layout/grid'
import { RANGES } from '../../../core/schema/defaults'
import type { MessageKey } from '../../../i18n'
import { RangeField, Row, Toggle } from '../controls'
import { widgetDefaults } from '../rowDefaults'
import { Select, touch, type Ctx } from './shared'
import '../../../i18n/lazy'

type Widget = Ctx['profile']['widgets'][number]

/** Search keys for the placement rows, so settings search finds them inside each widget card. */
export const PLACEMENT_KEYS: MessageKey[] = ['settings.widgetArea', 'settings.widgetOrder', 'settings.widgetSize', 'settings.widgetAlign']

/** Area names a widget can be placed in; follows an uncommitted grid draft so a just-typed area is offered. */
export function widgetAreas(ctx: Ctx): string[] {
  const draft = ctx.layoutDrafts?.base?.areas
  return areaNames(draft !== undefined ? draft.split('\n').map(line => line.trim()).filter(Boolean) : ctx.profile.layout.areas)
}

/** Where a widget sits on the page and how big it is: area, order within it, size and alignment. */
export function WidgetPlacement({ ctx, widget }: { ctx: Ctx; widget: Widget }) {
  const { t, change } = ctx
  const fallback = ctx.defaults ? widgetDefaults(ctx.defaults, ctx.s.language) : null
  const resetLabel = (label: MessageKey) => t('settings.resetRow', { label: t(label) })
  const areaLabel = (area: string) => area === 'overview' ? t('settings.areaOverview') : area === 'bookmarks' ? t('settings.shortcuts') : area
  const patchProps = (props: Record<string, unknown>) => change(p => touch({ ...p, widgets: p.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...props } as typeof item.props } : item) as typeof p.widgets }))
  const siblings = ctx.profile.widgets.filter(item => item.area === widget.area).sort((a, b) => a.order - b.order)
  const index = siblings.findIndex(item => item.id === widget.id)
  const move = (direction: -1 | 1) => change(p => {
    const current = p.widgets.find(item => item.id === widget.id)
    if (!current) return p
    const list = p.widgets.filter(item => item.area === current.area).sort((a, b) => a.order - b.order)
    const from = list.findIndex(item => item.id === widget.id), to = from + direction
    if (to < 0 || to >= list.length) return p
    ;[list[from], list[to]] = [list[to], list[from]]
    const order = new Map(list.map((item, i) => [item.id, i]))
    return touch({ ...p, widgets: p.widgets.map(item => order.has(item.id) ? { ...item, order: order.get(item.id)! } : item) })
  })
  // Moving to another area puts the widget at the end there, so it never collides with an existing order.
  const setArea = (area: string) => change(p => touch({ ...p, widgets: p.widgets.map(item => item.id === widget.id ? { ...item, area, order: Math.max(-1, ...p.widgets.filter(other => other.area === area && other.id !== widget.id).map(other => other.order)) + 1 } : item) }))
  const sized = widget.type !== 'spacer'
  const size = widget.props.size ?? 1
  const align = widget.props.align ?? 'center'
  return <>
    <Row label={t('settings.widgetArea')}><Select ctx={ctx} label={t('settings.widgetArea')} value={widget.area} options={widgetAreas(ctx).map(area => ({ value: area, label: areaLabel(area) }))} onChange={setArea} /></Row>
    <Row label={t('settings.widgetOrder')}>
      <button className="sd-button" type="button" disabled={index <= 0} aria-label={t('settings.widgetMoveUp')} title={t('settings.widgetMoveUp')} onClick={() => move(-1)}>↑</button>
      <button className="sd-button" type="button" disabled={index < 0 || index >= siblings.length - 1} aria-label={t('settings.widgetMoveDown')} title={t('settings.widgetMoveDown')} onClick={() => move(1)}>↓</button>
    </Row>
    {sized && <RangeField t={t} label={t('settings.widgetSize')} value={size} min={RANGES.widgetSize.min} max={RANGES.widgetSize.max} step={0.1} changed={!!fallback && size !== fallback.size} onReset={fallback ? () => patchProps({ size: fallback.size }) : undefined} resetLabel={resetLabel('settings.widgetSize')} onChange={value => patchProps({ size: value })} />}
    {sized && <Row label={t('settings.widgetAlign')} changed={!!fallback && align !== fallback.align} onReset={fallback ? () => patchProps({ align: fallback.align }) : undefined} resetLabel={resetLabel('settings.widgetAlign')}><Select ctx={ctx} label={t('settings.widgetAlign')} value={align} options={(['left', 'center', 'right'] as const).map(value => ({ value, label: t(value === 'left' ? 'settings.alignLeft' : value === 'center' ? 'settings.alignCenter' : 'settings.alignRight') }))} onChange={value => patchProps({ align: value })} /></Row>}
    {widget.type === 'clock' && <Toggle label={t('settings.widgetEyebrow')} checked={widget.props.eyebrow === true} onChange={eyebrow => patchProps({ eyebrow })} />}
  </>
}
