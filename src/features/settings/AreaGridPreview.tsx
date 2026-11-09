import { useState } from 'react'
import type { ProfileV2 } from '../../core/schema/profile'
import type { Translate } from '../../i18n'

/**
 * A miniature of the committed area grid. It mirrors the page's grid template and column proportions
 * (fr tracks, the same gap ratio), so the blocks sit where the page's areas sit. Custom areas are
 * buttons that open a single rename field; the internal areas keep their fixed, translated names.
 */
export function AreaGridPreview({ layout, label, t, onRename }: {
  layout: ProfileV2['layout']
  label: (area: string) => string
  t: Translate
  onRename: (from: string, to: string) => string | null
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rows = layout.areas.map(row => row.trim().split(/\s+/).filter(Boolean))
  const names: string[] = []
  for (const row of rows) for (const name of row) if (name !== '.' && !names.includes(name)) names.push(name)
  const columns = rows[0]?.length ?? 1
  const tracks = (layout.columns?.length ? layout.columns : Array.from({ length: columns }, () => '1fr'))
    .map(track => /([\d.]+)fr/.exec(track)?.[0] ?? track)
    .join(' ')
  /** The accessible name lists the areas in reading order, so the diagram explains its own contents. */
  const name = t('settings.gridPreviewName', { areas: names.map(label).join(t('settings.listSeparator')) })
  const close = () => { setSelected(null); setDraft(''); setError(null) }
  const select = (area: string) => {
    if (area === 'overview' || area === 'bookmarks') return
    setSelected(area); setDraft(area); setError(null)
  }
  const submit = () => {
    if (selected === null) return
    const problem = onRename(selected, draft)
    if (problem) { setError(problem); return }
    close()
  }
  return (
    <figure className="sd-grid-figure">
      <div
        className="sd-grid-preview" role="group" aria-label={name}
        data-columns={tracks} data-rows={rows.length}
        style={{
          gridTemplateAreas: rows.map(row => `"${row.join(' ')}"`).join(' '),
          gridTemplateColumns: tracks,
          gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`,
          gap: `${(layout.gap / layout.contentWidth) * 100}%`,
        }}
      >
        {names.map(area => area === 'overview' || area === 'bookmarks'
          ? <div key={area} className="sd-grid-block" data-area={area} style={{ gridArea: area }}>{label(area)}</div>
          : <button key={area} type="button" className="sd-grid-block" data-area={area} style={{ gridArea: area }} aria-pressed={selected === area} onClick={() => select(area)}>{label(area)}</button>)}
      </div>
      {selected !== null && (
        <form className="sd-grid-rename" onSubmit={event => { event.preventDefault(); submit() }}>
          <input
            className="sd-input" value={draft} aria-label={t('settings.renameArea')}
            autoFocus onChange={event => { setDraft(event.target.value); setError(null) }}
          />
          <button type="submit" className="sd-button">{t('settings.renameAreaAction')}</button>
          <button type="button" className="sd-button" onClick={close}>{t('common.cancel')}</button>
          {error && <small role="alert">{error}</small>}
        </form>
      )}
    </figure>
  )
}
