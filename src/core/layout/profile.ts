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
  return 'stacked'
}

export function applyTemplate(profile: ProfileV2, template: LayoutTemplate): ProfileV2 {
  const grid = templateGrid(template)
  const next = structuredClone(profile)
  next.layout.areas = grid.areas
  if (grid.columns) next.layout.columns = grid.columns
  else delete next.layout.columns
  if (grid.rows) next.layout.rows = grid.rows
  else delete next.layout.rows
  next.layout.breakpoints = grid.breakpoints
  const names = new Set(grid.areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))
  const fallback = names.has('overview') ? 'overview' : names.has('bookmarks') ? 'bookmarks' : [...names][0]
  next.widgets = next.widgets.map(widget => ({ ...widget, area: names.has(widget.area) ? widget.area : fallback }))
  return next
}
