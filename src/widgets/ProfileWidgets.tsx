import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { ProfileV2, Widget } from '../core/schema/profile'
import type { Settings, Shortcut } from '../core/model'
import type { MessageRef, Translate } from '../i18n'
import { widgetsIn } from '../core/layout/grid'
import { gridStyle, areaStyle } from '../core/layout/styles'
import { formatClock, formatDate } from '../core/layout/formats'
import { Search } from './Search'
import { ShortcutGrid } from './ShortcutGrid'

type Props = { profile: ProfileV2; language: Settings['language']; shortcuts: Settings['shortcuts']; editing: boolean; t: Translate; onError: (error: MessageRef) => void; onContextMenu: (event: MouseEvent) => void; onReorder: (shortcuts: Shortcut[]) => void; onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onAdd: () => void; onBookmarkContextMenu: (event: MouseEvent, shortcut: Shortcut) => void }

function useBreakpoint() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => { const resize = () => setWidth(window.innerWidth); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize) }, [])
  return width <= 639 ? 'narrow' as const : width <= 1024 ? 'medium' as const : 'wide' as const
}

function ClockBlock({ widget, language, onContextMenu }: { widget: Extract<Widget, {type:'clock'}>; language: Settings['language']; onContextMenu: (event: MouseEvent) => void }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  const p = widget.props
  return <div className="intro" onContextMenu={onContextMenu}>{p.eyebrow !== false && <div className="eyebrow"><span className="dot" /> YOUR SPACE, YOUR PACE</div>}<div className="clock mnt-clock">{formatClock(now, language, p)}</div></div>
}

function DateBlock({ widget, language }: { widget: Extract<Widget, {type:'date'}>; language: Settings['language'] }) {
  const p = widget.props, now = new Date()
  return <div className="date mnt-date">{formatDate(now, language, p)}</div>
}

export function ProfileWidgets(props: Props) {
  const { profile, language, shortcuts, editing, t } = props
  const breakpoint = useBreakpoint()
  const grid = breakpoint === 'wide' ? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows } : profile.layout.breakpoints?.[breakpoint] ?? (breakpoint === 'narrow' ? profile.layout.breakpoints?.medium : undefined) ?? { areas: profile.layout.areas, columns: profile.layout.columns, rows: profile.layout.rows }
  const names = [...new Set(grid.areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))]
  const palette = profile.theme.color
  const searchTemplate = profile.search.engines.find(e => e.id === profile.search.defaultEngineId)?.template ?? 'https://www.google.com/search?q={query}'
  return <section className="desktop mnt-layout" style={gridStyle(grid, profile.layout.contentWidth, profile.layout.gap)} data-breakpoint={breakpoint}>
    {names.map(name => <div key={name} className="mnt-area" data-area={name} style={{ gridArea: name, ...areaStyle(profile.layout.areaStyles?.[name], palette) }}>
      {widgetsIn(profile.widgets, name).map(widget => {
        const common = { '--mnt-widget-size': widget.props.size ?? 1, textAlign: widget.props.align ?? 'inherit' } as CSSProperties
        const frame = (child: ReactNode) => <div key={widget.id} className="mnt-widget mnt-widget-frame" data-widget-id={widget.id} data-widget={widget.type} style={common}>{child}</div>
        switch (widget.type) {
          case 'clock': return frame(<ClockBlock widget={widget} language={language} onContextMenu={props.onContextMenu} />)
          case 'date': return frame(<DateBlock widget={widget} language={language} />)
          case 'search': return frame(<Search template={searchTemplate} t={t} onError={props.onError} onContextMenu={props.onContextMenu} />)
          case 'bookmarks': return frame(<ShortcutGrid shortcuts={shortcuts} editing={editing} t={t} onReorder={props.onReorder} onEdit={props.onEdit} onRemove={props.onRemove} onAdd={props.onAdd} onContextMenu={props.onBookmarkContextMenu} />)
          case 'greeting': return frame(<div>{widget.props.name ? `${language === 'en' ? 'Hello' : '你好'}，${widget.props.name}` : (language === 'en' ? 'Hello' : '你好')}</div>)
          case 'text': return frame(<div>{widget.props.text}</div>)
          case 'spacer': return frame(<div aria-hidden="true" style={{ height: widget.props.height ?? 40 }} />)
        }
      })}
    </div>)}
  </section>
}
