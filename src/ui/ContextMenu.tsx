import { useEffect } from 'react'

export type ContextMenuItem = { label: string; onSelect: () => void }
type Props = { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }

export function ContextMenu({ x, y, items, onClose }: Props) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="context-menu" role="menu" style={{ left: x, top: y }} onClick={event => event.stopPropagation()}>
      {items.map(item => (
        <button key={item.label} role="menuitem" onClick={() => { item.onSelect(); onClose() }}>{item.label}</button>
      ))}
    </div>
  )
}
