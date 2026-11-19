import { Check, Plus, Settings as SettingsIcon, X } from 'lucide-react'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type FormEvent } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import { backgroundStyle, useThemeTokens, wallpaperStyle } from './useTheme'
import { defaults, type Settings, type Shortcut } from '../core/model'
import { finishShortcut } from '../core/shortcut'
import { systemLanguage, translate, type MessageKey, type MessageParams } from '../i18n'
import type { ContextMenuItem } from '../ui/ContextMenu'
import type { OnboardingAction } from '../widgets/OnboardingCard'
import { ProfileWidgets } from '../widgets/ProfileWidgets'
import type { ContextMenuEvent } from '../widgets/ShortcutGridContent'
import { extensionApi } from '../platform/extension'
import { detectTemplate } from '../core/layout/profile'
import { moveBookmarks } from '../widgets/bookmarkGroups'
import { Banners, PreviewBanner, SafeModeBanner } from '../features/banners/Banners'
import { useSafeMode } from './safeMode'
import { useSettings } from './useSettings'
import { useAssetFonts } from './useAssetFonts'
import { useUserCss } from './useUserCss'
import { useWallpaper } from './useWallpaper'
const ContextMenu = lazy(() => import('../ui/ContextMenu').then(m => ({ default: m.ContextMenu })))
const FormDialog = lazy(() => import('../ui/FormDialog').then(m => ({ default: m.FormDialog })))
const KeyboardHelp = lazy(() => import('./KeyboardHelp').then(m => ({ default: m.KeyboardHelp })))

const SyncApp = lazy(() => import('./syncRuntime').then(m => ({ default: m.SyncApp })))
const SettingsDrawer = lazy(() => import('../features/settings/SettingsDrawer').then(m => ({ default: m.SettingsDrawer })))
const BackupSection = lazy(() => import('../features/settings/BackupSection').then(m => ({ default: m.BackupSection })))
const ShortcutEditor = lazy(() => import('../features/shortcut-editor/ShortcutEditor').then(m => ({ default: m.ShortcutEditor })))
const WallpaperVideo = lazy(() => import('../features/wallpaper/WallpaperVideo').then(m => ({ default: m.WallpaperVideo })))

type MenuTarget = 'background' | 'clock' | 'search' | 'shortcut' | 'group'
type MenuState = { x: number; y: number; target: MenuTarget; shortcut?: Shortcut; group?: ProfileV2['bookmarks']['groups'][number]; focusTarget?: HTMLElement }
/** `groupId` is empty when the website goes into a new group named `name`. */
type MoveState = { shortcut: Shortcut; groupId: string; name: string; invalid?: boolean }

/** Widgets re-render only when their data changes, not whenever a menu, dialog or banner in App does. */
const Widgets = memo(ProfileWidgets)
const WIDGET_HANDLERS = ['onOnboardingAction', 'onContextMenu', 'onGroups', 'onGroupContextMenu', 'onOpenAll', 'onRemove', 'onMove', 'onAdd', 'onBookmarkContextMenu', 'onOpenSettings', 'onEnterEditMode', 'onAccent', 'onWidgetChange'] as const
type WidgetHandlers = Required<Pick<ComponentProps<typeof ProfileWidgets>, typeof WIDGET_HANDLERS[number]>>

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
  const [syncMounted, setSyncMounted] = useState(false)
  useEffect(() => {
    if (!store) return
    let alive = true
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
      const storage = extensionApi()?.storage?.local
      void storage?.get('mnt.sync.enabled').then(value => { if (alive && value['mnt.sync.enabled'] === true) setSyncMounted(true) })
    }) })
    return () => { alive = false; cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [store])
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // newShortcut and openSettings are declared after the loading return, so they do not exist until settings do.
      if (!settings) return
      const target = event.target as HTMLElement | null
      const typing = !!target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      if (keyboardHelpOpen || document.querySelector('[role="dialog"].mnt-folder-dialog')) return
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault()
        undo()
        return
      }
      // Settings or a dialog is in front: single-letter keys belong to it, not to the page behind.
      if (document.querySelector('.drawer.sd, .modal-backdrop')) return
      if (!profile?.prefs.keyboardShortcuts || typing || event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.shiftKey && event.key !== '?')) return
      const key = event.key.toLowerCase()
      if (key === '/') { event.preventDefault(); document.querySelector<HTMLInputElement>('#search')?.focus() }
      else if (key === 'e') setEditMode(value => !value)
      else if (key === 'a') { addGroupId.current = undefined; setEditing(newShortcut('#90d5cd')) }
      else if (key === ',') { event.preventDefault(); openSettings() }
      else if (key === 'd') patch({ theme: settings?.theme === 'light' ? 'dark' : 'light' })
      else if (event.key === '?') { event.preventDefault(); setKeyboardHelpOpen(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, settings, patch, profile, keyboardHelpOpen])
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { if (drawer) setSyncMounted(true) }, [drawer])
  const [editMode, setEditMode] = useState(false)
  const [onboardingEligible, setOnboardingEligible] = useState(() => localStorage.getItem('mnt:onboarding:eligible') === 'true')
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem('mnt:onboarding:dismissed') === 'true')
  useEffect(() => {
    const refresh = () => setOnboardingEligible(localStorage.getItem('mnt:onboarding:eligible') === 'true')
    refresh()
    window.addEventListener('mnt:onboarding-ready', refresh)
    return () => window.removeEventListener('mnt:onboarding-ready', refresh)
  }, [])
  const [drawerSection, setDrawerSection] = useState<string | undefined>()
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const addGroupId = useRef<string | undefined>(undefined)
  /** The onboarding step the person opened, so the card can stay until that step is actually done. */
  const onboardingStep = useRef<OnboardingAction | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [moving, setMoving] = useState<MoveState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const tryGeneration = useRef(0)
  useEffect(() => {
    if (!__WEB_BUILD__ || !settings || !store) return
    const handleTry = () => {
      if (!location.hash.startsWith('#try=')) return
      const id = new URLSearchParams(location.hash.slice(1)).get('try') ?? ''
      const generation = ++tryGeneration.current
      history.replaceState(history.state, '', location.pathname + location.search)
      const state = store.getState()
      const activeId = state.activeProfileId
      const active = state.profiles[activeId]
      setError(null)
      void import('../features/settings/Gallery').then(async ({ loadGalleryPreview }) => {
        const analysis = await loadGalleryPreview(id, active, settings.language)
        if (!analysis.pack) throw new Error('invalid')
        const { applyPack } = await import('../core/ai/apply')
        const current = store.getState()
        if (generation !== tryGeneration.current) return
        if (current.activeProfileId !== activeId || current.profiles[activeId] !== active) throw new Error('profile changed')
        current.setPreview(activeId, applyPack(active, analysis.pack), analysis.pack.meta?.name || id)
      }).catch(error => { if (generation === tryGeneration.current) setError({ key: error instanceof Error && error.message === 'fetch failed' ? 'gallery.error' : 'gallery.invalid' }) })
    }
    window.addEventListener('hashchange', handleTry)
    handleTry()
    return () => window.removeEventListener('hashchange', handleTry)
  }, [settings, store, setError])

  useEffect(() => {
    if (!settings) return
    document.documentElement.lang = settings.language
    document.title = profile?.prefs.pageTitle?.trim() || translate(settings.language, 'app.title')
  }, [settings?.language, profile?.prefs.pageTitle])

  useEffect(() => {
    if (!settings && error) {
      try { localStorage.removeItem('mnt:theme-cache:v1') } catch { /* Storage can be unavailable. */ }
      const root = document.documentElement
      for (const name of Array.from(root.style)) if (name.startsWith('--mnt-')) root.style.removeProperty(name)
      delete root.dataset.theme
      delete root.dataset.glass
      document.body.style.removeProperty('background')
    }
  }, [settings, error])

  useThemeTokens(profile, settings?.theme, !store?.getState().preview)
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

  const settingsLanguage = settings?.language ?? 'en'
  // Stable per language: the CSS editor, settings sections and folder items key effects and memos on `t`.
  const t = useCallback((key: MessageKey, params?: MessageParams) => translate(settingsLanguage, key, params), [settingsLanguage])
  const style = useMemo(() => settings ? appStyle(settings, profile) : undefined, [settings, profile])
  // Stable callbacks that call this render's handlers, which are assigned after the loading return below.
  const widgetHandlers = useRef<WidgetHandlers | null>(null)
  const widgetCallbacks = useMemo(() => Object.fromEntries(WIDGET_HANDLERS.map(name => [name, (...args: unknown[]) => (widgetHandlers.current![name] as (...values: unknown[]) => unknown)(...args)])) as WidgetHandlers, [])

  if (!settings) {
    const language = __WEB_BUILD__ ? 'en' : systemLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
    return <main className="loading">{error ? <><p role="alert">{translate(language, error.key, error.params)}</p><Suspense fallback={null}><BackupSection settings={{ ...defaults, language }} t={(key, params) => translate(language, key, params)} onError={setError} recovery /></Suspense></> : translate(language, 'app.loading')}</main>
  }

  const s = settings
  const imageStyle = profile ? wallpaperStyle(profile, wallpaper.url) : null
  const videoBackground = profile?.background.type === 'video' ? profile.background.video : undefined

  const openMenu = (event: ContextMenuEvent, target: MenuTarget, options: { clamp?: boolean; shortcut?: Shortcut; group?: ProfileV2['bookmarks']['groups'][number] } = {}) => {
    event.preventDefault()
    event.stopPropagation()
    const x = options.clamp ? Math.min(event.clientX, window.innerWidth - MENU_MARGIN) : event.clientX
    const y = options.clamp ? Math.min(event.clientY, window.innerHeight - MENU_MARGIN) : event.clientY
    setMenu({ x, y, target, shortcut: options.shortcut, group: options.group, focusTarget: event.focusTarget })
  }

  const dismissOnboarding = () => {
    onboardingStep.current = null
    localStorage.setItem('mnt:onboarding:dismissed', 'true')
    setOnboardingDismissed(true)
  }
  const closeDrawer = () => {
    setDrawer(false)
    if (onboardingStep.current === 'theme' || onboardingStep.current === 'ai') dismissOnboarding()
    else onboardingStep.current = null
  }

  const openSettings = (section?: string) => {
    setEditMode(false)
    setDrawerSection(section)
    setDrawer(true)
  }

  const openGroupLinks = (group: ProfileV2['bookmarks']['groups'][number]) => {
    if (group.items.length > 8 && !confirm(t('groups.confirmOpenAll', { count: group.items.length }))) return
    group.items.forEach(item => { window.open(item.url, '_blank', 'noopener') })
  }

  const newShortcut = (color: string): Shortcut => ({ id: crypto.randomUUID(), name: '', url: 'https://', color, icon: '' })

  const removeShortcut = (shortcut: Shortcut) => {
    // No browser confirm box: the change is saved with an Undo button, like every other delete.
    patch({ shortcuts: s.shortcuts.filter(item => item.id !== shortcut.id) })
  }

  const openMoveDialog = (shortcut: Shortcut) => {
    const current = profile?.bookmarks.groups.find(group => group.items.some(item => item.id === shortcut.id))
    const target = profile?.bookmarks.groups.find(group => group.id !== current?.id)
    // With a single group there is nowhere to move to yet; offer a new group instead of doing nothing.
    setMoving({ shortcut, groupId: target?.id ?? '', name: '' })
  }

  const moveShortcut = () => {
    if (!moving) return
    const name = moving.name.trim()
    if (!moving.groupId && !name) { setMoving({ ...moving, invalid: true }); return }
    const groupId = moving.groupId || crypto.randomUUID()
    run((st, id) => st.getState().updateProfile(id, p => {
      const groups = moving.groupId ? p.bookmarks.groups : [...p.bookmarks.groups, { id: groupId, name, collapsed: false, items: [] }]
      return { ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, bookmarks: { ...p.bookmarks, groups: moveBookmarks(groups, [moving.shortcut.id], groupId) } }
    }))
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
    if (onboardingStep.current === 'add') dismissOnboarding()
    setEditing(null)
  }

  function menuItems(state: MenuState): ContextMenuItem[] {
    const { shortcut } = state
    if (state.target === 'group' && state.group) return [{ label: t('groups.openAll'), onSelect: () => openGroupLinks(state.group!) }]
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

  widgetHandlers.current = {
    onOnboardingAction: action => {
      // The card goes away once a step is done (a website saved, a theme or AI visited), not when one is
      // merely opened: backing out of the add dialog should leave the way back in.
      if (action === 'dismiss') { dismissOnboarding(); return }
      onboardingStep.current = action
      if (action === 'add') setEditing(newShortcut('#b0a092'))
      else openSettings(action === 'import' ? 'data' : action === 'theme' ? 'appearance' : 'ai')
    },
    onContextMenu: event => openMenu(event, 'clock'),
    onGroups: update => run((st, id) => st.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, bookmarks: { ...p.bookmarks, groups: update(p.bookmarks.groups) } }), undefined, true)),
    onGroupContextMenu: (event, group) => openMenu(event, 'group', { clamp: true, group }),
    onOpenAll: openGroupLinks,
    onRemove: removeShortcut,
    onMove: openMoveDialog,
    onAdd: groupId => { addGroupId.current = groupId; setEditing(newShortcut('#b0a092')) },
    onBookmarkContextMenu: (event, shortcut) => openMenu(event, 'shortcut', { clamp: true, shortcut }),
    onOpenSettings: section => openSettings(section),
    onEnterEditMode: () => setEditMode(true),
    onAccent: accent => patch({ accent }),
    onWidgetChange: (widgetId, update) => run((st, id) => st.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, widgets: p.widgets.map(item => item.id === widgetId ? update(item as never) : item) }))),
  }

  return (
    <>
    {(safe || previewLabel || syncMounted) && (
      <Banners>
        <Suspense fallback={null}>{syncMounted && store && <SyncApp store={store} language={s.language} />}</Suspense>
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
      style={style}
      onClick={closeMenu}
      onContextMenu={event => openMenu(event, 'background', { clamp: true })}
    >
      <h1 className="visually-hidden">Promptab</h1>
      {imageStyle && (
        <div className="wallpaper" aria-hidden="true">
          <div className="wallpaper-media" style={{ opacity: (profile!.background.image!.opacity ?? 100) / 100 }}><div className="wallpaper-image" style={imageStyle} /></div>
          {!!profile!.background.tint && <div className="wallpaper-tint" style={{ '--mnt-wallpaper-tint': `${profile!.background.tint}%` } as CSSProperties} />}
          <div className="wallpaper-shade" />
          <div className="wallpaper-vignette" style={{ '--vignette': `${profile!.background.image!.vignette}%` } as CSSProperties} />
        </div>
      )}
      {videoBackground && wallpaper.videoUrl && wallpaper.posterUrl && (
        <div className="wallpaper" aria-hidden="true">
          <div className="wallpaper-media" style={{ opacity: (videoBackground.opacity ?? 100) / 100 }}>
            <Suspense fallback={<div className="wallpaper-image wallpaper-video-poster" style={{ backgroundImage: `url(\"${wallpaper.posterUrl}\")` }} />}>
              <WallpaperVideo src={wallpaper.videoUrl} poster={wallpaper.posterUrl} blur={videoBackground.blur} grayscale={videoBackground.grayscale} reduceMotion={profile!.prefs.reduceMotion} />
            </Suspense>
          </div>
          {!!profile!.background.tint && <div className="wallpaper-tint" style={{ '--mnt-wallpaper-tint': `${profile!.background.tint}%` } as CSSProperties} />}
          <div className="wallpaper-shade" />
          {!!videoBackground.vignette && <div className="wallpaper-vignette" style={{ '--vignette': `${videoBackground.vignette}%` } as CSSProperties} />}
        </div>
      )}
      {/* A visible toolbar with its own settings button replaces the corner entry, so the page never shows two. */}
      {!(profile && profile.widgets.some(widget => widget.type === 'toolbar' && !widget.hidden && (widget.props.actions ?? ['add', 'edit', 'settings']).includes('settings'))) && <header className="mnt-header">
        <button className="settings-button mnt-settings-entry" onClick={() => openSettings()} aria-label={t('settings.open')}><SettingsIcon size={20} strokeWidth={1.5} aria-hidden="true" /> <span>{t('settings.button')}</span></button>
      </header>}
      {editMode && <nav className="edit-toolbar" aria-label={t('edit.toolbar')}>
        <button type="button" onClick={() => setEditing(newShortcut('#b0a092'))}><Plus size={18} aria-hidden="true" />{t('shortcuts.add')}</button>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('mnt:add-group', { cancelable: true }))}><Plus size={18} aria-hidden="true" />{t('groups.add')}</button>
        <button type="button" onClick={() => openSettings('widgets')}><Plus size={18} aria-hidden="true" />{t('edit.addWidget')}</button>
        <button type="button" onClick={() => setEditMode(false)}><Check size={18} aria-hidden="true" />{t('groups.done')}</button>
      </nav>}
      {profile && <Widgets
        profile={profile}
        language={s.language}
        shortcuts={s.shortcuts}
        editing={editMode}
        onboarding={!!profile && !onboardingDismissed && profile.meta.builtinName === 'default-profile' && (onboardingEligible || profile.bookmarks.groups.every(group => group.items.length === 0))}
        {...widgetCallbacks}
        t={t}
        onError={setError}
        onEdit={setEditing}
      />}

      <Suspense fallback={null}>
        {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu)} onClose={closeMenu} returnFocus={menu.focusTarget} />}
        {keyboardHelpOpen && <KeyboardHelp t={t} onClose={() => setKeyboardHelpOpen(false)} />}
      </Suspense>
      {moving && profile && <Suspense fallback={null}><FormDialog title={t('shortcuts.moveDialog')} cancelLabel={t('common.cancel')} submitLabel={t('shortcuts.moveConfirm')} onCancel={() => setMoving(null)} onSubmit={moveShortcut}>
        <label className="stack">{t('groups.moveTo')}<select autoFocus={!!moving.groupId} value={moving.groupId} onChange={event => setMoving({ ...moving, groupId: event.target.value, invalid: false })}>
          {profile.bookmarks.groups.filter(group => !group.items.some(item => item.id === moving.shortcut.id)).map(group => <option key={group.id} value={group.id}>{group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name}</option>)}
          <option value="">{t('groups.newGroupOption')}</option>
        </select></label>
        {!moving.groupId && <label className="stack">{t('groups.newGroupName')}<input autoFocus maxLength={60} value={moving.name} aria-invalid={moving.invalid || undefined} onChange={event => setMoving({ ...moving, name: event.target.value, invalid: false })} /></label>}
        {!moving.groupId && moving.invalid && <small role="alert" className="mnt-form-error">{t('groups.nameRequired')}</small>}
      </FormDialog></Suspense>}
      {undoNotice && <div className="undo-toast" role="status"><span>{t('undo.saved')}</span><button type="button" onClick={undo}>{t('undo.action')}</button></div>}
      {error && <div className="error" role="alert">{t(error.key, error.params)}<button aria-label={t('common.close')} onClick={() => setError(null)}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button></div>}
      <Suspense fallback={null}>{drawer && store && (
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
          onClose={closeDrawer}
          onWallpaperFile={file => void wallpaper.choose(file ? [file] : [])}
          onWallpaperFiles={files => void wallpaper.choose(files)}
          onWallpaperVideoFile={file => void wallpaper.chooseVideo(file)}
          onWallpaperRemove={wallpaper.remove}
          onReset={reset}
          onError={setError}
          wallpaperUrl={wallpaper.url}
        />
      )}
      {editing && <ShortcutEditor key={editing.id} shortcut={editing} isNew={!s.shortcuts.some(item => item.id === editing.id)} t={t} onChange={setEditing} onClose={() => { if (onboardingStep.current === 'add') onboardingStep.current = null; setEditing(null) }} onSave={saveShortcut} onError={key => setError({ key })} />}</Suspense>
    </main>
    </>
  )
}
