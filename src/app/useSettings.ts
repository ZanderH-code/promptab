import { useCallback, useEffect, useRef, useState } from 'react'
import { defaults, type Settings, type Shortcut } from '../core/model'
import { DEFAULT_LIGHT, darkSurface, lightSurface } from '../core/schema/defaults'
import type { ProfileV2 } from '../core/schema/profile'
import { MessageError, systemLanguage, toMessageRef, type MessageRef } from '../i18n'
import { bootstrap } from '../storage/bootstrap'
import { createAssetLibrary } from '../storage/assets'
import { createChromeStorageBackend, createLocalStorageBackend, createProfileStorage, PROFILE_INDEX_KEY } from '../storage/profiles'
import { extensionApi } from '../platform/extension'
import { createProfileStore } from '../store/profile'
import { readPaintCache, writePaintCache } from './paintCache'
import { cachedImageReference, cachedImageUrl, rememberImageUrl } from './imageUrls'
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

function resolvedLanguage(profile: ProfileV2): Settings['language'] {
  return profile.prefs.language === 'system' ? systemLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]) : profile.prefs.language
}

/** Synchronous paint projection; skips asset reads, so image shortcuts use the automatic icon. */
export function projectPaint(profile: ProfileV2): Settings {
  const widget = (type: string) => profile.widgets.find(item => item.type === type)
  const clock = widget('clock'), date = widget('date'), search = widget('search'), bookmarks = widget('bookmarks')
  const shortcuts = profile.bookmarks.groups.flatMap(group => group.items).map(({ image: _image, ...item }) => item.tile?.image ? { ...item, tile: withoutImage(item.tile) } : item)
  const engine = profile.search.engines.find(item => item.id === profile.search.defaultEngineId)
  const language = resolvedLanguage(profile)
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

function withoutImage<T extends { image?: string }>(value: T): Omit<T, 'image'> {
  const { image: _image, ...rest } = value
  return rest
}

/** Replaces image references with data URLs; returns null when an image has not been read yet. */
function projectCached(profile: ProfileV2): Settings | null {
  const shortcuts: Shortcut[] = []
  for (const stored of profile.bookmarks.groups.flatMap(group => group.items)) {
    // '' means there is no image to look up; undefined means it has not been read.
    const lookup = (reference: string | undefined) => reference ? cachedImageUrl(reference) : ''
    const image = lookup(stored.image), tileImage = lookup(stored.tile?.image)
    if (image === undefined || tileImage === undefined) return null
    shortcuts.push({ ...stored, ...(image ? { image } : {}), ...(tileImage ? { tile: { ...stored.tile, image: tileImage } } : {}) })
  }
  return { ...projectPaint(profile), shortcuts }
}

async function imageUrl(reference: string): Promise<string | undefined> {
  const cached = cachedImageUrl(reference)
  if (cached !== undefined) return cached
  const blob = await assets.get(reference)
  if (!blob) return undefined
  const url = await dataUrl(blob)
  rememberImageUrl(reference, url)
  return url
}

async function project(profile: ProfileV2): Promise<Settings> {
  const shortcuts = await Promise.all(profile.bookmarks.groups.flatMap(group => group.items).map(async (stored): Promise<Shortcut> => {
    let item: Shortcut = stored
    if (item.tile?.image) {
      const url = await imageUrl(item.tile.image)
      // A missing tile image leaves the tile colour, like a missing icon image leaves the automatic icon.
      item = { ...item, tile: url ? { ...item.tile, image: url } : withoutImage(item.tile) }
    }
    if (!item.image) return item
    const url = await imageUrl(item.image)
    // A missing asset degrades to the text/automatic icon instead of blocking the page.
    if (!url) return withoutImage(item)
    return { ...item, image: url }
  }))
  return { ...projectPaint(profile), shortcuts }
}

/**
 * Stores the page's image values (data URLs) as assets before a change is applied. Asset IDs are content
 * hashes, so an image this page loaded maps straight back to its reference without reading the asset.
 */
async function storeImages(shortcuts: Shortcut[] | undefined): Promise<Map<string, string>> {
  const references = new Map<string, string>()
  const values = new Set((shortcuts ?? []).flatMap(item => [item.image, item.tile?.image]).filter((value): value is string => !!value && !value.startsWith('mnt-asset:')))
  await Promise.all([...values].map(async value => {
    let reference = cachedImageReference(value)
    if (!reference) {
      reference = await assets.add(await (await fetch(value)).blob())
      if (value.startsWith('data:')) rememberImageUrl(reference, value)
    }
    references.set(value, reference)
  }))
  return references
}

/** Applies `changes` to `p` in place; `images` comes from storeImages for the same shortcuts. */
function applyChanges(p: ProfileV2, changes: Partial<Settings>, images: Map<string, string>, targetGroupId?: string): ProfileV2 {
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
    const current = projectPaint(p)
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
    const converted = changes.shortcuts.map((item: Shortcut) => {
      const original = originals.get(item.id)
      // Page images become their asset references.
      const stored = (value: string | undefined) => {
        if (!value || value.startsWith('mnt-asset:')) return value || undefined
        const reference = images.get(value)
        if (!reference) throw new Error('Unstored bookmark image')
        return reference
      }
      const image = stored(item.image)
      const tileImage = stored(item.tile?.image)
      const tile = item.tile ? { ...withoutImage(item.tile), ...(tileImage ? { image: tileImage } : {}) } : undefined
      const targetIndex = targetGroupId ? groups.findIndex(group => group.id === targetGroupId) : 0
      return { index: original?.index ?? Math.max(0, targetIndex), item: { ...item, ...(image ? { image } : {}), ...(tile ? { tile } : {}) } }
    })
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
  /** The live (non-preview) profile each shown profile and its settings came from: a shortcut list is based on it. */
  const liveBase = useRef(new WeakMap<object, ProfileV2>())
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
      // Bootstrap already validated the published generation; the store adopts it without reading it again.
      const validated = { revision: snapshot.revision, activeProfileId: snapshot.profiles.activeProfileId, profiles: snapshot.profiles.profiles, history: snapshot.history, archived: snapshot.profiles.archived ?? {} }
      const next = createProfileStore({ persistence, initialProfile: initial, validated, onCommit: writePaintCache, onExternalRefresh: () => setUndoNotice(false) })
      await next.getState().initialize()
      if (!alive) return
      const sync = () => {
        const state = next.getState()
        const preview = state.preview?.profileId === state.activeProfileId && !state.preview.showingOriginal ? state.preview.profile : undefined
        const live = state.profiles[state.activeProfileId]
        const shown = preview ?? live
        if (shown && live) liveBase.current.set(shown, live)
        setProfile(shown)
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
    }).catch(e => { if (alive) { setProfile(null); setSettings(null); setError(toMessageRef(e, 'error.loadSettings')) } })
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
    // Most edits leave the images alone; their URLs are cached, so no asset is read again.
    const live = liveBase.current.get(profile)
    const show = (value: Settings) => { if (live) liveBase.current.set(value, live); setSettings(value) }
    const cached = projectCached(profile)
    if (cached) { show(cached); return }
    let alive = true
    project(profile).then(value => { if (alive) show(value) }).catch(e => { if (alive) setError(toMessageRef(e, 'error.loadSettings')) })
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
  const patch = useCallback((changes: Partial<Settings>, targetGroupId?: string) => {
    // A shortcut list replaces the bookmarks the caller saw (the ones these settings show); anything else
    // applies to the latest profile.
    const base = changes.shortcuts && settings ? liveBase.current.get(settings) : undefined
    const seen = base ? JSON.stringify(base.bookmarks) : undefined
    run(async (s, id) => {
      const images = await storeImages(changes.shortcuts)
      await s.getState().updateProfile(id, current => {
        // Another tab's bookmark change, adopted meanwhile, would be silently dropped by the stale list.
        if (seen !== undefined && JSON.stringify(current.bookmarks) !== seen) throw new MessageError('error.changedInAnotherTab')
        return applyChanges(current, changes, images, targetGroupId)
      })
    })
  }, [run, settings])
  const reset = useCallback(() => run(async (s, id) => {
    const { defaultProfile } = await import('../features/settings/sectionDefaults')
    const fresh = await defaultProfile(resolvedLanguage(s.getState().profiles[id]))
    // The fresh profile keeps this profile's identity and the language the person chose (including "system").
    await s.getState().updateProfile(id, current => ({ ...structuredClone(fresh), meta: { ...current.meta, updatedAt: new Date().toISOString() }, prefs: { ...structuredClone(fresh.prefs), language: current.prefs.language } }), 'reset')
  }), [run])
  const undo = useCallback(() => { setUndoNotice(false); run((s, id) => s.getState().undo(id), false) }, [run])
  return { settings, profile, store, error, setError, patch, reset, undo, undoNotice, run }
}
