import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import { GroupMenuTrigger, ShortcutLink, type ContextMenuEvent } from './ShortcutGridContent'
import type { Group } from './ShortcutGrid'
import { WebsiteIcon } from './WebsiteIcon'

/** Keeps a folder dialog open when the grid remounts for the lazy drag layer. */
const openFolders = new Set<string>()

type Props = {
  group: Group
  name: string
  shortcuts: Shortcut[]
  style: 'tile' | 'list' | 'minimal' | 'card' | 'icon-only'
  iconColor: 'per-site' | 'accent'
  openInNewTab: boolean
  liftOnHover: boolean
  reduceMotion: 'system' | 'on' | 'off'
  reduceTransparency: 'system' | 'on' | 'off'
  t: Translate
  onContextMenu: (event: ContextMenuEvent, group: Group) => void
  onShortcutContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void
  /** Supplied by the display drag layer so the tile can accept a dropped shortcut. */
  dropRef?: (node: HTMLElement | null) => void
  dropActive?: boolean
}

export function BookmarkFolder({ group, name, shortcuts, style, iconColor, openInNewTab, liftOnHover, reduceMotion, reduceTransparency, t, onContextMenu, onShortcutContextMenu, dropRef, dropActive }: Props) {
  const [open, setOpenState] = useState(() => openFolders.has(group.id))
  const setOpen = (value: boolean) => { if (value) openFolders.add(group.id); else openFolders.delete(group.id); setOpenState(value) }
  const titleId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const setTrigger = useCallback((node: HTMLButtonElement | null) => { trigger.current = node; dropRef?.(node) }, [dropRef])
  const items = useMemo(() => {
    const latest = new Map(shortcuts.map(shortcut => [shortcut.id, shortcut]))
    return group.items.map(stored => latest.get(stored.id) ?? stored).map(item => item.builtinName === 'sample-website'
      ? { ...item, name: t('builtin.sampleWebsite'), icon: t('builtin.sampleWebsiteIcon') }
      : item)
  }, [group.items, shortcuts, t])
  const reducedTransparency = reduceTransparency === 'on' || (reduceTransparency === 'system' && window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches)
  const reducedMotion = reduceMotion === 'on' || (reduceMotion === 'system' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const portalRoot = document.querySelector('.mnt-root') ?? document.body

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current
    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    const firstLink = dialog.current?.querySelector<HTMLElement>('.mnt-folder-dialog-grid a[href]')
    ;(firstLink ?? closeButton.current)?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
      if (trigger.current?.isConnected) trigger.current.focus()
      else if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  useEffect(() => {
    if (open && dialog.current && !dialog.current.contains(document.activeElement) && !document.querySelector('.context-menu')) {
      ;(dialog.current.querySelector<HTMLElement>('.mnt-folder-dialog-grid a[href]') ?? closeButton.current)?.focus()
    }
  }, [items, open])

  useEffect(() => {
    if (!open) return
    const keepMenuTabInsideDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !(event.target instanceof Element) || !event.target.closest('.context-menu')) return
      const dialogItems = Array.from(dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
      const menuItems = Array.from(document.querySelectorAll<HTMLElement>('.context-menu [role="menuitem"]'))
      if (!dialogItems.length || !menuItems.length) return
      if (event.shiftKey && event.target === menuItems[0]) {
        event.preventDefault()
        dialogItems.at(-1)?.focus()
      } else if (!event.shiftKey && event.target === menuItems.at(-1)) {
        event.preventDefault()
        dialogItems[0].focus()
      }
    }
    const keepFocusInsideModal = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || dialog.current?.contains(event.target) || event.target.closest('.context-menu')) return
      ;(dialog.current?.querySelector<HTMLElement>('.mnt-folder-dialog-grid a[href]') ?? closeButton.current)?.focus()
    }
    document.addEventListener('keydown', keepMenuTabInsideDialog, true)
    document.addEventListener('focusin', keepFocusInsideModal, true)
    return () => {
      document.removeEventListener('keydown', keepMenuTabInsideDialog, true)
      document.removeEventListener('focusin', keepFocusInsideModal, true)
    }
  }, [open])

  const modal = open && createPortal(
    <div className="mnt-folder-backdrop" data-reduce-motion={reducedMotion || undefined} data-folder-backdrop onClick={event => {
      if (event.target === event.currentTarget) setOpen(false)
    }}>
      <section
        ref={dialog}
        className="mnt-folder-dialog"
        data-folder={group.id}
        data-reduce-transparency={reducedTransparency || undefined}
        data-reduce-motion={reducedMotion || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            if (document.querySelector('.context-menu')) return
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            return
          }
          if (event.key === 'Tab') {
            const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
            if (focusable.length === 0) {
              event.preventDefault()
              dialog.current?.focus()
            } else if (event.shiftKey && document.activeElement === focusable[0]) {
              event.preventDefault()
              focusable.at(-1)?.focus()
            } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
              event.preventDefault()
              focusable[0].focus()
            }
          }
          // Keep app-level shortcuts and undo from affecting the page behind this modal.
          event.stopPropagation()
        }}
      >
        <header className="mnt-folder-dialog-header">
          <h2 id={titleId}>{name}</h2>
          <button ref={closeButton} type="button" className="mnt-folder-close" aria-label={t('groups.folderClose')} onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
        </header>
        {items.length ? <div className="mnt-folder-dialog-grid" style={{ '--mnt-folder-icon-size': 'calc(var(--mnt-icon-size, 64px) * 1.25)' } as CSSProperties}>
          {items.map(item => <div className="mnt-folder-dialog-item" key={item.id}><ShortcutLink item={item} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onShortcutContextMenu} /></div>)}
        </div> : <div className="mnt-folder-empty"><p>{t('groups.folderEmpty')}</p><p>{t('groups.folderEmptyHint')}</p></div>}
      </section>
    </div>, portalRoot)

  return <>
    <GroupMenuTrigger group={group} className="mnt-folder-menu-trigger" ariaLabel={t('groups.menuLabel', { name })} onGroupContextMenu={onContextMenu} focusable={false} allowButtonLongPress suppressClickAfterLongPress>
      <button ref={setTrigger} type="button" className={`mnt-folder mnt-folder-style-${style}`} data-folder={group.id} data-drop-target={dropActive ? 'true' : undefined} aria-haspopup="dialog" aria-expanded={open} aria-label={t('groups.folderOpen', { name, count: items.length })} title={name} onClick={() => setOpen(true)}>
        <span className="mnt-folder-preview" aria-hidden="true">
          {items.slice(0, 4).map(item => <span className="mnt-folder-preview-item" key={item.id} style={{ '--tile': item.color } as CSSProperties}><WebsiteIcon shortcut={iconColor === 'accent' ? { ...item, iconColorMode: 'accent' } : item} /></span>)}
          {items.length === 0 && <span className="mnt-folder-preview-empty" />}
        </span>
        <span className="mnt-folder-name">{name}</span>
      </button>
    </GroupMenuTrigger>
    {modal}
  </>
}
