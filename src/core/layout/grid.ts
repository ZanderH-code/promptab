import type { ProfileV2 } from '../schema/profile'

export type Grid = { areas: string[]; columns?: string[]; rows?: string[] }

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

/** Visible widgets of one area, in display order. */
export function widgetsIn(widgets: ProfileV2['widgets'], area: string): ProfileV2['widgets'] {
  return widgets.filter(widget => widget.area === area && !widget.hidden).sort((a, b) => a.order - b.order)
}
