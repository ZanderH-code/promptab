import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import type { Shortcut, TileLook } from '../core/model'
import type { Translate } from '../i18n'
import { WebsiteIcon } from './WebsiteIcon'

export type ContextMenuEvent = Pick<MouseEvent, 'clientX' | 'clientY' | 'preventDefault' | 'stopPropagation'> & { focusTarget?: HTMLElement }

export function GroupMenuTrigger({ group, ariaLabel, className, children, onGroupContextMenu, allowButtonLongPress = false, suppressClickAfterLongPress = false, focusable = true }: {
  group: ProfileV2['bookmarks']['groups'][number]; ariaLabel: string; className: string; children: ReactNode
  onGroupContextMenu: (event: ContextMenuEvent, group: ProfileV2['bookmarks']['groups'][number]) => void
  allowButtonLongPress?: boolean; suppressClickAfterLongPress?: boolean; focusable?: boolean
}) {
  const heading = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<number | undefined>(undefined)
  const start = useRef<{ x: number; y: number } | undefined>(undefined)
  const longPressed = useRef(false)
  useEffect(() => () => { if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current) }, [])
  const cancelLongPress = () => {
    if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current)
    pressTimer.current = undefined
    start.current = undefined
  }
  const openContextMenu = (event: ContextMenuEvent) => {
    cancelLongPress()
    onGroupContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
      focusTarget: (focusable ? heading.current : heading.current?.querySelector<HTMLElement>('button')) ?? undefined,
    }, group)
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || event.button !== 0 || (!allowButtonLongPress && event.target instanceof Element && event.target.closest('button'))) return
    cancelLongPress()
    longPressed.current = false
    start.current = { x: event.clientX, y: event.clientY }
    const x = event.clientX, y = event.clientY
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      openContextMenu({ clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} })
    }, 550)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancelLongPress()
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) return
    event.preventDefault()
    event.stopPropagation()
    const target = !focusable && event.target instanceof HTMLElement ? event.target : event.currentTarget
    const rect = target.getBoundingClientRect()
    openContextMenu({ clientX: rect.left, clientY: rect.bottom, preventDefault() {}, stopPropagation() {} })
  }
  return <div ref={heading} className={className} tabIndex={focusable ? 0 : undefined} aria-label={focusable ? ariaLabel : undefined} aria-haspopup={focusable ? 'menu' : undefined} onContextMenu={event => openContextMenu(event)} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onClickCapture={event => {
    if (!suppressClickAfterLongPress || !longPressed.current) return
    event.preventDefault()
    event.stopPropagation()
    longPressed.current = false
  }} onClick={event => {
    if (suppressClickAfterLongPress || !longPressed.current) return
    event.preventDefault()
    event.stopPropagation()
    longPressed.current = false
  }}>{children}</div>
}

/** Opens every website of a group; shown beside the group name when the websites widget enables it. */
export function OpenAllButton({ group, label, text, onOpenAll }: { group: ProfileV2['bookmarks']['groups'][number]; label: string; text: string; onOpenAll: (group: ProfileV2['bookmarks']['groups'][number]) => void }) {
  // Material Design "open in browser" glyph (Apache-2.0). The short text is hidden unless a look shows it instead.
  return <button type="button" className="mnt-group-open-all" aria-label={label} title={label} onClick={event => { event.stopPropagation(); onOpenAll(group) }}><svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z" /></svg><span className="mnt-group-open-all-text" aria-hidden="true">{text}</span></button>
}

/** Whether a group heading shows its name and its open-all button in display mode. */
export function headingParts(group: ProfileV2['bookmarks']['groups'][number], openAll: boolean | undefined, canOpenAll: boolean) {
  const name = group.showName !== false
  const open = !!openAll && canOpenAll && group.openAll !== false && group.items.length > 0
  return { name, open, any: name || open }
}

/** Black or white text on a colour, whichever reads better (relative luminance threshold 0.55). */
export function textOn(hex: string): '#000000' | '#ffffff' {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = (value >> 16) & 255, g = (value >> 8) & 255, b = value & 255
  return (0.2721 * r + 0.7152 * g + 0.1255 * b) / 255 < 0.55 ? '#ffffff' : '#000000'
}

/** From this plate opacity up, the website's own colour, not the page, decides what text reads on it. */
const PLATE_TEXT_MIN_OPACITY = 50

/** Inline custom properties and data attributes for one website's tile look. */
export function tileProps(tile: TileLook | undefined) {
  if (!tile) return { style: {} as CSSProperties, data: {} }
  const style: Record<string, string | number> = {}
  if (tile.accent) { style['--mnt-accent'] = tile.accent; style['--mnt-on-accent'] = textOn(tile.accent); style['--mnt-accent-soft'] = `color-mix(in oklch, ${tile.accent} 20%, transparent)` }
  if (tile.background) {
    style['--mnt-tile-bg'] = tile.background
    // An opaque plate is the surface the label sits on, so the theme text (checked against the page, not
    // the plate) can be unreadable. Below half opacity the page still supplies most of the composite, and a
    // visible tile image paints arbitrary pixels over the plate: both keep the theme text, which is right.
    if ((!tile.image || (tile.imageOpacity ?? 100) === 0) && (tile.opacity ?? 100) >= PLATE_TEXT_MIN_OPACITY) {
      const ink = textOn(tile.background)
      style['--mnt-text'] = ink
      // The icon mark keeps its site colour by default; on a plate it falls back to the same readable ink.
      style['--mnt-tile-ink'] = ink
    }
  }
  if (tile.opacity !== undefined) style['--mnt-tile-opacity'] = tile.opacity / 100
  if (tile.border !== undefined) style['--mnt-tile-border'] = `${tile.border}px`
  if (tile.iconScale !== undefined) style['--mnt-tile-icon-scale'] = tile.iconScale
  if (tile.nameScale !== undefined) style['--mnt-tile-name-scale'] = tile.nameScale
  if (tile.rotate) style['--mnt-tile-rotate'] = `${tile.rotate}deg`
  if (tile.offsetX) style['--mnt-tile-x'] = `${tile.offsetX}em`
  if (tile.offsetY) style['--mnt-tile-y'] = `${tile.offsetY}em`
  if (tile.gap !== undefined) style['--mnt-tile-gap'] = `${tile.gap}em`
  const data: Record<string, string> = {}
  if (tile.span) data['data-tile-span'] = tile.span
  if (tile.align) data['data-tile-align'] = tile.align
  if (tile.direction) data['data-tile-direction'] = tile.direction
  if (tile.nameFirst) data['data-tile-name-first'] = ''
  if (tile.hideName) data['data-tile-hide-name'] = ''
  if (tile.hideIcon) data['data-tile-hide-icon'] = ''
  if (tile.background || tile.image || tile.opacity !== undefined) data['data-tile-backdrop'] = ''
  if (tile.opacity !== undefined && tile.opacity < 40) data['data-tile-faint'] = ''
  return { style: style as CSSProperties, data }
}

const linkHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined } }
/** The address without scheme, leading www. or trailing slashes, as shown in the hover strip. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')

export function ShortcutLink({ item, iconColor, openInNewTab, liftOnHover, t, onContextMenu }: {
  item: Shortcut; iconColor: 'per-site' | 'accent'; openInNewTab: boolean; liftOnHover: boolean; t: Translate; onContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void
}) {
  const pressTimer = useRef<number | undefined>(undefined)
  const moveListener = useRef<((event: Event) => void) | undefined>(undefined)
  const longPressed = useRef(false)
  const moved = useRef(false)
  const start = useRef<{ x: number; y: number } | undefined>(undefined)
  const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
  const icon = item.builtinIcon === 'sample-website' ? t('builtin.sampleWebsiteIcon') : item.icon
  // The link's own pointermove handler only sees the pointer while it is over the link. A touch
  // drag leaves the tile almost immediately, so watch the whole window while a press is pending:
  // a moving finger is a drag, and the long-press menu must not open on top of it.
  const clearMoveListener = () => {
    if (moveListener.current) {
      window.removeEventListener('pointermove', moveListener.current, true)
      window.removeEventListener('touchmove', moveListener.current, true)
    }
    moveListener.current = undefined
  }
  const cancelLongPress = () => { if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current); pressTimer.current = undefined; clearMoveListener() }
  const endPress = () => { cancelLongPress(); moved.current = false }
  // Unmounting mid-press must not leave the timer to open a menu for a detached tile.
  useEffect(() => cancelLongPress, [])
  const onPointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'touch' || event.button !== 0) return
    cancelLongPress()
    longPressed.current = false
    moved.current = false
    start.current = { x: event.clientX, y: event.clientY }
    const x = event.clientX, y = event.clientY, focusTarget = event.currentTarget
    const cancelOnMove = (move: Event) => {
      const point = move instanceof TouchEvent ? move.touches[0] : move as PointerEvent
      if (point && Math.hypot(point.clientX - x, point.clientY - y) > 10) { moved.current = true; cancelLongPress() }
    }
    moveListener.current = cancelOnMove
    window.addEventListener('pointermove', cancelOnMove, true)
    window.addEventListener('touchmove', cancelOnMove, true)
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
      clearMoveListener()
      onContextMenu({ clientX: x, clientY: y, focusTarget, preventDefault() {}, stopPropagation() {} }, item)
    }, 550)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (!start.current) return
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancelLongPress()
  }
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!longPressed.current) return
    event.preventDefault()
    event.stopPropagation()
    longPressed.current = false
  }
  const openContextMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    cancelLongPress()
    // Chrome also opens its own long-press menu on touch. Once the finger has moved it is a drag,
    // not a long press, so drop that menu: it would otherwise cancel the drag mid-gesture.
    if (moved.current) { event.preventDefault(); event.stopPropagation(); return }
    longPressed.current = true
    onContextMenu({ clientX: event.clientX, clientY: event.clientY, focusTarget: event.currentTarget, preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() }, item)
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (!((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu')) return
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    onContextMenu({ clientX: rect.left, clientY: rect.bottom, focusTarget: event.currentTarget, preventDefault() {}, stopPropagation() {} }, item)
  }
  const look = tileProps(item.tile)
  return <a className={`shortcut mnt-link${liftOnHover ? ' mnt-lift-on-hover' : ''}`} data-link-host={linkHost(item.url)} data-link-id={item.id} data-link-url={displayUrl(item.url)} {...look.data} style={look.style} title={name} href={item.url} draggable={false} {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onContextMenu={openContextMenu} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPress} onPointerCancel={endPress} onClick={onClick}><span className="mnt-link-backdrop" aria-hidden="true">{item.tile?.image && <span className="mnt-link-backdrop-image" style={{ backgroundImage: `url("${item.tile.image}")`, opacity: (item.tile.imageOpacity ?? 100) / 100 }} />}</span><span className="shortcut-icon mnt-link-icon" {...(!item.builtinIcon && !item.image ? { 'data-user-content': true } : {})} style={{ '--tile': item.id === 'example' && item.color.toLowerCase() === '#90d5cd' ? 'var(--mnt-accent)' : item.color } as CSSProperties}><WebsiteIcon shortcut={{ ...item, icon, ...(iconColor === 'accent' ? { iconColorMode: 'accent' as const } : {}) }} /></span><span className="mnt-link-name" {...(item.builtinName ? {} : { 'data-user-content': true })}>{name}</span></a>
}
