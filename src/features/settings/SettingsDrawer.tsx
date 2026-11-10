import { Braces, ChevronLeft, Database, Eye, Sparkles, Image, Info, LayoutGrid, Link, Palette, RotateCcw, Search, SearchX, Blocks, X, type LucideIcon } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../core/model'
import type { ProfileV2 } from '../../core/schema/profile'
import type { MessageKey, MessageRef, Translate } from '../../i18n'
import type { ChangeKind } from '../../store/history'
import type { ProfileStore } from '../../store/profile'
import '../../styles/settings.css'
import { SearchTermsContext } from './searchHighlight'
import { useConfirm } from './ConfirmDialog'
import { TABS, itemsFor, type Ctx, type Item, type TabId } from './rows'
import { RESETTABLE, defaultProfile, resetSection, type ResettableTab } from './sectionDefaults'

type Props = {
  store: StoreApi<ProfileStore>
  settings: Settings
  /** The active profile, including the v2 fields the legacy `settings` projection lacks. */
  profile: ProfileV2
  t: Translate
  onPatch: (changes: Partial<Settings>) => void
  /** Applies an edit to the active profile (one undoable change). */
  onProfileChange: (update: (profile: ProfileV2) => ProfileV2, kind?: ChangeKind) => void
  onClose: () => void
  onWallpaperFile: (file?: File) => void
  onWallpaperFiles: (files: File[]) => void
  onWallpaperVideoFile: (file?: File) => void
  onWallpaperRemove: () => void
  onReset: () => void
  onError: (error: MessageRef) => void
  /** The loaded wallpaper image, used by the focal-point preview; empty when no asset is available. */
  wallpaperUrl?: string
  /** Tab to open first: a tab name or one of the legacy anchor ids (`wallpaper-settings`, `component-settings`, `search-settings`, `data-settings`). */
  initialSection?: string
  /** Safe mode is on: custom CSS is paused for this page. */
  safeMode?: boolean
  /** Commits the running AI preview to the active profile. */
  onApplyPreview?: () => void
  onEnterEditMode?: () => void
}

const ICONS: Record<TabId, LucideIcon> = { appearance: Palette, background: Image, layout: LayoutGrid, widgets: Blocks, shortcuts: Link, search: Search, style: Braces, ai: Sparkles, data: Database, about: Info }
const TAB_LABELS: Record<TabId, MessageKey> = {
  appearance: 'settings.tab.appearance', background: 'settings.tab.background', layout: 'settings.tab.layout', widgets: 'settings.tab.widgets',
  shortcuts: 'settings.tab.shortcuts', search: 'settings.tab.search', style: 'settings.tab.style', ai: 'settings.tab.ai', data: 'settings.tab.data', about: 'settings.tab.about',
}
const SECTION_DESC: Record<TabId, MessageKey> = {
  appearance: 'settings.desc.appearance', background: 'settings.desc.background', layout: 'settings.desc.layout', widgets: 'settings.desc.widgets',
  shortcuts: 'settings.desc.shortcuts', search: 'settings.desc.search', style: 'settings.desc.style', ai: 'settings.desc.ai', data: 'settings.desc.data', about: 'settings.desc.about',
}
const RAIL_GROUPS: { label: MessageKey; tabs: TabId[] }[] = [
  { label: 'settings.group.look', tabs: ['appearance', 'background'] },
  { label: 'settings.group.layout', tabs: ['layout', 'widgets'] },
  { label: 'settings.group.content', tabs: ['shortcuts', 'search'] },
  { label: 'settings.group.advanced', tabs: ['style', 'ai'] },
  { label: 'settings.group.system', tabs: ['data', 'about'] },
]
const LEGACY_ANCHORS: Record<string, TabId> = { 'wallpaper-settings': 'background', 'component-settings': 'widgets', 'search-settings': 'search', 'data-settings': 'data' }

/** Peeking is a desktop-only affordance: the scrim becomes transparent from this width up. */
const WIDE_QUERY = '(min-width: 1024px)'
const subscribeWide = (onChange: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isWide = () => typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches

/** The rail is horizontal at the same width where the CSS flips it; its arrow keys must match. */
const COMPACT_QUERY = '(max-width: 640px)'
const subscribeCompact = (onChange: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(COMPACT_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isCompact = () => typeof window.matchMedia === 'function' && window.matchMedia(COMPACT_QUERY).matches

export function initialTab(section?: string): TabId {
  if (!section) return 'appearance'
  if ((TABS as readonly string[]).includes(section)) return section as TabId
  return LEGACY_ANCHORS[section] ?? 'appearance'
}

/** Every term must appear in the haystack of localized labels, option names and the section name. */
export function matches(haystack: string, query: string): boolean {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const text = haystack.toLocaleLowerCase()
  return terms.every(term => text.includes(term))
}

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function SettingsDrawer({ store, settings: s, profile, t, onPatch, onProfileChange, onClose, onWallpaperFile, onWallpaperFiles, onWallpaperVideoFile, onWallpaperRemove, onReset, onError, wallpaperUrl, initialSection, safeMode = false, onApplyPreview = () => {}, onEnterEditMode = () => {} }: Props) {
  const [tab, setTab] = useState<TabId>(() => initialTab(initialSection))
  const [query, setQuery] = useState('')
  const [layoutDrafts, setLayoutDrafts] = useState<NonNullable<Ctx['layoutDrafts']>>({})
  const [movedWidgets, setMovedWidgets] = useState<string[]>([])
  const [widgetCards, setWidgetCards] = useState<Record<string, boolean>>({})
  const [defaultsProfile, setDefaultsProfile] = useState<ProfileV2 | null>(null)
  const gridSignature = (value: ProfileV2) => JSON.stringify([value.meta.id, value.layout.areas, value.layout.columns, value.layout.rows, value.layout.breakpoints])
  const currentGrid = gridSignature(profile)
  const previousGrid = useRef(currentGrid)
  const ownGrid = useRef<string | null>(null)
  useEffect(() => {
    if (previousGrid.current !== currentGrid) {
      if (ownGrid.current !== currentGrid) { setLayoutDrafts({}); setMovedWidgets([]) }
      previousGrid.current = currentGrid
      ownGrid.current = null
    }
  }, [currentGrid])
  const drawer = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const peekButton = useRef<HTMLButtonElement>(null)
  const peekHandle = useRef<HTMLButtonElement>(null)
  const uid = useId()
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false)
  const compact = useSyncExternalStore(subscribeCompact, isCompact, () => false)
  const [peeked, setPeeked] = useState(false)
  const { confirm, dialog } = useConfirm()
  const searching = query.trim() !== ''
  const terms = useMemo(() => query.toLocaleLowerCase().split(/\s+/).filter(Boolean), [query])
  /** Why an item matched when no query term is in its visible labels: the hidden words or the section name. */
  const matchReason = (item: Item, section: TabId) => {
    const keyText = item.keys.map(key => t(key)).join(' ').toLocaleLowerCase()
    if (terms.some(term => keyText.includes(term))) return []
    const words = (item.words ?? []).filter(word => terms.some(term => word.toLocaleLowerCase().includes(term)))
    if (words.length) return words
    const sectionName = t(TAB_LABELS[section])
    return terms.some(term => sectionName.toLocaleLowerCase().includes(term)) ? [sectionName] : []
  }

  // Rows compare against the default profile, so it loads once per language.
  useEffect(() => {
    let live = true
    void defaultProfile(s.language).then(profile => { if (live) setDefaultsProfile(profile) })
    return () => { live = false }
  }, [s.language])

  // Focus moves into the drawer on open and returns to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    drawer.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A newly selected section starts at the top instead of inheriting the previous section's offset.
  useLayoutEffect(() => { if (panel.current) panel.current.scrollTop = 0 }, [tab])

  // Follows the legacy anchors when the app asks an open drawer for another section.
  useEffect(() => { if (initialSection) setTab(initialTab(initialSection)) }, [initialSection])
  // The rail unmounts while searching; when it comes back, the selected item may be off-screen in the
  // horizontal mobile rail, so bring it into view again.
  useEffect(() => {
    if (searching) return
    const rail = drawer.current?.querySelector<HTMLElement>('.sd-rail')
    const active = rail?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return
    const left = active.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft
    rail.scrollLeft = Math.max(0, left - 8)
  }, [searching, tab])

  // Peeking is desktop-only; shrinking the window restores the panel.
  useEffect(() => { if (!wide && peeked) setPeeked(false) }, [wide, peeked])
  // Esc restores a peeked panel even though the drawer itself is off-screen.
  useEffect(() => {
    if (!peeked) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      setPeeked(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [peeked])
  // Moving between the panel and its edge handle keeps the keyboard on the visible affordance.
  const wasPeeked = useRef(false)
  useEffect(() => {
    if (peeked) peekHandle.current?.focus()
    else if (wasPeeked.current) peekButton.current?.focus()
    wasPeeked.current = peeked
  }, [peeked])

  const ctx: Ctx = {
    t, s, searching, wallpaperUrl, profile, mode: s.theme, store, patch: onPatch, onWallpaperFile, onWallpaperFiles, onWallpaperVideoFile, onWallpaperRemove, onReset, onError, safe: safeMode, onApplyPreview,
    change: (update, kind) => onProfileChange(update, kind),
    layoutDrafts, onLayoutDraftsChange: setLayoutDrafts, onGridCommit: value => { ownGrid.current = gridSignature(value) }, movedWidgets, onMovedWidgets: setMovedWidgets, widgetCards, onWidgetCardsChange: setWidgetCards, defaults: defaultsProfile, onEnterEditMode,
  }

  const restore = async (target: ResettableTab) => {
    const accepted = await confirm({
      title: t('settings.restoreSection'),
      body: t('settings.restoreScope', { section: t(TAB_LABELS[target]) }),
      confirmLabel: t('settings.restoreSection'),
      cancelLabel: t('common.cancel'),
    })
    if (!accepted) return
    const fresh = await defaultProfile(s.language)
    onProfileChange(profile => resetSection(profile, fresh, target), 'reset')
  }

  const sections = useMemo(() => {
    const visible = searching ? TABS : [tab]
    return visible.map(id => ({ id, items: itemsFor(id, ctx) }))
    // ctx is rebuilt each render from the props listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, tab, s, profile, t, store, layoutDrafts, movedWidgets, widgetCards, defaultsProfile])

  const results = searching
    ? sections.map(section => ({
      ...section,
      items: section.items.filter((item: Item) => matches([t(TAB_LABELS[section.id]), ...item.keys.map(key => t(key)), ...(item.words ?? [])].join(' '), query)),
    })).filter(section => section.items.length)
    : sections
  const count = results.reduce((total, section) => total + section.items.length, 0)

  // Only keys pressed inside the drawer are handled: a shortcut editor opened from the page, or a select popup, keeps its own keys.
  const onDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const root = drawer.current
    if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return
    if (event.key === 'Escape' && !event.defaultPrevented) {
      if (event.target instanceof HTMLInputElement && event.target.type === 'search' && event.target.value) { setQuery(''); return }
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.offsetParent !== null || element === document.activeElement)
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const body = (id: TabId, items: Item[]) => {
    let group: MessageKey | undefined
    return items.map(item => {
      const GroupHeading = searching ? 'h4' : 'h3'
      const heading = item.group && item.group !== group ? <GroupHeading className="sd-group">{t(item.group)}</GroupHeading> : null
      group = item.group
      const reason = searching ? matchReason(item, id) : []
      return <div className="sd-item" key={item.id}>{heading}{reason.length > 0 && <p className="sd-matches">{t('settings.findMatches', { terms: reason.join(', ') })}</p>}{item.node}</div>
    })
  }

  return (
    <>
      <div className="scrim sd-scrim" onClick={onClose} />
      <aside ref={drawer} className={`drawer sd${peeked ? ' sd-peeked' : ''}`} role="dialog" aria-label={t('settings.button')} onKeyDown={onDrawerKeyDown}>
        <header className="sd-head">
          <div>
            <small>{t('settings.kicker')}</small>
            <h2>{t('settings.title')}</h2>
          </div>
          <div className="sd-head-actions">
            {wide && <button ref={peekButton} type="button" className="sd-button sd-peek" onClick={() => setPeeked(true)}><Eye size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.peek')}</button>}
            <button type="button" className="sd-button" onClick={onEnterEditMode}>{t('edit.enter')}</button>
            <button type="button" className="sd-icon-button" onClick={onClose} aria-label={t('settings.close')}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="sd-search">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input ref={search} type="search" value={query} placeholder={t('settings.find')} aria-label={t('settings.find')} autoComplete="off" onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" className="sd-icon-button" aria-label={t('settings.findClear')} onClick={() => { setQuery(''); search.current?.focus() }}><X size={14} strokeWidth={1.5} aria-hidden="true" /></button>}
        </div>
        <Tabs.Root value={tab} onValueChange={value => setTab(value as TabId)} orientation={compact ? 'horizontal' : 'vertical'} className="sd-body">
          {!searching && (
            <Tabs.List className="sd-rail" aria-label={t('settings.tabs')}>
              {RAIL_GROUPS.map(group => (
                <div className="sd-rail-group" key={group.label}>
                  <p className="sd-rail-title">{t(group.label)}</p>
                  {group.tabs.map(id => {
                    const Icon = ICONS[id]
                    return (
                      <Tabs.Trigger key={id} value={id} className="sd-rail-tab" onClick={() => setTab(id)}>
                        <Icon size={16} strokeWidth={1.5} aria-hidden="true" /><span>{t(TAB_LABELS[id])}</span>
                      </Tabs.Trigger>
                    )
                  })}
                </div>
              ))}
            </Tabs.List>
          )}
          {searching ? (
            <div className="sd-panel" role="region" aria-label={t('settings.findResults')}>
              <SearchTermsContext.Provider value={terms}>
                {searching && <p className="sd-count" role="status">{count ? t('settings.findCount', { count }) : ''}</p>}
                {searching && count === 0 && (
                  <div className="sd-empty">
                    <SearchX size={24} strokeWidth={1.5} aria-hidden="true" />
                    <p>{t('settings.findNone', { query: query.trim() })}</p>
                    <small>{t('settings.findNoneHint')}</small>
                    <button type="button" className="sd-button" onClick={() => { setQuery(''); search.current?.focus() }}>{t('settings.findClear')}</button>
                  </div>
                )}
                {results.map(section => (
                  <section key={section.id} className="sd-section" aria-labelledby={`${uid}-h-${section.id}`}>
                    <h3 id={`${uid}-h-${section.id}`} className="sd-section-title">{t(TAB_LABELS[section.id])}</h3>
                    {body(section.id, section.items)}
                  </section>
                ))}
              </SearchTermsContext.Provider>
            </div>
          ) : (
            <Tabs.Content ref={panel} value={tab} className="sd-panel">
              <header className="sd-section-head">
                <div>
                  <h3 className="sd-section-title">{t(TAB_LABELS[tab])}</h3>
                  <p className="sd-section-desc">{t(SECTION_DESC[tab])}</p>
                </div>
                {(RESETTABLE as readonly string[]).includes(tab) && (
                  <button type="button" className="sd-button" onClick={() => void restore(tab as ResettableTab)}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.restoreSection')}</button>
                )}
              </header>
              {results.map(section => (
                <section key={section.id} className="sd-section">
                  {body(section.id, section.items)}
                </section>
              ))}
            </Tabs.Content>
          )}
        </Tabs.Root>
      </aside>
      {dialog}
      {peeked && (
        <button ref={peekHandle} type="button" className="sd-peek-handle" aria-label={t('settings.peekRestore')} title={t('settings.peekRestore')} onClick={() => setPeeked(false)}>
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('settings.peekRestore')}</span>
        </button>
      )}
    </>
  )
}
