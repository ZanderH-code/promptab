import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'

type Props = { id: string; enabled: boolean; children: ReactNode; dragLabel: string }

export function SortableShortcut({ id, enabled, children, dragLabel }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled })
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="shortcut-wrap">
      {children}
      {enabled && <button className="drag-handle" {...attributes} {...listeners} aria-label={dragLabel}>⠿</button>}
    </div>
  )
}
