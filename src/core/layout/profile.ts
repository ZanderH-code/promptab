import type { ProfileV2 } from '../schema/profile'
import { templateGrid, type LayoutTemplate } from './templates'

export function detectTemplate(profile: ProfileV2): LayoutTemplate {
  const areas = profile.layout.areas.join('|')
  if (areas === 'overview|bookmarks') return 'stacked'
  if (areas === 'bookmarks overview') return 'split'
  if (areas === 'bookmarks') return 'websites'
  if (areas === 'overview') return 'zen'
  if (areas === 'clock date links|search search links') return 'dashboard'
  if (areas === 'overview overview|bookmarks bookmarks') return 'top-grid'
  if (areas === 'bookmarks divider overview') return 'icon-split'
  if (areas === 'banner|websites') return 'banner'
  return 'stacked'
}

export function applyTemplate(profile: ProfileV2, template: LayoutTemplate): ProfileV2 {
  const grid = templateGrid(template)
  const next = structuredClone(profile)
  const widget = (type: ProfileV2['widgets'][number]['type']) => next.widgets.find(item => item.type === type)

  if (template === 'icon-split') {
    next.theme.mode = 'light'
    next.theme.colorLight ??= { ...next.theme.color, bg: '#eeeae4', surface: '#f8f7f3', text: '#302d29' }
    next.layout.areaStyles = { divider: { background: 'accent' } }
    const bookmarks = widget('bookmarks')
    if (bookmarks?.type === 'bookmarks') { bookmarks.props = { ...bookmarks.props, style: 'icon-only', maxColumns: 3, showGroupTitles: false }; bookmarks.area = 'bookmarks'; bookmarks.order = 0 }
    const clock = widget('clock')
    if (clock?.type === 'clock') { clock.area = 'overview'; clock.order = 0; clock.props = { ...clock.props, hours: true, minutes: true, seconds: false, separator: ':', separatorSpacing: 0.25 } }
    const date = widget('date')
    if (date?.type === 'date') { date.area = 'overview'; date.order = 1; date.props = { ...date.props, format: 'custom', weekday: true, day: true, month: true, year: true, order: ['weekday', 'day', 'month', 'year'], separator: ' / ' } }
    const search = widget('search')
    if (search) search.hidden = true
    const toolbar = { id: 'layout-toolbar', type: 'toolbar' as const, area: 'overview', order: 2, props: { actions: ['add', 'edit', 'settings'] as ('add' | 'edit' | 'settings')[] } }
    if (!next.widgets.some(item => item.type === 'toolbar')) next.widgets.push(toolbar)
  }

  if (template === 'banner') {
    next.theme.mode = 'dark'
    next.theme.font.display = 'barlow-condensed'
    next.theme.glass = 48
    next.background.dim = 55
    next.layout.areaStyles = { banner: { background: 'surface', opacity: 68, blur: 18, bleed: true, padding: 24, align: 'center-right', border: { bottom: 1 } } }
    const bookmarks = widget('bookmarks')
    if (bookmarks) { bookmarks.hidden = true; bookmarks.area = 'websites' }
    const clock = widget('clock')
    if (clock) { clock.area = 'banner'; clock.order = 0 }
    const date = widget('date')
    if (date?.type === 'date') { date.area = 'banner'; date.order = 1; date.props = { ...date.props, format: 'custom', weekday: true, day: true, month: true, order: ['weekday', 'day', 'month'], ordinal: true, uppercase: true, separator: ' / ', align: 'right' } }
    const search = widget('search')
    if (search) { search.hidden = true; search.area = 'banner' }
    const toolbar = widget('toolbar')
    if (toolbar) { toolbar.hidden = true; toolbar.area = 'banner' }
  }

  next.layout.areas = grid.areas
  if (grid.columns) next.layout.columns = grid.columns
  else delete next.layout.columns
  if (grid.rows) next.layout.rows = grid.rows
  else delete next.layout.rows
  next.layout.breakpoints = grid.breakpoints
  const names = new Set(grid.areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))
  if (next.layout.areaStyles) next.layout.areaStyles = Object.fromEntries(Object.entries(next.layout.areaStyles).filter(([name]) => names.has(name)))
  const fallback = names.has('overview') ? 'overview' : names.has('bookmarks') ? 'bookmarks' : [...names][0]
  next.widgets = next.widgets.map(item => ({ ...item, area: names.has(item.area) ? item.area : fallback }))
  return next
}
