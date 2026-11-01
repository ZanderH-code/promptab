import { useEffect, useRef } from 'react'

export type ContextMenuItem = { label: string; onSelect: () => void }
type Props = { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }

export function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    firstItemRef.current?.focus()
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div ref={menuRef} className="context-menu" role="menu" style={{ left: x, top: y }} onClick={event => event.stopPropagation()} onKeyDown={event => {
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'ArrowDown' ? (current + 1) % items.length : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1
      if (next >= 0 && items.length) { event.preventDefault(); items[next].focus() }
    }}>
      {items.map((item, index) => (
        <button ref={index === 0 ? firstItemRef : undefined} key={item.label} type="button" role="menuitem" onClick={() => { item.onSelect(); onClose() }}>{item.label}</button>
      ))}
    </div>
  )
}
