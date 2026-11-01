import { Settings as SettingsIcon, X } from 'lucide-react'
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import { backgroundStyle, useThemeTokens, wallpaperStyle } from './useTheme'
import { defaults, type Settings, type Shortcut } from '../core/model'
import { BackupSection } from '../features/settings/BackupSection'
import { finishShortcut } from '../core/shortcut'
import { ShortcutEditor } from '../features/shortcut-editor/ShortcutEditor'
import { SettingsDrawer } from '../features/settings/SettingsDrawer'
import { systemLanguage, translate, type MessageKey, type MessageParams } from '../i18n'
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu'
import { Clock } from '../widgets/Clock'
import { Search } from '../widgets/Search'
import { ShortcutGrid } from '../widgets/ShortcutGrid'
import { useSettings } from './useSettings'
import { useWallpaper } from './useWallpaper'

type MenuTarget = 'background' | 'clock' | 'search' | 'shortcut'
type MenuState = { x: number; y: number; target: MenuTarget; shortcut?: Shortcut }

const MENU_MARGIN = 180
const ICON_RADIUS = { circle: '50%', rounded: '24%', square: '4px' } as const

function appStyle(s: Settings, profile: ProfileV2 | null) {
  return {
    '--mnt-columns': s.columns,
    '--mnt-icon-size': `${s.iconSize}px`,
    '--mnt-icon-radius': ICON_RADIUS[s.iconShape],
    '--mnt-alignment': s.alignment,
    ...(profile ? backgroundStyle(profile, s.theme) : {}),
  } as CSSProperties
}

export default function App() {
  const { settings, profile, store, error, setError, patch, reset, undo, undoNotice, run } = useSettings()
  const wallpaper = useWallpaper(profile, run, setError)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && !target?.closest('input, textarea, select, [contenteditable="true"]')) {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])
  const [drawer, setDrawer] = useState(false)
  const [drawerSection, setDrawerSection] = useState<string | undefined>()
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.lang = settings.language
    document.title = translate(settings.language, 'app.title')
  }, [settings?.language])

  useThemeTokens(profile, settings?.theme)

  if (!settings) {
    const language = systemLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
    return <main className="loading">{error ? <><p role="alert">{translate(language, error.key, error.params)}</p><BackupSection settings={{ ...defaults, language }} t={(key, params) => translate(language, key, params)} onError={setError} recovery /></> : translate(language, 'app.loading')}</main>
  }

  const s = settings
  const imageStyle = profile ? wallpaperStyle(profile, wallpaper.url) : null
  const t =(key: MessageKey, params?: MessageParams) => translate(s.language, key, params)

  const openMenu = (event: MouseEvent, target: MenuTarget, options: { clamp?: boolean; shortcut?: Shortcut } = {}) => {
    event.preventDefault()
    event.stopPropagation()
    const x = options.clamp ? Math.min(event.clientX, window.innerWidth - MENU_MARGIN) : event.clientX
    const y = options.clamp ? Math.min(event.clientY, window.innerHeight - MENU_MARGIN) : event.clientY
    setMenu({ x, y, target, shortcut: options.shortcut })
  }

  const openSettings = (section?: string) => {
    setDrawerSection(section)
    setDrawer(true)
  }

  const newShortcut = (color: string): Shortcut => ({ id: crypto.randomUUID(), name: '', url: 'https://', color, icon: '' })

  const removeShortcut = (shortcut: Shortcut) => {
    if (confirm(t('shortcuts.confirmDelete'))) patch({ shortcuts: s.shortcuts.filter(item => item.id !== shortcut.id) })
  }

  function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const shortcut = finishShortcut(editing)
    if (!shortcut) { setError({ key: 'error.shortcutInvalid' }); return }
    const exists = s.shortcuts.some(item => item.id === editing.id)
    patch({ shortcuts: exists ? s.shortcuts.map(item => (item.id === editing.id ? shortcut : item)) : [...s.shortcuts, shortcut] })
    setEditing(null)
  }

  function menuItems(state: MenuState): ContextMenuItem[] {
    const { shortcut } = state
    if (state.target === 'shortcut' && shortcut) {
      return [
        { label: t('shortcuts.edit'), onSelect: () => setEditing(shortcut) },
        { label: t('shortcuts.reorder'), onSelect: () => openSettings('shortcuts') },
        { label: t('shortcuts.delete'), onSelect: () => removeShortcut(shortcut) },
      ]
    }
    const section = state.target === 'clock' ? 'component-settings' : state.target === 'search' ? 'search-settings' : 'wallpaper-settings'
    const label = state.target === 'clock' ? 'menu.clockSettings' : state.target === 'search' ? 'menu.searchSettings' : 'menu.desktopSettings'
    const items: ContextMenuItem[] = [{ label: t(label), onSelect: () => openSettings(section) }]
    if (state.target === 'background') items.push({ label: t('shortcuts.add'), onSelect: () => setEditing(newShortcut('#90d5cd')) })
    return items
  }

  return (
    <main
      className={'app ' + s.theme}
      style={appStyle(s, profile)}
      onClick={closeMenu}
      onContextMenu={event => openMenu(event, 'background', { clamp: true })}
    >
      {imageStyle && (
        <div className="wallpaper" aria-hidden="true">
          <div className="wallpaper-image" style={imageStyle} />
          <div className="wallpaper-shade" />
          <div className="wallpaper-vignette" style={{ '--vignette': `${profile!.background.image!.vignette}%` } as CSSProperties} />
        </div>
      )}
      <header>
        <span className="brand">MINIMAL <span className="brandmuted">/ NEW TAB</span></span>
        <button className="settings-button" onClick={() => openSettings()} aria-label={t('settings.open')}><SettingsIcon size={20} strokeWidth={1.5} aria-hidden="true" /> <span>{t('settings.button')}</span></button>
      </header>
      <section className={`desktop layout-${s.layout} ${s.reverse ? 'layout-reverse' : ''}`}>
        <div className="overview">
          <Clock language={s.language} showClock={s.showClock} showDate={s.showDate} hour12={s.hour12} onContextMenu={event => openMenu(event, 'clock')} />
          {s.showSearch && <Search template={s.searchTemplate} t={t} onError={setError} onContextMenu={event => openMenu(event, 'search')} />}
        </div>
        <ShortcutGrid
          shortcuts={s.shortcuts}
          editing={drawer}
          t={t}
          onReorder={shortcuts => patch({ shortcuts })}
          onEdit={setEditing}
          onRemove={removeShortcut}
          onAdd={() => setEditing(newShortcut('#b0a092'))}
          onContextMenu={(event, shortcut) => openMenu(event, 'shortcut', { clamp: true, shortcut })}
        />
      </section>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={closeMenu} />}
      {undoNotice && <div className="undo-toast" role="status"><span>{s.language === 'en' ? 'Changes saved' : '更改已保存'}</span><button type="button" onClick={undo}>{s.language === 'en' ? 'Undo' : '撤销'}</button></div>}
      {error && <div className="error" role="alert">{t(error.key, error.params)}<button aria-label={t('common.close')} onClick={() => setError(null)}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button></div>}
      {drawer && store && (
        <SettingsDrawer
          store={store}
          settings={s}
          profile={profile!}
          initialSection={drawerSection}
          onProfileChange={(update, kind) => run((store, id) => store.getState().updateProfile(id, p => ({ ...update(p), meta: { ...p.meta, updatedAt: new Date().toISOString() } }), kind))}
          t={t}
          onPatch={patch}
          onClose={() => setDrawer(false)}
          onWallpaperFile={file => void wallpaper.choose(file)}
          onWallpaperRemove={wallpaper.remove}
          onReset={reset}
          onError={setError}
        />
      )}
      {editing && <ShortcutEditor key={editing.id} shortcut={editing} t={t} onChange={setEditing} onClose={() => setEditing(null)} onSave={saveShortcut} onError={key => setError({ key })} />}
    </main>
  )
}
