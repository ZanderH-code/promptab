import { Settings as SettingsIcon } from 'lucide-react'
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { ProfileV2, Widget } from '../core/schema/profile'
import type { Settings, Shortcut } from '../core/model'
import type { MessageRef, Translate } from '../i18n'
import { widgetsIn } from '../core/layout/grid'
import { detectTemplate } from '../core/layout/profile'
import { BREAKPOINTS } from '../core/schema/defaults'
import { gridStyle, areaStyle } from '../core/layout/styles'
import { clockTokens, dateTokens, formatGreetingTransition, greetingPeriod, type TextToken } from '../core/layout/formats'
import { Search } from './Search'
import type { OnboardingAction } from './OnboardingCard'
import { ShortcutGrid } from './ShortcutGrid'
import type { ContextMenuEvent } from './ShortcutGridContent'
import type { WidgetUpdate } from './ProductivityWidgets'
const WeatherWidget = lazy(() => import('./WeatherWidget').then(module => ({ default: module.WeatherWidget })))
const ProductivityWidgetView = lazy(() => import('./ProductivityWidgets').then(module => ({ default: module.ProductivityWidgetView })))

type Props = { profile: ProfileV2; language: Settings['language']; shortcuts: Settings['shortcuts']; editing: boolean; onboarding: boolean; onOnboardingAction: (action: OnboardingAction) => void; t: Translate; onError: (error: MessageRef) => void; onContextMenu: (event: ContextMenuEvent) => void; onGroups: (update: (groups: ProfileV2['bookmarks']['groups']) => ProfileV2['bookmarks']['groups']) => void; onGroupContextMenu: (event: ContextMenuEvent, group: ProfileV2['bookmarks']['groups'][number]) => void; onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onMove: (shortcut: Shortcut) => void; onAdd: (groupId?: string) => void; onBookmarkContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void; onOpenSettings: (section?: string) => void; onEnterEditMode: () => void; onWidgetChange: WidgetUpdate; onAccent?: (accent: string) => void; onOpenAll?: (group: ProfileV2['bookmarks']['groups'][number]) => void }

function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'wide' as const
    return window.matchMedia(`(max-width: ${BREAKPOINTS.narrowMax}px)`).matches ? 'narrow' as const : window.matchMedia(`(max-width: ${BREAKPOINTS.mediumMax}px)`).matches ? 'medium' as const : 'wide' as const
  })
  useEffect(() => {
    const queries = [['narrow', window.matchMedia(`(max-width: ${BREAKPOINTS.narrowMax}px)`)], ['medium', window.matchMedia(`(min-width: ${BREAKPOINTS.narrowMax + 1}px) and (max-width: ${BREAKPOINTS.mediumMax}px)`)] ] as const
    const update = () => setBreakpoint(queries[0][1].matches ? 'narrow' : queries[1][1].matches ? 'medium' : 'wide')
    queries.forEach(([, query]) => query.addEventListener('change', update))
    return () => queries.forEach(([, query]) => query.removeEventListener('change', update))
  }, [])
  return breakpoint
}

function useNow(precision: 'second' | 'minute') {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const interval = precision === 'second' ? 1000 : 60_000
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, interval - (Date.now() % interval))
    }
    timer = window.setTimeout(tick, interval - (Date.now() % interval))
    return () => window.clearTimeout(timer)
  }, [precision])
  return now
}

/** Clock and date text as styleable runs: `.mnt-<kind>-part` per value and `.mnt-<kind>-separator` between them. */
/** Filled Material Design icons (Apache-2.0) for the joined-button toolbar. */
const FILLED = {
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.47.47 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
} as const

const tokenClass = {
  clock: { part: 'mnt-clock-part', separator: 'mnt-clock-separator' },
  date: { part: 'mnt-date-part', separator: 'mnt-date-separator' },
} as const

function Tokens({ tokens, kind }: { tokens: TextToken[]; kind: 'clock' | 'date' }) {
  return <>{tokens.map((token, index) => <span key={index} className={tokenClass[kind][token.kind]} data-part={token.part}>{token.text}</span>)}</>
}

function ClockBlock({ widget, language, onContextMenu, theme, custom, t }: { widget: Extract<Widget, {type:'clock'}>; language: Settings['language']; onContextMenu: (event: ContextMenuEvent) => void; theme: ProfileV2['theme']; custom: ProfileV2['custom']; t: Translate }) {
  const p = widget.props
  const now = useNow(p.seconds ? 'second' : 'minute')
  const tokens = clockTokens(now, language, p)
  const formatted = tokens.map(token => token.text).join('')
  const clock = useRef<HTMLDivElement>(null)
  const refit = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const container = clock.current
    const text = container?.firstElementChild as HTMLElement | null
    if (!container || !text) return
    let disposed = false
    const fit = () => {
      if (disposed) return
      text.style.fontSize = ''
      const available = container.getBoundingClientRect().width
      if (!available || text.getBoundingClientRect().width <= available) return
      const original = parseFloat(getComputedStyle(container).fontSize)
      let low = 0, high = original
      for (let i = 0; i < 12; i++) {
        const size = (low + high) / 2
        text.style.fontSize = `${size}px`
        if (text.getBoundingClientRect().width <= available) low = size
        else high = size
      }
      text.style.fontSize = `${low}px`
    }
    refit.current = fit
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    document.fonts.addEventListener('loadingdone', fit)
    void document.fonts.ready.then(fit)
    return () => { disposed = true; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fit); refit.current = () => {} }
  }, [])
  useLayoutEffect(() => { refit.current() }, [formatted, p])
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => refit.current())
    return () => cancelAnimationFrame(frame)
  }, [theme, custom])
  return <div className="intro" onContextMenu={onContextMenu}>{p.eyebrow === true && <div className="eyebrow"><span className="dot" /> {t('clock.eyebrow')}</div>}<div ref={clock} className="clock mnt-clock" data-separator-accent={p.separatorAccent ? '' : undefined}><span style={{ whiteSpace: 'nowrap' }}><Tokens tokens={tokens} kind="clock" /></span></div></div>
}

function DateBlock({ widget, language }: { widget: Extract<Widget, {type:'date'}>; language: Settings['language'] }) {
  const p = widget.props, now = useNow('minute')
  return <div className="date mnt-date" data-separator-accent={p.separatorAccent ? '' : undefined}><Tokens tokens={dateTokens(now, language, p)} kind="date" /></div>
}

/** Owns the minute tick, so only the greeting re-renders each minute, not the layout and every tile. */
function Greeting({ name, transitional, language, t }: { name?: string; transitional?: boolean; language: Settings['language']; t: Translate }) {
  const now = useNow('minute')
  const greeting = t(`greeting.${greetingPeriod(now.getHours())}` as 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening')
  return <div>{name ? <span data-user-content>{t('greeting.withName', { greeting, name })}</span> : greeting}{transitional && <div>{formatGreetingTransition(now, language)}</div>}</div>
}

/** A find query that matches no website still says so and can be cleared from the bookmarks area. */
function FindEmpty({ query, t, onClear }: { query: string; t: Translate; onClear: () => void }) {
  return <p className="mnt-find-empty"><span role="status">{t('search.findNone', { query })}</span><button type="button" onClick={onClear}>{t('search.findClear')}</button></p>
}

export function ProfileWidgets(props: Props) {
  const { profile, language, shortcuts, editing, onboarding, t } = props
  const breakpoint = useBreakpoint()
  const grid = breakpoint === 'wide' ? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows } : profile.layout.breakpoints?.[breakpoint] ?? (breakpoint === 'narrow' ? profile.layout.breakpoints?.medium : undefined) ?? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows }
  const names = [...new Set(grid.areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))]
  const palette = profile.theme.color
  const searchEngine = profile.search.engines.find(e => e.id === profile.search.defaultEngineId)
  const searchTemplate = searchEngine?.template ?? 'https://www.google.com/search?q={query}'
  const [find, setFind] = useState('')
  // Edit mode hides the filter; clear the text too so the box and the grid agree again after editing.
  useEffect(() => { if (editing) setFind('') }, [editing])
  const clearFind = () => { setFind(''); document.querySelector<HTMLInputElement>('.mnt-search-input')?.focus() }
  const findText = editing ? '' : find
  const query = findText.trim().toLowerCase()
  const matches = (item: { name: string; url: string }) => item.name.toLowerCase().includes(query) || item.url.toLowerCase().includes(query)
  const groups = query ? profile.bookmarks.groups.map(group => ({ ...group, collapsed: false, items: group.items.filter(matches) })).filter(group => group.items.length) : profile.bookmarks.groups
  const findsBookmarks = profile.widgets.some(widget => widget.type === 'bookmarks' && !widget.hidden)
  const toolbar = (widget: Extract<Widget, { type: 'toolbar' }>) => {
    const buttons = widget.props.style === 'buttons'
    const icon = (path: keyof typeof FILLED, fallback: ReactNode) => buttons ? <svg viewBox="0 0 24 24" width="1em" height="1em"><path fill="currentColor" d={FILLED[path]} /></svg> : fallback
    return <div className="mnt-widget-toolbar" role="toolbar" aria-label={t('widgets.toolbar')} data-toolbar-style={buttons ? 'buttons' : undefined}>
      {(widget.props.actions ?? ['add', 'edit', 'settings']).map(action => action === 'accent'
        ? <label key={action} className="mnt-toolbar-accent" title={t('toolbar.accent')}><input type="color" className="visually-hidden" aria-label={t('toolbar.accent')} value={palette.accent} onChange={event => props.onAccent?.(event.target.value)} /><span className="mnt-accent-dot" aria-hidden="true" /></label>
        : action === 'add'
        ? <button type="button" key={action} aria-label={t('shortcuts.add')} onClick={() => props.onAdd()}><span aria-hidden="true">{icon('add', '＋')}</span></button>
        : action === 'edit'
          ? <button type="button" key={action} aria-label={t('edit.enter')} onClick={props.onEnterEditMode}><span aria-hidden="true">{icon('edit', '✎')}</span></button>
          : <button type="button" key={action} className={detectTemplate(profile) === 'banner' ? 'mnt-settings-entry mnt-banner-settings' : 'mnt-settings-entry'} aria-label={t('settings.open')} onClick={() => props.onOpenSettings()}><span aria-hidden="true">{icon('settings', <SettingsIcon size={20} strokeWidth={1.5} />)}</span></button>)}
    </div>
  }
  // Corner toolbars sit outside the grid so area panels (blur, transforms) cannot trap their fixed position.
  const corners = profile.widgets.filter((widget): widget is Extract<Widget, { type: 'toolbar' }> => widget.type === 'toolbar' && !widget.hidden && !!widget.props.corner)
  const legacyStacked = profile.layout.areas.length === 2 && profile.layout.areas[0] === 'overview' && profile.layout.areas[1] === 'bookmarks'
  return <>{corners.map(widget => <div key={widget.id} className="mnt-widget mnt-widget-frame mnt-corner-toolbar" data-widget-id={widget.id} data-widget="toolbar" data-corner={widget.props.corner} style={{ '--mnt-widget-size': widget.props.size ?? 1 } as CSSProperties}>{toolbar(widget)}</div>)}<section className={`desktop mnt-layout${legacyStacked ? ' layout-stacked' : ''}`} data-layout-template={detectTemplate(profile)} style={gridStyle(grid, profile.layout.contentWidth, profile.layout.gap)} data-breakpoint={breakpoint} data-edit-mode={editing ? '' : undefined}>
    {names.map(name => <div key={name} className="mnt-area" data-area={name} style={{ gridArea: name, ...areaStyle(profile.layout.areaStyles?.[name], palette), ...(detectTemplate(profile) === 'banner' && name === 'banner' ? { display: 'flex', paddingInline: '6%' } : {}) }}>
      {widgetsIn(profile.widgets, name).map(widget => {
        const common = { '--mnt-widget-size': widget.props.size ?? 1, ...(widget.props.align ? { textAlign: widget.props.align } : {}) } as CSSProperties
        const frame = (child: ReactNode) => <div key={widget.id} className="mnt-widget mnt-widget-frame" data-widget-id={widget.id} data-widget={widget.type} data-show-url={widget.type === 'bookmarks' && widget.props.showUrl ? '' : undefined} data-align={widget.props.align} style={common}>{child}</div>
        switch (widget.type) {
          case 'clock': return frame(<ClockBlock widget={widget} language={language} onContextMenu={props.onContextMenu} theme={profile.theme} custom={profile.custom} t={t} />)
          case 'date': return frame(<DateBlock widget={widget} language={language} />)
          case 'search': {
            const finds = !!widget.props.findBookmarks && findsBookmarks && !editing
            return frame(<Search template={searchTemplate} engineName={widget.props.namePlaceholder ? searchEngine?.name : undefined} onFind={finds ? setFind : undefined} findQuery={finds ? findText : undefined} openInNewTab={profile.prefs.openSearchInNewTab} t={t} onError={props.onError} onContextMenu={props.onContextMenu} />)
          }
          case 'bookmarks': {
            const source = widget.props.source ?? 'all'
            const empty = !!query && !groups.some(group => source === 'all' || group.id === source)
            return frame(empty
              ? <FindEmpty query={findText.trim()} t={t} onClear={clearFind} />
              : <ShortcutGrid groups={groups} shortcuts={query ? shortcuts.filter(matches) : shortcuts} editing={editing} onboarding={onboarding} onOnboardingAction={props.onOnboardingAction} language={language} t={t} style={widget.props.style ?? 'tile'} source={widget.props.source ?? 'all'} showGroupTitles={widget.props.showGroupTitles !== false} maxColumns={widget.props.maxColumns ?? 6} showAdd={editing || (!query && widget.props.showAdd !== false)} iconColor={widget.props.iconColor ?? 'per-site'} openInNewTab={profile.prefs.openShortcutsInNewTab} liftOnHover={profile.prefs.liftOnHover} reduceMotion={profile.prefs.reduceMotion} reduceTransparency={profile.prefs.reduceTransparency} onGroups={props.onGroups} onGroupContextMenu={props.onGroupContextMenu} onEdit={props.onEdit} onRemove={props.onRemove} onMove={props.onMove} onAdd={props.onAdd} onContextMenu={props.onBookmarkContextMenu} groupDisplay={widget.props.groupDisplay} openAll={widget.props.openAll} onOpenAll={props.onOpenAll} />)
          }
          case 'greeting': {
            return frame(<Greeting name={widget.props.name} transitional={widget.props.transitional} language={language} t={t} />)
          }
          case 'text': return frame(<div>{widget.props.text}</div>)
          case 'spacer': return frame(<div aria-hidden="true" style={{ height: widget.props.height ?? 40 }} />)
          case 'todo': case 'note': case 'countdown': return frame(<Suspense fallback={null}><ProductivityWidgetView widget={widget} language={language} t={t} onChange={props.onWidgetChange} /></Suspense>)
          case 'weather': return frame(<Suspense fallback={null}><WeatherWidget widget={widget} language={language} onChooseCity={() => props.onOpenSettings('widgets')} onChange={(id, update) => props.onWidgetChange(id, update as never)} /></Suspense>)
          case 'toolbar': return widget.props.corner ? null : frame(toolbar(widget))
        }
      })}
    </div>)}
  </section></>
}
