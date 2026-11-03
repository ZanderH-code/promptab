import { searchUrl } from '../../../core/model'
import { Row, Toggle } from '../controls'
import { Select, type Ctx, type Item } from './shared'

const SEARCH_ENGINES = [
  { value: 'https://www.google.com/search?q={query}', label: 'Google' },
  { value: 'https://www.bing.com/search?q={query}', label: 'Bing' },
]
const BAIDU = 'https://www.baidu.com/s?wd={query}'


export function searchItems(ctx: Ctx): Item[] {
  const { t, s, patch, onError } = ctx
  const options = [
    ...SEARCH_ENGINES, { value: BAIDU, label: t('settings.engineBaidu') },
    ...(![...SEARCH_ENGINES.map(engine => engine.value), BAIDU].includes(s.searchTemplate) ? [{ value: s.searchTemplate, label: t('common.custom') }] : []),
  ]
  return [
    { id: 'engine', keys: ['settings.searchEngine', 'settings.engineBaidu'], words: ['Google', 'Bing'], node: <Row label={t('settings.searchEngine')} stack><Select ctx={ctx} wide label={t('settings.searchEngine')} value={s.searchTemplate} options={options} onChange={searchTemplate => patch({ searchTemplate })} /></Row> },
    { id: 'search-new-tab', keys: ['settings.openSearchNewTab'], node: <Toggle label={t('settings.openSearchNewTab')} checked={ctx.profile.prefs.openSearchInNewTab} onChange={openSearchInNewTab => ctx.change(p => ({ ...p, prefs: { ...p.prefs, openSearchInNewTab } }))} /> },
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
