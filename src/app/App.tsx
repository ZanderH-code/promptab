import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import type { Settings, Shortcut } from '../core/model'
import { finishShortcut } from '../core/shortcut'
import { ShortcutEditor } from '../features/shortcut-editor/ShortcutEditor'
import { SettingsDrawer } from '../features/settings/SettingsDrawer'
import { translate, type MessageKey, type MessageParams } from '../i18n'
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

function appStyle(s: Settings, wallpaper: string) {
  const shade = s.overlay / 100
  return {
    '--accent': s.accent,
    '--background': s.background,
    '--columns': s.columns,
    '--icon-size': `${s.iconSize}px`,
    '--radius': ICON_RADIUS[s.iconShape],
    '--alignment': s.alignment,
    backgroundImage: wallpaper ? `linear-gradient(rgba(0,0,0,${shade}),rgba(0,0,0,${shade})),url("${wallpaper}")` : undefined,
  } as CSSProperties
}

export default function App() {
  const { settings, error, setError, patch, reset } = useSettings()
  const wallpaper = useWallpaper(setError)
  const [drawer, setDrawer] = useState(false)
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.lang = settings.language
    document.title = translate(settings.language, 'app.title')
  }, [settings?.language])

  if (!settings) {
    return <main className="loading">{error ? translate('zh-CN', error.key, error.params) : translate('zh-CN', 'app.loading')}</main>
  }

  const s = settings
  const t = (key: MessageKey, params?: MessageParams) => translate(s.language, key, params)

  const openMenu = (event: MouseEvent, target: MenuTarget, options: { clamp?: boolean; shortcut?: Shortcut } = {}) => {
    event.preventDefault()
    event.stopPropagation()
    const x = options.clamp ? Math.min(event.clientX, window.innerWidth - MENU_MARGIN) : event.clientX
    const y = options.clamp ? Math.min(event.clientY, window.innerHeight - MENU_MARGIN) : event.clientY
    setMenu({ x, y, target, shortcut: options.shortcut })
  }

  const openSettings = (section?: string) => {
    setDrawer(true)
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }), 0)
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
        { label: t('shortcuts.reorder'), onSelect: () => setDrawer(true) },
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
      style={appStyle(s, wallpaper.url)}
      onClick={closeMenu}
      onContextMenu={event => openMenu(event, 'background', { clamp: true })}
    >
      <header>
        <span className="brand">MINIMAL <span className="brandmuted">/ NEW TAB</span></span>
        <button className="settings-button" onClick={() => setDrawer(true)} aria-label={t('settings.open')}>⚙ <span>{t('settings.button')}</span></button>
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
      {error && <div className="error" role="alert">{t(error.key, error.params)}<button onClick={() => setError(null)}>×</button></div>}
      {drawer && (
        <SettingsDrawer
          settings={s}
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
