import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'

type Props = { id: string; enabled: boolean; children: ReactNode; dragLabel: string; groupId?: string }

export function SortableShortcut({ id, enabled, children, dragLabel, groupId }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !enabled, data: { groupId } })
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="shortcut-wrap" data-sortable-id={id}>
      {children}
      {enabled && <button className="drag-handle" {...attributes} {...listeners} aria-label={dragLabel}><GripVertical size={20} strokeWidth={1.5} aria-hidden="true" /></button>}
    </div>
  )
}
