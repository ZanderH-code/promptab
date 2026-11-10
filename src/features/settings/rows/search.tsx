import { SEARCH_ENGINES } from '../../../core/search/engines'
import { searchUrl } from '../../../core/model'
import { Row, Toggle } from '../controls'
import { Select, type Ctx, type Item } from './shared'


export function searchItems(ctx: Ctx): Item[] {
  const { t, s, patch, onError } = ctx
  const openNewTabDefault = ctx.defaults?.prefs.openSearchInNewTab
  const presets = SEARCH_ENGINES.map(({ template, name }) => ({ value: template, label: name }))
  const options = [
    ...presets,
    ...(!presets.some(engine => engine.value === s.searchTemplate) ? [{ value: s.searchTemplate, label: t('common.custom') }] : []),
  ]
  return [
    { id: 'engine', keys: ['settings.searchEngine'], words: SEARCH_ENGINES.map(engine => engine.name), node: <Row label={t('settings.searchEngine')} stack><Select ctx={ctx} wide label={t('settings.searchEngine')} value={s.searchTemplate} options={options} onChange={searchTemplate => patch({ searchTemplate })} /></Row> },
    { id: 'search-new-tab', keys: ['settings.openSearchNewTab'], node: <Toggle label={t('settings.openSearchNewTab')} checked={ctx.profile.prefs.openSearchInNewTab} changed={openNewTabDefault !== undefined && ctx.profile.prefs.openSearchInNewTab !== openNewTabDefault} onReset={openNewTabDefault !== undefined ? () => ctx.change(p => ({ ...p, prefs: { ...p.prefs, openSearchInNewTab: openNewTabDefault } })) : undefined} resetLabel={t('settings.resetRow', { label: t('settings.openSearchNewTab') })} onChange={openSearchInNewTab => ctx.change(p => ({ ...p, prefs: { ...p.prefs, openSearchInNewTab } }))} /> },
    {
      id: 'engine-custom', keys: ['settings.searchCustom'],
      node: (
        <Row label={t('settings.searchCustom')} htmlFor="sd-search-template" stack>
          <input
            id="sd-search-template" className="sd-input" defaultValue={s.searchTemplate} key={s.searchTemplate}
            onBlur={event => {
              try { searchUrl(event.target.value, 'test'); if (event.target.value !== s.searchTemplate) patch({ searchTemplate: event.target.value }) }
              catch { onError({ key: 'error.searchTemplate' }) }
            }}
          />
        </Row>
      ),
    },
  ]
}
