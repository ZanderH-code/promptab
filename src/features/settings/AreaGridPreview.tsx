import type { ProfileV2 } from '../../core/schema/profile'
import type { Translate } from '../../i18n'

/**
 * A read-only miniature of the committed area grid. It mirrors the page's grid template and column
 * proportions (fr tracks, the same gap ratio), so the blocks sit where the page's areas sit, while
 * staying only a diagram: nothing here is editable.
 */
export function AreaGridPreview({ layout, label, t }: { layout: ProfileV2['layout']; label: (area: string) => string; t: Translate }) {
  const rows = layout.areas.map(row => row.trim().split(/\s+/).filter(Boolean))
  const names: string[] = []
  for (const row of rows) for (const name of row) if (name !== '.' && !names.includes(name)) names.push(name)
  const columns = rows[0]?.length ?? 1
  const tracks = (layout.columns?.length ? layout.columns : Array.from({ length: columns }, () => '1fr'))
    .map(track => /([\d.]+)fr/.exec(track)?.[0] ?? track)
    .join(' ')
  /** The accessible name lists the areas in reading order, so the diagram explains its own contents. */
  const name = t('settings.gridPreviewName', { areas: names.map(label).join(t('settings.listSeparator')) })
  return (
    <figure className="sd-grid-figure">
      <div
        className="sd-grid-preview" role="img" aria-label={name}
        data-columns={tracks} data-rows={rows.length}
        style={{
          gridTemplateAreas: rows.map(row => `"${row.join(' ')}"`).join(' '),
          gridTemplateColumns: tracks,
          gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`,
          gap: `${(layout.gap / layout.contentWidth) * 100}%`,
        }}
      >
        {names.map(name => <div key={name} className="sd-grid-block" data-area={name} style={{ gridArea: name }}>{label(name)}</div>)}
      </div>
    </figure>
  )
}
