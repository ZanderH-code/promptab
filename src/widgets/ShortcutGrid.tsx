import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react'
import type { CSSProperties, MouseEvent } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Shortcut } from '../core/model'
import type { Translate, MessageKey } from '../i18n'
import { SortableShortcut } from './SortableShortcut'
import { WebsiteIcon } from './WebsiteIcon'

/** The seeded sample site carries the default teal; it follows the accent colour instead of staying fixed. */
const SAMPLE_ID = 'example'
const SAMPLE_COLOR = '#90d5cd'
/** Hostname for `[data-link-host]` selectors in custom CSS. */
const linkHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined } }
const tileColor = (item: Shortcut) => item.id === SAMPLE_ID && item.color.toLowerCase() === SAMPLE_COLOR ? 'var(--mnt-accent)' : item.color
const shortcutName = (item: Shortcut, t: Translate) => item.builtinName === 'sample-website' ? t('builtin.sampleWebsite' as MessageKey) : item.name

type Props = {
  shortcuts: Shortcut[]
  editing: boolean
  t: Translate
  onReorder: (shortcuts: Shortcut[]) => void
  onEdit: (shortcut: Shortcut) => void
  onRemove: (shortcut: Shortcut) => void
  onAdd: () => void
  onContextMenu: (event: MouseEvent, shortcut: Shortcut) => void
}

export function ShortcutGrid({ shortcuts, editing, t, onReorder, onEdit, onRemove, onAdd, onContextMenu }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const move = (from: number, to: number) => onReorder(arrayMove(shortcuts, from, to))

  function dragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = shortcuts.findIndex(item => item.id === active.id)
    const to = shortcuts.findIndex(item => item.id === over.id)
    if (from >= 0 && to >= 0) move(from, to)
  }

  return (
    <div className="bookmarks mnt-widget mnt-group" data-widget="bookmarks">
      <div className="shortcuts-heading mnt-group-title">
        <span>{t('shortcuts.heading')}</span>
        <span className="line" />
        <span className="count">{String(shortcuts.length).padStart(2, '0')}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={shortcuts.map(item => item.id)} strategy={rectSortingStrategy}>
          <div className="grid" style={{ '--mnt-item-count': shortcuts.length + 1 } as CSSProperties}>
            {shortcuts.map((item, index) => {
              const name = shortcutName(item, t)
              return (
                <SortableShortcut id={item.id} enabled={editing} dragLabel={t('shortcuts.drag')} key={item.id}>
                <a className="shortcut mnt-link" data-user-content data-link-host={linkHost(item.url)} title={name} href={item.url} onContextMenu={event => onContextMenu(event, item)}>
                  <span className="shortcut-icon mnt-link-icon" style={{ '--tile': tileColor(item) } as CSSProperties}><WebsiteIcon shortcut={item} /></span>
                  <span className="mnt-link-name">{name}</span>
                </a>
                {editing && (
                  <div className="shortcut-actions">
                    <button aria-label={t('shortcuts.editNamed', { name })} onClick={() => onEdit(item)}>{t('common.edit')}</button>
                    <button aria-label={t('shortcuts.moveLeftNamed', { name })} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /></button>
                    <button aria-label={t('shortcuts.moveRightNamed', { name })} disabled={index === shortcuts.length - 1} onClick={() => move(index, index + 1)}><ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></button>
                    <button aria-label={t('shortcuts.deleteNamed', { name })} onClick={() => onRemove(item)}><X size={16} strokeWidth={1.5} aria-hidden="true" /></button>
                  </div>
                )}
              </SortableShortcut>
              )
            })}
            <button className="add-shortcut" onClick={onAdd}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
