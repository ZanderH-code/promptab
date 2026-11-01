import type { ProfileV2 } from '../schema/profile'

export const LAYOUT_TEMPLATES = ['stacked', 'split', 'top-grid', 'websites', 'zen', 'dashboard', 'icon-split', 'banner'] as const
export type LayoutTemplate = typeof LAYOUT_TEMPLATES[number]

/** Templates use the legacy area IDs where possible so migrated profiles keep their established widgets. */
export function templateGrid(template: LayoutTemplate): Pick<ProfileV2['layout'], 'areas' | 'columns' | 'rows' | 'breakpoints'> {
  switch (template) {
    case 'stacked': return { areas: ['overview', 'bookmarks'], breakpoints: { narrow: { areas: ['overview', 'bookmarks'] } } }
    case 'split': return { areas: ['bookmarks overview'], columns: ['minmax(0, 1fr)', 'minmax(280px, 0.7fr)'], breakpoints: { narrow: { areas: ['overview', 'bookmarks'], columns: ['1fr'] } } }
    case 'top-grid': return { areas: ['overview overview', 'bookmarks bookmarks'], columns: ['1fr', '1fr'], breakpoints: { narrow: { areas: ['overview', 'bookmarks'], columns: ['1fr'] } } }
    case 'websites': return { areas: ['bookmarks'], breakpoints: { narrow: { areas: ['bookmarks'] } } }
    case 'zen': return { areas: ['overview'], breakpoints: { narrow: { areas: ['overview'] } } }
    case 'dashboard': return { areas: ['clock date links', 'search search links'], columns: ['minmax(0, 1fr)', 'minmax(0, 1fr)', 'minmax(240px, 0.8fr)'], rows: ['auto', '1fr'], breakpoints: { narrow: { areas: ['clock', 'date', 'search', 'links'], columns: ['1fr'] } } }
    case 'icon-split': return { areas: ['bookmarks divider overview'], columns: ['minmax(0, 1fr)', '1px', 'minmax(280px, 0.7fr)'], breakpoints: { narrow: { areas: ['overview', 'bookmarks'], columns: ['1fr'] } } }
    case 'banner': return { areas: ['.', 'banner', 'websites'], columns: ['1fr'], rows: ['22vh', 'auto', '1fr'], breakpoints: { narrow: { areas: ['banner', 'websites'], columns: ['1fr'], rows: ['auto', '1fr'] } } }
  }
}
