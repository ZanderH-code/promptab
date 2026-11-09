import type { ProfileV2 } from '../schema/profile'
import { BREAKPOINTS } from '../schema/defaults'

export type Breakpoint = 'narrow' | 'medium' | 'wide'
export type Grid = { areas: string[]; columns?: string[]; rows?: string[] }

/** `narrow` is below 640px, `medium` up to 1024px, `wide` above (DESIGN §4). */
export const NARROW_MAX = BREAKPOINTS.narrowMax
export const MEDIUM_MAX = BREAKPOINTS.mediumMax

export const breakpointFor = (width: number): Breakpoint => width <= NARROW_MAX ? 'narrow' : width <= MEDIUM_MAX ? 'medium' : 'wide'

const cells = (row: string) => row.trim().split(/\s+/)

/** Area names in first-seen order, without the `.` placeholder. */
export function areaNames(areas: readonly string[]): string[] {
  const seen: string[] = []
  for (const row of areas) for (const name of cells(row)) if (name !== '.' && !seen.includes(name)) seen.push(name)
  return seen
}

export type AreaGridRules = {
  /** Area names that must still appear in the grid, e.g. the area a required widget lives in. */
  required?: readonly string[]
}

/**
 * `grid-template-areas` is dropped by the browser unless every row has the same width and each name is
 * one rectangle. A repeated row is a duplicate entry in the editor rather than a taller area, so it is
 * rejected before it can be committed; a name that spans rows is still allowed, as long as the rows differ.
 */
export function areaGridProblem(areas: readonly string[], rules: AreaGridRules = {}): string | null {
  if (!areas.length) return 'at least one row'
  const rows = areas.map(cells)
  const width = rows[0].length
  if (rows.some(row => row.length !== width)) return 'rows with the same number of cells'
  const names = areaNames(areas)
  for (const name of names) {
    const positions = rows.flatMap((row, y) => row.flatMap((cell, x) => cell === name ? [[x, y]] : []))
    const xs = positions.map(([x]) => x), ys = positions.map(([, y]) => y)
    const box = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)
    if (box !== positions.length) return `area "${name}" to be one rectangle`
  }
  const seenRows = new Set<string>()
  for (const row of rows) {
    const signature = row.join(' ')
    const name = row.find(cell => cell !== '.')
    if (name && seenRows.has(signature)) return `duplicate area "${name}"`
    seenRows.add(signature)
  }
  for (const name of rules.required ?? []) if (!names.includes(name)) return `missing area "${name}"`
  return null
}

/** Number of columns a grid needs: the cells of its first row. */
export const columnCount = (areas: readonly string[]) => (areas[0] ? cells(areas[0]).length : 1)

/**
 * The grid for a breakpoint. Overrides cascade like `max-width` media queries: narrow falls back to medium,
 * medium and wide fall back to the base grid.
 */
export function resolveGrid(layout: ProfileV2['layout'], breakpoint: Breakpoint): Grid {
  const base: Grid = { areas: layout.areas, ...(layout.columns ? { columns: layout.columns } : {}), ...(layout.rows ? { rows: layout.rows } : {}) }
  const { narrow, medium } = layout.breakpoints ?? {}
  const pick = breakpoint === 'narrow' ? narrow ?? medium : breakpoint === 'medium' ? medium : undefined
  return pick ? { areas: pick.areas, ...(pick.columns ? { columns: pick.columns } : {}), ...(pick.rows ? { rows: pick.rows } : {}) } : base
}

/** Visible widgets of one area, in display order. */
export function widgetsIn(widgets: ProfileV2['widgets'], area: string): ProfileV2['widgets'] {
  return widgets.filter(widget => widget.area === area && !widget.hidden).sort((a, b) => a.order - b.order)
}
