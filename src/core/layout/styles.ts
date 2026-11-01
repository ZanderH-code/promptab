import type { CSSProperties } from 'react'
import type { AreaStyle, ProfileV2 } from '../schema/profile'
import { columnCount, type Grid } from './grid'

export function gridStyle(grid: Grid, contentWidth: number, gap: number): CSSProperties {
  return {
    '--mnt-content-width': `${contentWidth}px`, '--mnt-layout-gap': `${gap}px`,
    display: 'grid', gridTemplateAreas: grid.areas.map(row => `"${row}"`).join(' '),
    gridTemplateColumns: grid.columns?.join(' ') ?? `repeat(${columnCount(grid.areas)}, minmax(0, 1fr))`,
    ...(grid.rows ? { gridTemplateRows: grid.rows.join(' ') } : {}),
  } as CSSProperties
}

export function areaStyle(style: AreaStyle | undefined, palette: ProfileV2['theme']['color']): CSSProperties {
  if (!style) return {}
  const place = (align: NonNullable<AreaStyle['align']> | undefined) => {
    const [vertical, horizontal] = (align ?? 'center-center').split('-')
    return { alignItems: vertical === 'top' ? 'start' : vertical === 'bottom' ? 'end' : 'center', justifyItems: horizontal === 'left' ? 'start' : horizontal === 'right' ? 'end' : 'center' }
  }
  const background = style.background ? (style.background in palette ? palette[style.background as keyof typeof palette] : style.background) : undefined
  const border = style.border
  return {
    display: 'grid', ...place(style.align),
    ...(background ? { backgroundColor: background, '--mnt-area-opacity': `${(style.opacity ?? 100) / 100}` } : {}),
    ...(style.blur ? { backdropFilter: `blur(${style.blur}px)` } : {}),
    ...(style.padding !== undefined ? { padding: `${style.padding}px` } : {}),
    ...(border?.top ? { borderTop: `${border.top}px solid var(--mnt-accent)` } : {}),
    ...(border?.right ? { borderRight: `${border.right}px solid var(--mnt-accent)` } : {}),
    ...(border?.bottom ? { borderBottom: `${border.bottom}px solid var(--mnt-accent)` } : {}),
    ...(border?.left ? { borderLeft: `${border.left}px solid var(--mnt-accent)` } : {}),
    ...(style.bleed ? { marginInline: 'calc((var(--mnt-content-width) - 100vw) / 2)', width: '100vw' } : {}),
  } as CSSProperties
}
