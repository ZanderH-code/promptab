import { Check, Plus, Settings as SettingsIcon, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import { backgroundStyle, useThemeTokens, wallpaperStyle } from './useTheme'
import { defaults, type Settings, type Shortcut } from '../core/model'
import { BackupSection } from '../features/settings/BackupSection'
import { finishShortcut } from '../core/shortcut'
import { ShortcutEditor } from '../features/shortcut-editor/ShortcutEditor'
import { SettingsDrawer } from '../features/settings/SettingsDrawer'
import { systemLanguage, translate, type MessageKey, type MessageParams } from '../i18n'
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu'
import { ProfileWidgets } from '../widgets/ProfileWidgets'
import { detectTemplate } from '../core/layout/profile'
import { moveBookmarks } from '../widgets/bookmarkGroups'
import { Banners, PreviewBanner, SafeModeBanner } from '../features/banners/Banners'
import { useSafeMode } from './safeMode'
import { useSettings } from './useSettings'
import { useAssetFonts } from './useAssetFonts'
import { useUserCss } from './useUserCss'
import { useWallpaper } from './useWallpaper'

type MenuTarget = 'background' | 'clock' | 'search' | 'shortcut'
type MenuState = { x: number; y: number; target: MenuTarget; shortcut?: Shortcut }
type MoveState = { shortcut: Shortcut; groupId: string }

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
      if (!event.repeat && event.key.toLowerCase() === 'e' && !target?.closest('input, textarea, select, [contenteditable="true"]')) {
        setEditMode(value => !value)
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && !target?.closest('input, textarea, select, [contenteditable="true"]')) {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo])
  const [drawer, setDrawer] = useState(false)
  const [managingGroups, setManagingGroups] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem('mnt:onboarding:dismissed') === 'true')
  const [drawerSection, setDrawerSection] = useState<string | undefined>()
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const addGroupId = useRef<string | undefined>(undefined)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [moving, setMoving] = useState<MoveState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.lang = settings.language
    document.title = translate(settings.language, 'app.title')
  }, [settings?.language])

  useThemeTokens(profile, settings?.theme)
  useAssetFonts(profile)

  const { safe, enter: enterSafe, exit: exitSafe } = useSafeMode()
  // The last stylesheet that passed the settings-entry check (empty counts), and what the page loaded with.
  const verifiedCss = useRef({ css: '', enabled: false })
  const loadedCss = useRef<string | undefined>(undefined)
  useEffect(() => { if (settings && profile && loadedCss.current === undefined) loadedCss.current = profile.custom.cssEnabled ? profile.custom.css : '' }, [settings, profile])
  useUserCss({
    profile, safe, ready: !!settings,
    onReachable: css => { verifiedCss.current = { css, enabled: true } },
    onUnreachable: (_failure, css) => {
      const state = store?.getState()
      if (!state) return
      if (state.preview?.profileId === state.activeProfileId && state.preview.profile.custom.css === css) {
        state.clearPreview()
        setError({ key: 'css.previewRejected' })
      } else if (css === loadedCss.current || css === verifiedCss.current.css) {
        // Stored CSS that was already there on load is never rewritten silently: pause it instead.
        enterSafe()
        setError({ key: 'safe.autoEntered' })
      } else {
        const good = verifiedCss.current
        run((s, id) => s.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, custom: { ...p.custom, css: good.css, cssEnabled: good.enabled } }), 'restore'), false)
        setError({ key: 'css.rolledBack' })
      }
    },
  })

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
    setEditMode(false)
    setManagingGroups(false)
    setDrawerSection(section)
    setDrawer(true)
  }

  const newShortcut = (color: string): Shortcut => ({ id: crypto.randomUUID(), name: '', url: 'https://', color, icon: '' })

  const removeShortcut = (shortcut: Shortcut) => {
    if (confirm(t('shortcuts.confirmDelete'))) patch({ shortcuts: s.shortcuts.filter(item => item.id !== shortcut.id) })
  }

  const openMoveDialog = (shortcut: Shortcut) => {
    const current = profile?.bookmarks.groups.find(group => group.items.some(item => item.id === shortcut.id))
    const target = profile?.bookmarks.groups.find(group => group.id !== current?.id)
    if (target) setMoving({ shortcut, groupId: target.id })
  }

  const moveShortcut = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!moving) return
    run((st, id) => st.getState().updateProfile(id, p => ({
      ...p,
      meta: { ...p.meta, updatedAt: new Date().toISOString() },
      bookmarks: { ...p.bookmarks, groups: moveBookmarks(p.bookmarks.groups, [moving.shortcut.id], moving.groupId) },
    })))
    setMoving(null)
  }

  function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const shortcut = finishShortcut(editing)
    if (!shortcut) { setError({ key: 'error.shortcutInvalid' }); return }
    const exists = s.shortcuts.some(item => item.id === editing.id)
    patch({ shortcuts: exists ? s.shortcuts.map(item => (item.id === editing.id ? shortcut : item)) : [...s.shortcuts, shortcut] }, !exists ? addGroupId.current : undefined)
    addGroupId.current = undefined
    setEditing(null)
  }

  function menuItems(state: MenuState): ContextMenuItem[] {
    const { shortcut } = state
    if (state.target === 'shortcut' && shortcut) {
      return [
        { label: t('shortcuts.edit'), onSelect: () => setEditing(shortcut) },
        { label: t('shortcuts.reorder'), onSelect: () => setEditMode(true) },
        { label: t('shortcuts.moveToGroup'), onSelect: () => openMoveDialog(shortcut) },
        { label: t('shortcuts.delete'), onSelect: () => removeShortcut(shortcut) },
      ]
    }
    const section = state.target === 'clock' ? 'component-settings' : state.target === 'search' ? 'search-settings' : 'wallpaper-settings'
    const label = state.target === 'clock' ? 'menu.clockSettings' : state.target === 'search' ? 'menu.searchSettings' : 'menu.desktopSettings'
    const items: ContextMenuItem[] = [{ label: t(label), onSelect: () => openSettings(section) }]
    if (state.target === 'background') {
      items.push({ label: t('shortcuts.add'), onSelect: () => setEditing(newShortcut('#90d5cd')) })
      items.push({ label: t('groups.manage'), onSelect: () => setEditMode(true) })
    }
    return items
  }

  const previewLabel = store?.getState().preview?.label
  const applyPreview = () => run(async (st, id) => {
    const preview = st.getState().preview
    if (!preview?.label || preview.profileId !== id) return
    await st.getState().updateProfile(id, () => ({ ...preview.profile, meta: { ...preview.profile.meta, updatedAt: new Date().toISOString() } }), 'theme')
    st.getState().clearPreview()
  })

  const rollbackTarget = store?.getState().history.profiles[store.getState().activeProfileId]?.snapshots[0]

  return (
    <>
    {(safe || previewLabel) && (
      <Banners>
        {previewLabel && <PreviewBanner t={t} name={previewLabel} showingOriginal={!!store?.getState().preview?.showingOriginal} onCompare={() => { const state = store?.getState(); state?.setPreviewOriginal(!state.preview?.showingOriginal) }} onApply={applyPreview} onDiscard={() => store?.getState().clearPreview()} />}
        {safe && <SafeModeBanner
          t={t}
          canRollback={!!rollbackTarget}
          onEditCss={() => openSettings('style')}
          onRollback={() => { if (rollbackTarget) run((st, id) => st.getState().restoreSnapshot(id, rollbackTarget.id), false) }}
          onExit={exitSafe}
        />}
      </Banners>
    )}
    <main
      className={'app mnt-root ' + s.theme}
      data-theme-mode={s.theme}
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
      {!(profile && detectTemplate(profile) === 'banner' && profile.widgets.some(widget => widget.type === 'toolbar' && !widget.hidden && widget.area === 'banner' && widget.props.actions?.includes('settings'))) && <header className="mnt-header">
        <button className="settings-button mnt-settings-entry" onClick={() => openSettings()} aria-label={t('settings.open')}><SettingsIcon size={20} strokeWidth={1.5} aria-hidden="true" /> <span>{t('settings.button')}</span></button>
      </header>}
      {editMode && <nav className="edit-toolbar" aria-label={t('edit.toolbar')}>
        <button type="button" onClick={() => setEditing(newShortcut('#b0a092'))}><Plus size={18} aria-hidden="true" />{t('shortcuts.add')}</button>
        <button type="button" onClick={() => setManagingGroups(true)}><Plus size={18} aria-hidden="true" />{t('groups.add')}</button>
        <button type="button" onClick={() => openSettings('widgets')}><Plus size={18} aria-hidden="true" />{t('edit.addWidget')}</button>
        <button type="button" onClick={() => setEditMode(false)}><Check size={18} aria-hidden="true" />{t('groups.done')}</button>
      </nav>}
      {profile && <ProfileWidgets
        profile={profile}
        language={s.language}
        shortcuts={s.shortcuts}
        editing={editMode || managingGroups}
        onboarding={!!profile && !onboardingDismissed && profile.meta.builtinName === 'default-profile' && profile.bookmarks.groups.every(group => group.items.length === 0)}
        onOnboardingAction={action => {
          localStorage.setItem('mnt:onboarding:dismissed', 'true')
          setOnboardingDismissed(true)
          if (action === 'add') setEditing(newShortcut('#b0a092'))
          else openSettings(action === 'import' ? 'data' : action === 'theme' ? 'appearance' : 'ai')
        }}
        onManageDone={() => { setEditMode(false); setManagingGroups(false) }}
        t={t}
        onError={setError}
        onContextMenu={(event: MouseEvent) => openMenu(event, 'clock')}
        onGroups={update => run((st, id) => st.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, bookmarks: { ...p.bookmarks, groups: update(p.bookmarks.groups) } })))}
        onEdit={setEditing}
        onRemove={removeShortcut}
        onMove={openMoveDialog}
        onAdd={groupId => { addGroupId.current = groupId; setEditing(newShortcut('#b0a092')) }}
        onBookmarkContextMenu={(event: MouseEvent, shortcut: Shortcut) => openMenu(event, 'shortcut', { clamp: true, shortcut })}
        onOpenSettings={() => openSettings()}
        onEnterEditMode={() => setEditMode(true)}
      />}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={closeMenu} />}
      {moving && profile && <div className="modal-backdrop" role="presentation">
        <form className="modal" role="dialog" aria-modal="true" aria-labelledby="move-bookmark-title" onSubmit={moveShortcut} onKeyDown={event => { if (event.key === 'Escape') setMoving(null) }}>
          <h2 id="move-bookmark-title">{t('shortcuts.moveDialog')}</h2>
          <label>{t('groups.moveTo')}<select aria-label={t('groups.moveTo')} value={moving.groupId} onChange={event => setMoving({ ...moving, groupId: event.target.value })}>{profile.bookmarks.groups.filter(group => !group.items.some(item => item.id === moving.shortcut.id)).map(group => <option key={group.id} value={group.id}>{group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name}</option>)}</select></label>
          <button type="button" onClick={() => setMoving(null)}>{t('common.cancel')}</button>
          <button type="submit">{t('shortcuts.moveConfirm')}</button>
        </form>
      </div>}
      {undoNotice && <div className="undo-toast" role="status"><span>{s.language === 'en' ? 'Changes saved' : '更改已保存'}</span><button type="button" onClick={undo}>{s.language === 'en' ? 'Undo' : '撤销'}</button></div>}
      {error && <div className="error" role="alert">{t(error.key, error.params)}<button aria-label={t('common.close')} onClick={() => setError(null)}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button></div>}
      {drawer && store && (
        <SettingsDrawer
          store={store}
          settings={s}
          profile={profile!}
          initialSection={drawerSection}
          safeMode={safe}
          onApplyPreview={applyPreview}
          onEnterEditMode={() => { setEditMode(true); setDrawer(false) }}
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
    </>
  )
}
