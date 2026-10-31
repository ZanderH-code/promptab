import { X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { searchUrl, type Settings } from '../../core/model'
import type { MessageRef, Translate } from '../../i18n'
import { Dropdown } from '../../ui/Dropdown'
import type { StoreApi } from 'zustand/vanilla'
import type { ProfileStore } from '../../store/profile'
import { BackupSection } from './BackupSection'
import { ProfileSection } from './ProfileSection'

type Props = {
  store: StoreApi<ProfileStore>
  settings: Settings
  t: Translate
  onPatch: (changes: Partial<Settings>) => void
  onClose: () => void
  onWallpaperFile: (file?: File) => void
  onWallpaperRemove: () => void
  onReset: () => void
  onError: (error: MessageRef) => void
}

const SEARCH_ENGINES = [
  { value: 'https://www.google.com/search?q={query}', label: 'Google' },
  { value: 'https://www.bing.com/search?q={query}', label: 'Bing' },
]
const BAIDU = 'https://www.baidu.com/s?wd={query}'

const WIDGET_FLAGS = [
  ['showClock', 'settings.showClock'],
  ['showDate', 'settings.showDate'],
  ['showSearch', 'settings.showSearch'],
  ['hour12', 'settings.hour12'],
] as const

const fill = (value: number, min: number, max: number) => ({ '--fill': `${((value - min) / (max - min)) * 100}%` }) as CSSProperties

export function SettingsDrawer({ store, settings: s, t, onPatch, onClose, onWallpaperFile, onWallpaperRemove, onReset, onError }: Props) {
  const searchOptions = [
    ...SEARCH_ENGINES,
    { value: BAIDU, label: t('settings.engineBaidu') },
    ...(![...SEARCH_ENGINES.map(engine => engine.value), BAIDU].includes(s.searchTemplate) ? [{ value: s.searchTemplate, label: t('common.custom') }] : []),
  ]

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" aria-label={t('settings.button')}>
        <div className="drawer-head">
          <div>
            <small>{t('settings.kicker')}</small>
            <h2>{t('settings.title')}</h2>
          </div>
          <button onClick={onClose} aria-label={t('settings.close')}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        </div>
        <p>{t('settings.intro')}</p>

        <h3>{t('settings.language')}</h3>
        <label>
          {t('settings.language')}
          <Dropdown theme={s.theme} label={t('settings.language')} value={s.language} onChange={value => onPatch({ language: value as Settings['language'] })} options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} />
        </label>

        <h3>{t('settings.appearance')}</h3>
        <label>
          {t('settings.theme')}
          <Dropdown theme={s.theme} label={t('settings.theme')} value={s.theme} onChange={value => onPatch({ theme: value as Settings['theme'] })} options={[{ value: 'dark', label: t('settings.themeDark') }, { value: 'light', label: t('settings.themeLight') }]} />
        </label>
        <label>{t('settings.accent')}<input type="color" value={s.accent} onChange={event => onPatch({ accent: event.target.value })} /></label>
        <label>{t('settings.background')}<input type="color" value={s.background} onChange={event => onPatch({ background: event.target.value })} /></label>

        <h3>{t('settings.layoutSection')}</h3>
        <label>
          {t('settings.layout')}
          <Dropdown theme={s.theme} label={t('settings.layout')} value={s.layout} onChange={value => onPatch({ layout: value as Settings['layout'] })} options={[{ value: 'stacked', label: t('settings.layoutStacked') }, { value: 'split', label: t('settings.layoutSplit') }]} />
        </label>
        <label>{t('settings.reverse')}<input type="checkbox" checked={s.reverse} onChange={event => onPatch({ reverse: event.target.checked })} /></label>
        <label>
          {t('settings.columns')}
          <input type="range" min="2" max="10" style={fill(s.columns, 2, 10)} value={s.columns} onChange={event => onPatch({ columns: Number(event.target.value) })} /> {s.columns}
        </label>
        <label>
          {t('settings.iconSize')}
          <input type="range" min="40" max="120" style={fill(s.iconSize, 40, 120)} value={s.iconSize} onChange={event => onPatch({ iconSize: Number(event.target.value) })} /> {s.iconSize}
        </label>
        <label>
          {t('settings.iconShape')}
          <Dropdown theme={s.theme} label={t('settings.iconShape')} value={s.iconShape} onChange={value => onPatch({ iconShape: value as Settings['iconShape'] })} options={[{ value: 'circle', label: t('settings.shapeCircle') }, { value: 'rounded', label: t('settings.shapeRounded') }, { value: 'square', label: t('settings.shapeSquare') }]} />
        </label>
        <label>
          {t('settings.alignment')}
          <Dropdown theme={s.theme} label={t('settings.alignment')} value={s.alignment} onChange={value => onPatch({ alignment: value as Settings['alignment'] })} options={[{ value: 'center', label: t('settings.alignCenter') }, { value: 'left', label: t('settings.alignLeft') }]} />
        </label>

        <h3 id="wallpaper-settings">{t('settings.wallpaper')}</h3>
        <label className="stack">
          {t('settings.wallpaperUpload')}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => onWallpaperFile(event.target.files?.[0])} />
        </label>
        <label>
          {t('settings.overlay')}
          <input type="range" min="0" max="80" style={fill(s.overlay, 0, 80)} value={s.overlay} onChange={event => onPatch({ overlay: Number(event.target.value) })} /> {s.overlay}%
        </label>
        <button className="reset" onClick={onWallpaperRemove}>{t('settings.wallpaperRemove')}</button>

        <h3 id="component-settings">{t('settings.widgets')}</h3>
        {WIDGET_FLAGS.map(([key, label]) => (
          <label key={key}>{t(label)}<input type="checkbox" checked={s[key]} onChange={event => onPatch({ [key]: event.target.checked })} /></label>
        ))}

        <h3 id="search-settings">{t('settings.searchEngine')}</h3>
        <Dropdown theme={s.theme} fullWidth label={t('settings.searchEngine')} value={s.searchTemplate} onChange={value => onPatch({ searchTemplate: value })} options={searchOptions} />
        <label className="stack">
          {t('settings.searchCustom')}
          <input
            defaultValue={s.searchTemplate}
            key={s.searchTemplate}
            onBlur={event => {
              try {
                searchUrl(event.target.value, 'test')
                onPatch({ searchTemplate: event.target.value })
              } catch {
                onError({ key: 'error.searchTemplate' })
              }
            }}
          />
        </label>

        <h3>{t('settings.shortcuts')}</h3>
        <p>{t('settings.shortcutsHint')}</p>
        <ProfileSection store={store} t={t} language={s.language} />
        <BackupSection settings={s} t={t} onError={onError} store={store} />
        <button className="reset" onClick={() => { if (confirm(t('settings.confirmReset'))) onReset() }}>{t('settings.reset')}</button>
      </aside>
    </>
  )
}
