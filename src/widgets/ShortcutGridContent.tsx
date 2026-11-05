import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import type { Shortcut } from '../core/model'
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

const linkHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined } }

export function ShortcutLink({ item, iconColor, openInNewTab, liftOnHover, t, onContextMenu }: {
  item: Shortcut; iconColor: 'per-site' | 'accent'; openInNewTab: boolean; liftOnHover: boolean; t: Translate; onContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void
}) {
  const pressTimer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const start = useRef<{ x: number; y: number } | undefined>(undefined)
  const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
  const icon = item.builtinIcon === 'sample-website' ? t('builtin.sampleWebsiteIcon') : item.icon
  const cancelLongPress = () => { if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current); pressTimer.current = undefined }
  const onPointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'touch' || event.button !== 0) return
    cancelLongPress()
    longPressed.current = false
    start.current = { x: event.clientX, y: event.clientY }
    const x = event.clientX, y = event.clientY, focusTarget = event.currentTarget
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true
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
  return <a className={`shortcut mnt-link${liftOnHover ? ' mnt-lift-on-hover' : ''}`} data-link-host={linkHost(item.url)} title={name} href={item.url} {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onContextMenu={openContextMenu} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onClick={onClick}><span className="shortcut-icon mnt-link-icon" aria-hidden="true" {...(!item.builtinIcon && !item.image ? { 'data-user-content': true } : {})} style={{ '--tile': item.id === 'example' && item.color.toLowerCase() === '#90d5cd' ? 'var(--mnt-accent)' : item.color } as CSSProperties}><WebsiteIcon shortcut={{ ...item, icon, ...(iconColor === 'accent' ? { iconColorMode: 'accent' as const } : {}) }} /></span><span className="mnt-link-name" {...(item.builtinName ? {} : { 'data-user-content': true })}>{name}</span></a>
}

export function OnboardingCard({ t, onAction }: { t: Translate; onAction: (action: 'add' | 'import' | 'theme' | 'ai') => void }) {
  return <section className="onboarding-card" aria-labelledby="onboarding-title">
    <div><span className="editor-kicker">{t('onboarding.kicker')}</span><h2 id="onboarding-title">{t('onboarding.title')}</h2><p>{t('onboarding.description')}</p></div>
    <div className="onboarding-actions">
      <button type="button" data-primary onClick={() => onAction('ai')}>{t('onboarding.ai')}</button>
      <button type="button" onClick={() => onAction('add')}>{t('onboarding.add')}</button>
      <button type="button" onClick={() => onAction('import')}>{t('onboarding.import')}</button>
      <button type="button" onClick={() => onAction('theme')}>{t('onboarding.theme')}</button>
    </div>
  </section>
}
