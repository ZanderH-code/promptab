import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { ProfileV2, Widget } from '../core/schema/profile'
import type { Settings, Shortcut } from '../core/model'
import type { MessageRef, Translate } from '../i18n'
import { widgetsIn } from '../core/layout/grid'
import { detectTemplate } from '../core/layout/profile'
import { BREAKPOINTS } from '../core/schema/defaults'
import { gridStyle, areaStyle } from '../core/layout/styles'
import { formatClock, formatDate, greetingPeriod } from '../core/layout/formats'
import { Search } from './Search'
import { ShortcutGrid } from './ShortcutGrid'

type Props = { profile: ProfileV2; language: Settings['language']; shortcuts: Settings['shortcuts']; editing: boolean; onboarding: boolean; onOnboardingAction: (action: 'add' | 'import' | 'theme' | 'ai') => void; onManageDone: () => void; t: Translate; onError: (error: MessageRef) => void; onContextMenu: (event: MouseEvent) => void; onGroups: (update: (groups: ProfileV2['bookmarks']['groups']) => ProfileV2['bookmarks']['groups']) => void; onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onMove: (shortcut: Shortcut) => void; onAdd: (groupId?: string) => void; onBookmarkContextMenu: (event: MouseEvent, shortcut: Shortcut) => void; onOpenSettings: () => void; onEnterEditMode: () => void }

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

function ClockBlock({ widget, language, onContextMenu }: { widget: Extract<Widget, {type:'clock'}>; language: Settings['language']; onContextMenu: (event: MouseEvent) => void }) {
  const p = widget.props
  const now = useNow(p.seconds ? 'second' : 'minute')
  return <div className="intro" onContextMenu={onContextMenu}>{p.eyebrow === true && <div className="eyebrow"><span className="dot" /> {language === 'en' ? 'YOUR SPACE, YOUR PACE' : '你的空间，你的节奏'}</div>}<div className="clock mnt-clock">{formatClock(now, language, p)}</div></div>
}

function DateBlock({ widget, language }: { widget: Extract<Widget, {type:'date'}>; language: Settings['language'] }) {
  const p = widget.props, now = useNow('minute')
  return <div className="date mnt-date">{formatDate(now, language, p)}</div>
}

export function ProfileWidgets(props: Props) {
  const { profile, language, shortcuts, editing, onboarding, t } = props
  const breakpoint = useBreakpoint()
  const grid = breakpoint === 'wide' ? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows } : profile.layout.breakpoints?.[breakpoint] ?? (breakpoint === 'narrow' ? profile.layout.breakpoints?.medium : undefined) ?? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows }
  const names = [...new Set(grid.areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))]
  const palette = profile.theme.color
  const now = useNow('minute')
  const searchTemplate = profile.search.engines.find(e => e.id === profile.search.defaultEngineId)?.template ?? 'https://www.google.com/search?q={query}'
  const legacyStacked = profile.layout.areas.length === 2 && profile.layout.areas[0] === 'overview' && profile.layout.areas[1] === 'bookmarks'
  return <section className={`desktop mnt-layout${legacyStacked ? ' layout-stacked' : ''}`} data-layout-template={detectTemplate(profile)} style={gridStyle(grid, profile.layout.contentWidth, profile.layout.gap)} data-breakpoint={breakpoint} data-edit-mode={editing ? '' : undefined}>
    {names.map(name => <div key={name} className="mnt-area" data-area={name} style={{ gridArea: name, ...areaStyle(profile.layout.areaStyles?.[name], palette), ...(detectTemplate(profile) === 'banner' && name === 'banner' ? { display: 'flex', paddingInline: '6%' } : {}) }}>
      {widgetsIn(profile.widgets, name).map(widget => {
        const common = { '--mnt-widget-size': widget.props.size ?? 1, ...(widget.props.align ? { textAlign: widget.props.align } : {}) } as CSSProperties
        const frame = (child: ReactNode) => <div key={widget.id} className="mnt-widget mnt-widget-frame" data-widget-id={widget.id} data-widget={widget.type} style={common}>{child}</div>
        switch (widget.type) {
          case 'clock': return frame(<ClockBlock widget={widget} language={language} onContextMenu={props.onContextMenu} />)
          case 'date': return frame(<DateBlock widget={widget} language={language} />)
          case 'search': return frame(<Search template={searchTemplate} t={t} onError={props.onError} onContextMenu={props.onContextMenu} />)
          case 'bookmarks': return frame(<ShortcutGrid groups={profile.bookmarks.groups} shortcuts={shortcuts} editing={editing} onboarding={onboarding} onOnboardingAction={props.onOnboardingAction} onManageDone={props.onManageDone} language={language} t={t} style={widget.props.style ?? 'tile'} source={widget.props.source ?? 'all'} showGroupTitles={widget.props.showGroupTitles !== false} maxColumns={widget.props.maxColumns ?? 6} showAdd={editing || widget.props.showAdd !== false} iconColor={widget.props.iconColor ?? 'per-site'} onGroups={props.onGroups} onEdit={props.onEdit} onRemove={props.onRemove} onMove={props.onMove} onAdd={props.onAdd} onContextMenu={props.onBookmarkContextMenu} />)
          case 'greeting': {
            const greeting = t(`greeting.${greetingPeriod(now.getHours())}` as 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening')
            return frame(<div>{widget.props.name ? <span data-user-content>{t('greeting.withName', { greeting, name: widget.props.name })}</span> : greeting}</div>)
          }
          case 'text': return frame(<div>{widget.props.text}</div>)
          case 'spacer': return frame(<div aria-hidden="true" style={{ height: widget.props.height ?? 40 }} />)
          case 'toolbar': return frame(<div className="mnt-widget-toolbar" role="toolbar" aria-label={t('widgets.toolbar')}>
            {(widget.props.actions ?? ['add', 'edit', 'settings']).map(action => action === 'add'
              ? <button type="button" key={action} aria-label={t('shortcuts.add')} onClick={() => props.onAdd()}><span aria-hidden="true">＋</span></button>
              : action === 'edit'
                ? <button type="button" key={action} aria-label={t('edit.enter')} onClick={props.onEnterEditMode}><span aria-hidden="true">✎</span></button>
                : <button type="button" key={action} className={detectTemplate(profile) === 'banner' ? 'mnt-settings-entry mnt-banner-settings' : 'mnt-settings-entry'} aria-label={t('settings.open')} onClick={props.onOpenSettings}><span aria-hidden="true">⚙</span></button>)}
          </div>)
        }
      })}
    </div>)}
  </section>
}
