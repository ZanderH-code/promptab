import { Database, Image, Info, LayoutGrid, Link, Palette, RotateCcw, Search, SearchX, Blocks, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Settings } from '../../core/model'
import type { ProfileV2 } from '../../core/schema/profile'
import type { MessageKey, MessageRef, Translate } from '../../i18n'
import type { ChangeKind } from '../../store/history'
import type { ProfileStore } from '../../store/profile'
import '../../styles/settings.css'
import { rovingIndex } from './controls'
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
  onWallpaperRemove: () => void
  onReset: () => void
  onError: (error: MessageRef) => void
  /** Tab to open first: a tab name or one of the legacy anchor ids (`wallpaper-settings`, `component-settings`, `search-settings`, `data-settings`). */
  initialSection?: string
}

const ICONS: Record<TabId, LucideIcon> = { appearance: Palette, background: Image, layout: LayoutGrid, widgets: Blocks, shortcuts: Link, search: Search, data: Database, about: Info }
const TAB_LABELS: Record<TabId, MessageKey> = {
  appearance: 'settings.tab.appearance', background: 'settings.tab.background', layout: 'settings.tab.layout', widgets: 'settings.tab.widgets',
  shortcuts: 'settings.tab.shortcuts', search: 'settings.tab.search', data: 'settings.tab.data', about: 'settings.tab.about',
}
const LEGACY_ANCHORS: Record<string, TabId> = { 'wallpaper-settings': 'background', 'component-settings': 'widgets', 'search-settings': 'search', 'data-settings': 'data' }

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

export function SettingsDrawer({ store, settings: s, profile, t, onPatch, onProfileChange, onClose, onWallpaperFile, onWallpaperRemove, onReset, onError, initialSection }: Props) {
  const [tab, setTab] = useState<TabId>(() => initialTab(initialSection))
  const [query, setQuery] = useState('')
  const drawer = useRef<HTMLElement>(null)
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})
  const search = useRef<HTMLInputElement>(null)
  const uid = useId()
  const searching = query.trim() !== ''

  // Focus moves into the drawer on open and returns to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    tabRefs.current[tab]?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follows the legacy anchors when the app asks an open drawer for another section.
  useEffect(() => { if (initialSection) setTab(initialTab(initialSection)) }, [initialSection])

  const ctx: Ctx = {
    t, s, profile, mode: s.theme, store, patch: onPatch, onWallpaperFile, onWallpaperRemove, onReset, onError,
    change: (update, kind) => onProfileChange(update, kind),
  }

  const restore = async (target: ResettableTab) => {
    const fresh = await defaultProfile(s.language)
    onProfileChange(profile => resetSection(profile, fresh, target), 'reset')
  }

  const sections = useMemo(() => {
    const visible = searching ? TABS : [tab]
    return visible.map(id => ({ id, items: itemsFor(id, ctx) }))
    // ctx is rebuilt each render from the props listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, tab, s, profile, t, store])

  const results = searching
    ? sections.map(section => ({
      ...section,
      items: section.items.filter((item: Item) => matches([t(TAB_LABELS[section.id]), ...item.keys.map(key => t(key)), ...(item.words ?? [])].join(' '), query)),
    })).filter(section => section.items.length)
    : sections
  const count = results.reduce((total, section) => total + section.items.length, 0)

  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    const next = rovingIndex(event.key, index, TABS.length)
    if (next === null || event.key === 'ArrowUp' || event.key === 'ArrowDown') return
    event.preventDefault()
    setTab(TABS[next])
    tabRefs.current[TABS[next]]?.focus()
  }

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

  const panelId = `${uid}-panel`
  const body = (id: TabId, items: Item[]) => {
    let group: MessageKey | undefined
    return items.map(item => {
      const heading = item.group && item.group !== group ? <h4 className="sd-group">{t(item.group)}</h4> : null
      group = item.group
      return <div className="sd-item" key={item.id}>{heading}{item.node}</div>
    }).concat(!searching && (RESETTABLE as readonly string[]).includes(id)
      ? [<div className="sd-restore" key="restore"><button type="button" className="sd-button" onClick={() => void restore(id as ResettableTab)}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.restoreSection')}</button></div>]
      : [])
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside ref={drawer} className="drawer sd" role="dialog" aria-label={t('settings.button')} onKeyDown={onDrawerKeyDown}>
        <header className="sd-head">
          <div>
            <small>{t('settings.kicker')}</small>
            <h2>{t('settings.title')}</h2>
          </div>
          <button type="button" className="sd-icon-button" onClick={onClose} aria-label={t('settings.close')}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        </header>
        <div className="sd-search">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input ref={search} type="search" value={query} placeholder={t('settings.find')} aria-label={t('settings.find')} autoComplete="off" onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" className="sd-icon-button" aria-label={t('settings.findClear')} onClick={() => { setQuery(''); search.current?.focus() }}><X size={14} strokeWidth={1.5} aria-hidden="true" /></button>}
        </div>
        {!searching && (
          <div className="sd-tabs" role="tablist" aria-label={t('settings.tabs')}>
            {TABS.map((id, index) => {
              const Icon = ICONS[id]
              return (
                <button
                  key={id} id={`${uid}-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={panelId} tabIndex={tab === id ? 0 : -1}
                  ref={node => { tabRefs.current[id] = node }} onClick={() => setTab(id)} onKeyDown={event => onTabKeyDown(event, index)}
                ><Icon size={16} strokeWidth={1.5} aria-hidden="true" /><span>{t(TAB_LABELS[id])}</span></button>
              )
            })}
          </div>
        )}
        <div className="sd-panel" id={panelId} role={searching ? 'region' : 'tabpanel'} aria-label={searching ? t('settings.findResults') : undefined} aria-labelledby={searching ? undefined : `${uid}-tab-${tab}`}>
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
            <section key={section.id} className="sd-section" aria-labelledby={searching ? `${uid}-h-${section.id}` : undefined}>
              {searching && <h3 id={`${uid}-h-${section.id}`} className="sd-section-title">{t(TAB_LABELS[section.id])}</h3>}
              {body(section.id, section.items)}
            </section>
          ))}
        </div>
      </aside>
    </>
  )
}
