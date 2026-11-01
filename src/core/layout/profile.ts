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
  if (areas === 'banner|websites' || areas === '.|banner|websites') return 'banner'
  return 'stacked'
}

export function applyTemplate(profile: ProfileV2, template: LayoutTemplate): ProfileV2 {
  const grid = templateGrid(template)
  const next = structuredClone(profile)
  const widget = (type: ProfileV2['widgets'][number]['type']) => next.widgets.find(item => item.type === type)

  if (template === 'icon-split') {
    next.theme.mode = 'light'
    next.theme.colorLight ??= { ...next.theme.color, bg: '#eeeae4', surface: '#f8f7f3', text: '#302d29', accent: '#3a5a80' }
    next.theme.colorLight.accent = '#3a5a80'
    next.layout.areaStyles = { divider: { background: 'accent' } }
    const bookmarks = widget('bookmarks')
    if (bookmarks?.type === 'bookmarks') { bookmarks.props = { ...bookmarks.props, style: 'icon-only', maxColumns: 3, showGroupTitles: false, showAdd: false }; bookmarks.area = 'bookmarks'; bookmarks.order = 0 }
    const clock = widget('clock')
    if (clock?.type === 'clock') { clock.area = 'overview'; clock.order = 0; clock.props = { ...clock.props, size: 0.55, hours: true, minutes: true, seconds: false, separator: ':', separatorSpacing: 0.25, align: 'center' } }
    const date = widget('date')
    if (date?.type === 'date') { date.area = 'overview'; date.order = 1; date.props = { ...date.props, format: 'custom', weekday: true, day: true, month: true, year: true, order: ['weekday', 'day', 'month', 'year'], separator: ' / ', align: 'center' } }
    const search = widget('search')
    if (search) search.hidden = true
    const toolbar = { id: 'layout-toolbar', type: 'toolbar' as const, area: 'overview', order: 2, props: { align: 'center' as const, actions: ['add', 'edit', 'settings'] as ('add' | 'edit' | 'settings')[] } }
    if (!next.widgets.some(item => item.type === 'toolbar')) next.widgets.push(toolbar)
  }

  if (template === 'banner') {
    next.theme.mode = 'dark'
    next.theme.color.accent = '#2fd6e0'
    next.theme.font.display = 'barlow-condensed'
    next.theme.glass = 48
    next.background.dim = 40
    next.layout.areaStyles = { banner: { background: 'surface', opacity: 68, blur: 18, bleed: true, padding: 24, align: 'center-right', border: { bottom: 2 } } }
    const bookmarks = widget('bookmarks')
    if (bookmarks?.type === 'bookmarks') { bookmarks.hidden = true; bookmarks.area = 'websites'; bookmarks.props = { ...bookmarks.props, showAdd: false } }
    const clock = widget('clock')
    if (clock?.type === 'clock') { clock.area = 'banner'; clock.order = 0; clock.props = { ...clock.props, size: 1, align: 'right' } }
    const date = widget('date')
    if (date?.type === 'date') { date.area = 'banner'; date.order = 1; date.props = { ...date.props, size: 1.1, format: 'custom', weekday: true, day: true, month: true, order: ['weekday', 'day', 'month'], ordinal: true, uppercase: true, separator: ' / ', align: 'right' } }
    const search = widget('search')
    if (search) { search.hidden = true; search.area = 'banner' }
    let toolbar = widget('toolbar')
    if (toolbar) { toolbar.hidden = false; toolbar.area = 'banner'; toolbar.order = 2; toolbar.props = { ...toolbar.props, size: 0.95, actions: ['settings'] } }
    else {
      toolbar = { id: 'layout-banner-toolbar', type: 'toolbar', area: 'banner', order: 2, props: { size: 0.95, actions: ['settings'] } } as ProfileV2['widgets'][number]
      next.widgets.push(toolbar)
    }
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
