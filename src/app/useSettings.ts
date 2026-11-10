import { useCallback, useEffect, useRef, useState } from 'react'
import { defaults, type Settings, type Shortcut } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import { DEFAULT_LIGHT, darkSurface, lightSurface } from '../core/schema/defaults'
import type { ProfileV2 } from '../core/schema/profile'
import { systemLanguage, toMessageRef, type MessageRef } from '../i18n'
import { bootstrap } from '../storage/bootstrap'
import { createAssetLibrary } from '../storage/assets'
import { createChromeStorageBackend, createLocalStorageBackend, createProfileStorage, PROFILE_INDEX_KEY } from '../storage/profiles'
import { extensionApi } from '../platform/extension'
import { createProfileStore } from '../store/profile'
import { readPaintCache, writePaintCache } from './paintCache'
import type { SavedTheme } from '../core/themes/library'

export const assets = createAssetLibrary()
export type AppProfileStore = ReturnType<typeof createProfileStore>

export function createAppProfileStorage() {
  const local = extensionApi()?.storage?.local
  const backend = local ? createChromeStorageBackend(local) : createLocalStorageBackend(localStorage)
  return { backend, persistence: createProfileStorage(backend) }
}

export function createAppThemeLibrary() {
  const backend = createAppProfileStorage().backend
  const library = async () => {
    const { createThemeLibrary } = await import('../core/themes/library')
    return createThemeLibrary(backend)
  }
  return {
    read: async () => (await library()).read(),
    write: async (themes: SavedTheme[]) => (await library()).write(themes),
    save: async (profile: ProfileV2, name: string) => (await library()).save(profile, name),
    rename: async (id: string, name: string) => (await library()).rename(id, name),
    remove: async (id: string) => (await library()).remove(id),
  }
}

async function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image'))
    reader.onerror = () => reject(reader.error)
    reader.onabort = () => reject(new Error('Image read aborted'))
    reader.readAsDataURL(blob)
  })
}

/** Synchronous paint projection; skips asset reads, so image shortcuts use the automatic icon. */
export function projectPaint(profile: ProfileV2): Settings {
  const widget = (type: string) => profile.widgets.find(item => item.type === type)
  const clock = widget('clock'), date = widget('date'), search = widget('search'), bookmarks = widget('bookmarks')
  const shortcuts = profile.bookmarks.groups.flatMap(group => group.items).map(({ image: _image, ...item }) => item)
  const engine = profile.search.engines.find(item => item.id === profile.search.defaultEngineId)
  const language = profile.prefs.language === 'system' ? systemLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]) : profile.prefs.language
  const theme = profile.theme.mode === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : profile.theme.mode
  const areas = profile.layout.areas
  const split = areas.some(row => row.includes('overview') && row.includes('bookmarks'))
  const joined = areas.join(' ')
  // Split rows read left to right: bookmarks first is the default, overview first is reversed.
  const reverse = split
    ? areas.some(row => row.includes('overview') && row.indexOf('overview') < row.indexOf('bookmarks'))
    : joined.includes('bookmarks') && joined.includes('overview') && joined.indexOf('bookmarks') < joined.indexOf('overview')
  const palette = theme === 'light' && profile.theme.colorLight ? profile.theme.colorLight : profile.theme.color
  return { ...defaults, language, theme, accent: palette.accent, background: palette.bg,
    showClock: !!clock && !clock.hidden, showDate: !!date && !date.hidden, showSearch: !!search && !search.hidden,
    hour12: clock?.type === 'clock' && typeof clock.props.hour12 === 'boolean' ? clock.props.hour12 : defaults.hour12,
    searchTemplate: engine?.template ?? defaults.searchTemplate, shortcuts, columns: bookmarks?.type === 'bookmarks' && typeof bookmarks.props.maxColumns === 'number' ? bookmarks.props.maxColumns : defaults.columns,
    iconSize: profile.theme.iconSize, iconShape: profile.theme.iconShape,
    alignment: profile.layout.align.endsWith('left') ? 'left' : 'center', layout: split ? 'split' : 'stacked',
    reverse,
    overlay: profile.background.dim,
  }
}

async function project(profile: ProfileV2): Promise<Settings> {
  const shortcuts = await Promise.all(profile.bookmarks.groups.flatMap(group => group.items).map(async item => {
    if (!item.image) return item
    const blob = await assets.get(item.image)
    // A missing asset degrades to the text/automatic icon instead of blocking the page.
    if (!blob) { const { image: _missing, ...rest } = item; return rest }
    return { ...item, image: await dataUrl(blob) }
  }))
  return { ...projectPaint(profile), shortcuts }
}

async function applyChanges(profile: ProfileV2, changes: Partial<Settings>, targetGroupId?: string): Promise<ProfileV2> {
  const p = structuredClone(profile)
  p.meta.updatedAt = new Date().toISOString()
  if (changes.language !== undefined) p.prefs.language = changes.language
  if (changes.theme !== undefined) p.theme.mode = changes.theme
  const mode = changes.theme ?? p.theme.mode
  const light = mode === 'light' || (mode === 'system' && matchMedia('(prefers-color-scheme: light)').matches)
  // Light edits go to colorLight so the dark palette is never overwritten.
  const palette = () => light ? (p.theme.colorLight ??= { ...p.theme.color, ...DEFAULT_LIGHT }) : p.theme.color
  if (changes.accent !== undefined) palette().accent = changes.accent
  if (changes.background !== undefined) { const colors = palette(); colors.bg = changes.background; colors.surface = light ? lightSurface(changes.background) : darkSurface(changes.background, colors.text); if (!light && p.background.type === 'color') p.background.color = changes.background }
  if (changes.iconSize !== undefined) p.theme.iconSize = changes.iconSize
  if (changes.iconShape !== undefined) p.theme.iconShape = changes.iconShape
  if (changes.alignment !== undefined) p.layout.align = changes.alignment === 'left' ? 'center-left' : 'center-center'
  const widget = <T extends 'clock' | 'date' | 'search' | 'bookmarks'>(type: T) => {
    let item = p.widgets.find(w => w.type === type)
    if (!item) { const created = { id: crypto.randomUUID(), type, area: type === 'bookmarks' ? 'bookmarks' : 'overview', order: p.widgets.length, props: {} } as ProfileV2['widgets'][number]; p.widgets.push(created); item = created }
    return item as Extract<ProfileV2['widgets'][number], { type: T }>
  }
  if (changes.showClock !== undefined) widget('clock').hidden = !changes.showClock
  if (changes.showDate !== undefined) widget('date').hidden = !changes.showDate
  if (changes.showSearch !== undefined) widget('search').hidden = !changes.showSearch
  if (changes.hour12 !== undefined) widget('clock').props.hour12 = changes.hour12
  if (changes.columns !== undefined) widget('bookmarks').props.maxColumns = changes.columns
  if (changes.layout !== undefined || changes.reverse !== undefined) {
    const current = await project(profile)
    const layout = changes.layout ?? current.layout, reverse = changes.reverse ?? current.reverse
    const stacked = reverse ? ['bookmarks', 'overview'] : ['overview', 'bookmarks']
    p.layout.areas = layout === 'split' ? [reverse ? 'overview bookmarks' : 'bookmarks overview'] : stacked
    if (layout === 'split') p.layout.columns = ['minmax(0, 1fr)', 'minmax(280px, 0.7fr)']
    else delete p.layout.columns
    p.layout.breakpoints = { ...p.layout.breakpoints, narrow: { areas: stacked, columns: ['1fr'] } }
  }
  if (changes.searchTemplate !== undefined) {
    const engine = p.search.engines.find(item => item.id === p.search.defaultEngineId)
    if (engine) {
      engine.template = changes.searchTemplate
      delete engine.builtinName
    }
    else { const id = crypto.randomUUID(); p.search.engines.push({ id, name: 'Search', template: changes.searchTemplate }); p.search.defaultEngineId = id }
  }
  if (changes.overlay !== undefined) p.background.dim = changes.overlay
  if (changes.shortcuts !== undefined) {
    const groups = p.bookmarks.groups
    if (!groups.length) groups.push({ id: crypto.randomUUID(), name: 'Bookmarks', collapsed: false, items: [] })
    const originals = new Map(groups.flatMap((group, index) => group.items.map(item => [item.id, { item, index }] as const)))
    const converted = await Promise.all(changes.shortcuts.map(async (item: Shortcut) => {
      const original = originals.get(item.id)
      let image: string | undefined
      if (item.image) {
        if (original?.item.image) {
          const blob = await assets.get(original.item.image)
          if (!blob) throw new Error('Missing bookmark image')
          if (await dataUrl(blob) === item.image) image = original.item.image
        }
        if (!image) image = await assets.add(await (await fetch(item.image)).blob())
      }
      const targetIndex = targetGroupId ? groups.findIndex(group => group.id === targetGroupId) : 0
      return { index: original?.index ?? Math.max(0, targetIndex), item: { ...item, ...(image ? { image } : {}) } }
    }))
    const existing = converted.filter(entry => originals.has(entry.item.id))
    if (existing.some((entry, i) => i > 0 && entry.index < existing[i - 1].index)) throw new Error('Cannot reorder bookmarks across groups')
    groups.forEach((group, index) => { group.items = converted.filter(entry => entry.index === index).map(entry => entry.item) })
  }
  return p
}

// Read once at module init so the first render can paint the last committed profile.
const cachedPaint = readPaintCache()
let initialProfile: ProfileV2 | null = null
let initialSettings: Settings | null = null
if (cachedPaint) {
  try { initialProfile = cachedPaint.profile; initialSettings = projectPaint(cachedPaint.profile) } catch { /* Ignore an unusable cache. */ }
}

export function useSettings() {
  const [store, setStore] = useState<AppProfileStore | null>(null)
  const [profile, setProfile] = useState<ProfileV2 | null>(initialProfile)
  const [settings, setSettings] = useState<Settings | null>(initialSettings)
  const [error, setError] = useState<MessageRef | null>(null)
  const [undoNotice, setUndoNotice] = useState(false)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    let alive = true
    let unsubscribe = () => {}
    let removeExternal = () => {}
    const { backend, persistence } = createAppProfileStorage()
    // One session per page, never closed: it blocks asset collection in other tabs while this one holds live state.
    // It must be open before bootstrap so assets staged by migration are protected.
    Promise.resolve().then(() => assets.openSession({ profiles: persistence }))
      .then(session => { if (session.collection.status === 'failed' || ('missing' in session.collection && session.collection.missing.length)) console.warn('Asset collection', session.collection) })
      .catch(error => console.warn('Asset session unavailable', error))
      .then(() => bootstrap({ backend, profiles: persistence, assets, defaultSettings: __WEB_BUILD__ ? { ...defaults, language: 'en' } : defaults })).then(async snapshot => {
      const initial = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
      const next = createProfileStore({ persistence, initialProfile: initial, onCommit: writePaintCache, onExternalRefresh: () => setUndoNotice(false) })
      await next.getState().initialize()
      if (!alive) return
      const sync = () => {
        const state = next.getState()
        const preview = state.preview?.profileId === state.activeProfileId && !state.preview.showingOriginal ? state.preview.profile : undefined
        setProfile(preview ?? state.profiles[state.activeProfileId])
      }
      unsubscribe = next.subscribe(sync); sync(); setStore(next)
      const refresh = () => { void next.getState().refresh().catch(error => console.warn('Profile refresh failed', error)) }
      const onStorage = (event: StorageEvent) => { if (event.key === PROFILE_INDEX_KEY) refresh() }
      const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
      const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && PROFILE_INDEX_KEY in changes) refresh() }
      const onChanged = extensionApi()?.storage?.onChanged
      window.addEventListener('storage', onStorage)
      document.addEventListener('visibilitychange', onVisibility)
      onChanged?.addListener(changed)
      removeExternal = () => {
        window.removeEventListener('storage', onStorage)
        document.removeEventListener('visibilitychange', onVisibility)
        onChanged?.removeListener(changed)
      }
    }).catch(e => { if (alive) setError(toMessageRef(e, 'error.loadSettings')) })
    return () => { alive = false; unsubscribe(); removeExternal(); clearTimeout(timer.current) }
  }, [])
  const [scheme, setScheme] = useState(0)
  const followSystem = profile?.theme.mode === 'system'
  useEffect(() => {
    if (!followSystem) return
    const query = matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setScheme(value => value + 1)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [followSystem])
  useEffect(() => {
    if (!profile) return
    let alive = true
    project(profile).then(value => { if (alive) setSettings(value) }).catch(e => { if (alive) { setSettings(current => current ?? null); setError(toMessageRef(e, 'error.loadSettings')) } })
    return () => { alive = false }
  }, [profile, scheme])
  const run = useCallback((operation: (store: AppProfileStore, id: string) => Promise<void>, notice = true) => {
    if (!store) return
    const id = store.getState().activeProfileId
    const task = queue.current.then(() => operation(store, id)).then(() => {
      if (notice) { setUndoNotice(true); clearTimeout(timer.current); timer.current = setTimeout(() => setUndoNotice(false), 6000) }
    }).catch(e => { console.error(e); setError(toMessageRef(e, 'error.saveSettings')) })
    queue.current = task
  }, [store])
  const patch = useCallback((changes: Partial<Settings>, targetGroupId?: string) => run(async (s, id) => {
    const p = await applyChanges(s.getState().profiles[id], changes, targetGroupId)
    await s.getState().updateProfile(id, () => p)
  }), [run])
  const reset = useCallback(() => run(async (s, id) => {
    const old = s.getState().profiles[id]
    const now = new Date().toISOString()
    const fresh = await migrateV1(defaults, { id: () => id, now: () => now, add: blob => assets.add(blob) })
    fresh.meta = { ...old.meta, updatedAt: now }
    await s.getState().resetProfile(id, fresh)
  }), [run])
  const undo = useCallback(() => { setUndoNotice(false); run((s, id) => s.getState().undo(id), false) }, [run])
  return { settings, profile, store, error, setError, patch, reset, undo, undoNotice, run }
}
