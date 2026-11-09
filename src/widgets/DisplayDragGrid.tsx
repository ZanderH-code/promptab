import { Plus } from 'lucide-react'
import { Suspense, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter, pointerWithin, useDndMonitor, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import type { Group, ShortcutGridProps } from './ShortcutGrid'
import { GroupMenuTrigger, ShortcutLink } from './ShortcutGridContent'
import { OnboardingCard } from './OnboardingCard'
import { moveBookmarks } from './bookmarkGroups'

import { BookmarkFolder } from './lazyWidgets'

type Props = ShortcutGridProps
type Strings = { pickedUp: (name: string) => string; overPosition: (position: number) => string; overFolder: (name: string) => string; dropped: (name: string) => string; cancelled: string; instructions: string }
const strings: Record<'en' | 'zh-CN', Strings> = {
  en: {
    pickedUp: name => `Picked up ${name}.`,
    overPosition: position => `Over position ${position}.`,
    overFolder: name => `Over folder ${name}.`,
    dropped: name => `Dropped ${name}.`,
    cancelled: 'Dragging cancelled.',
    instructions: 'Press Space to pick up, use the arrow keys to move, Space to drop and Escape to cancel.',
  },
  'zh-CN': {
    pickedUp: name => `已拿起 ${name}。`,
    overPosition: position => `位于第 ${position} 个位置。`,
    overFolder: name => `位于文件夹 ${name}。`,
    dropped: name => `已放下 ${name}。`,
    cancelled: '已取消拖动。',
    instructions: '按空格键拿起，使用方向键移动，按空格键放下，按 Esc 取消。',
  },
}

// Folder tiles win over links so a drop on a folder always means "move into it".
// While a folder dialog is open only its own items are targets; anything else means "drag out".
// Inside the dialog the nearest item wins, because sortable neighbours shift away from the pointer.
const displayCollision: CollisionDetection = args => {
  const hits = pointerWithin(args)
  const dialog = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.mnt-folder-dialog')
  if (dialog) {
    const ids = new Set(Array.from(dialog.querySelectorAll<HTMLElement>('[data-sortable-id]')).map(node => node.dataset.sortableId))
    const inside = hits.filter(hit => ids.has(String(hit.id)))
    if (inside.length) return inside
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(container => ids.has(String(container.id))) })
  }
  const folder = hits.find(hit => String(hit.id).startsWith('folder:'))
  if (folder) return [folder]
  if (hits.length) return hits
  // Inside the grid, sortable neighbours can shift away from the pointer, leaving a gap.
  // Pick the nearest tile there, but keep drops on the empty page as cancellations.
  const rect = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.bookmarks .grid')?.getBoundingClientRect()
  const point = args.pointerCoordinates
  if (!rect || !point || point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) return []
  return closestCenter(args)
}

// Touch drags belong to TouchSensor; the pointer sensor must not also claim them.
const mouseOnly = (listeners: ReturnType<typeof useSortable>['listeners']) => (event: ReactPointerEvent) => {
  if (event.pointerType !== 'touch') listeners?.onPointerDown?.(event)
}

function SortableTile({ id, reduceMotion, children }: { id: string; reduceMotion: boolean; children: ReactNode }) {
  const { listeners, setNodeRef, transform, isDragging } = useSortable({ id })
  // The tile is only a placeholder: the overlay under the pointer is the dragged visual, so the
  // placeholder may still take the sorting transform without competing with the cursor.
  return <div
    ref={setNodeRef}
    className="shortcut-wrap"
    data-sortable-id={id}
    data-dragging={isDragging ? 'true' : undefined}
    style={{ transform: DndCSS.Transform.toString(transform), transition: isDragging || reduceMotion ? undefined : 'transform 180ms ease', opacity: isDragging ? 0.35 : 1 }}
    {...listeners}
    onPointerDown={mouseOnly(listeners)}
  >{children}</div>
}

function SortableDialogItem({ id, reduceMotion, children }: { id: string; reduceMotion: boolean; children: ReactNode }) {
  const { listeners, setNodeRef, transform, isDragging } = useSortable({ id })
  return <div
    ref={setNodeRef}
    className="mnt-folder-dialog-item"
    data-sortable-id={id}
    data-dragging={isDragging ? 'true' : undefined}
    style={{ transform: DndCSS.Transform.toString(transform), transition: isDragging || reduceMotion ? undefined : 'transform 180ms ease', opacity: isDragging ? 0.35 : 1 }}
    {...listeners}
    onPointerDown={mouseOnly(listeners)}
  >{children}</div>
}

function DialogItemList({ group, items, close, reduceMotion, iconColor, openInNewTab, liftOnHover, t, onContextMenu }: {
  group: Group; items: Shortcut[]; close: () => void; reduceMotion: boolean
  iconColor: Props['iconColor']; openInNewTab: boolean; liftOnHover: boolean; t: Translate; onContextMenu: Props['onContextMenu']
}) {
  const dragged = useRef(false), left = useRef(false)
  useDndMonitor({
    onDragStart: ({ active }) => { dragged.current = group.items.some(item => item.id === String(active.id)); left.current = false },
    onDragMove: ({ active, delta, activatorEvent }) => {
      if (!dragged.current || left.current || !group.items.some(item => item.id === String(active.id))) return
      const start = activatorEvent as PointerEvent | TouchEvent | null
      const point = start && 'touches' in start ? start.touches[0] : start as PointerEvent | null
      if (!point) return
      const rect = document.querySelector<HTMLElement>('.mnt-folder-dialog')?.getBoundingClientRect()
      const x = point.clientX + delta.x, y = point.clientY + delta.y
      if (!rect || (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) return
      left.current = true
      close()
    },
  })
  return <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
    {items.map(item => <SortableDialogItem key={item.id} id={item.id} reduceMotion={reduceMotion}>
      <ShortcutLink item={item} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onContextMenu} />
    </SortableDialogItem>)}
  </SortableContext>
}

function DroppableFolder({ folder, name, shortcuts, style, iconColor, openInNewTab, liftOnHover, reduceMotion, reduceTransparency, t, onContextMenu, onShortcutContextMenu }: {
  folder: Group; name: string; shortcuts: Shortcut[]; style: Props['style']; iconColor: Props['iconColor']; openInNewTab: boolean; liftOnHover: boolean
  reduceMotion: 'system' | 'on' | 'off'; reduceTransparency: 'system' | 'on' | 'off'; t: Translate
  onContextMenu: Props['onGroupContextMenu']; onShortcutContextMenu: Props['onContextMenu']
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}`, data: { folderId: folder.id } })
  const reducedMotion = reduceMotion === 'on' || (reduceMotion === 'system' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  return <BookmarkFolder group={folder} name={name} shortcuts={shortcuts} style={style} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} reduceMotion={reduceMotion} reduceTransparency={reduceTransparency} t={t} onContextMenu={onContextMenu} onShortcutContextMenu={onShortcutContextMenu} dropRef={setNodeRef} dropActive={isOver}
    renderItems={(items, close) => <DialogItemList group={folder} items={items} close={close} reduceMotion={reducedMotion} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onShortcutContextMenu} />} />
}

export function DisplayDragGrid({ groups, shortcuts, onboarding, onOnboardingAction, t, language, onGroups, onAdd, onContextMenu, onGroupContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor, openInNewTab, liftOnHover, reduceMotion = 'system', reduceTransparency = 'system' }: Props) {
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const folderMode = source === 'all' && visibleGroups.length >= 2
  const renderedGroups = folderMode ? visibleGroups.slice(0, 1) : visibleGroups
  const desktopId = renderedGroups[0]?.id
  const names = new Map(shortcuts.map(item => [item.id, item]))
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  const reducedMotion = reduceMotion === 'on' || (reduceMotion === 'system' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const movedRef = useRef(false)
  const sourceRef = useRef<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
  )
  const copy = strings[language]
  const nameOf = (id: string) => { for (const group of groups) { const item = group.items.find(candidate => candidate.id === id); if (item) return item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name } return id }
  const activeItem = activeId ? names.get(activeId) ?? groups.flatMap(group => group.items).find(item => item.id === activeId) : undefined
  // A touch long-press opens the app menu at 550 ms, but dnd-kit's 350 ms delay already started a drag.
  // Cancel that drag so the menu's own clicks are not swallowed by the sensor's click guard.
  useEffect(() => {
    if (!activeId) return
    const observer = new MutationObserver(() => {
      if (document.querySelector('.context-menu')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }))
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [activeId])
  const suppressClickAfterDrag = () => {
    if (!movedRef.current) return
    movedRef.current = false
    // Only the click left over from this drag may be swallowed; a fresh press starts clean.
    const block = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); cleanup() }
    let timer = 0
    const cleanup = () => {
      document.removeEventListener('click', block, true)
      document.removeEventListener('pointerdown', cleanup, true)
      window.clearTimeout(timer)
    }
    document.addEventListener('click', block, true)
    document.addEventListener('pointerdown', cleanup, true)
    timer = window.setTimeout(cleanup, 400)
  }
  const focusAfterDrop = (selector: string) => {
    let tries = 0
    const tick = () => {
      const target = document.querySelector<HTMLElement>(selector)
      if (target) { target.focus({ preventScroll: true }); return }
      if (++tries < 40) window.setTimeout(tick, 50)
    }
    window.setTimeout(tick, 0)
  }
  const resetDrag = () => { setActiveId(null); sourceRef.current = null }
  const dragEnd = ({ active, over }: DragEndEvent) => {
    const activeId = String(active.id)
    const sourceGroup = groups.find(group => group.items.some(item => item.id === activeId))
    const fromFolder = sourceGroup && sourceGroup.id !== desktopId
    resetDrag()
    suppressClickAfterDrag()
    if (!over) {
      if (fromFolder) focusAfterDrop(`[data-folder="${CSS.escape(sourceGroup!.id)}"]`)
      return
    }
    const overId = String(over.id)
    if (overId === activeId) {
      if (fromFolder) focusAfterDrop(`[data-folder="${CSS.escape(sourceGroup!.id)}"]`)
      return
    }
    if (!sourceGroup) return
    if (overId.startsWith('folder:')) {
      const folderId = overId.slice(7)
      if (folderId === sourceGroup.id) { focusAfterDrop(`[data-folder="${CSS.escape(folderId)}"]`); return }
      onGroups(current => moveBookmarks(current, [activeId], folderId))
      focusAfterDrop(`[data-folder="${CSS.escape(folderId)}"]`)
      return
    }
    const targetGroup = groups.find(group => group.items.some(item => item.id === overId))
    if (!targetGroup) return
    if (targetGroup.id !== sourceGroup.id) {
      onGroups(current => moveBookmarks(current, [activeId], targetGroup.id, overId))
      focusAfterDrop(`[data-sortable-id="${CSS.escape(activeId)}"] a`)
      return
    }
    const ids = targetGroup.items.map(item => item.id)
    const from = ids.indexOf(activeId), to = ids.indexOf(overId)
    if (from < 0 || to < 0 || from === to) return
    const before = from < to ? ids[to + 1] : ids[to]
    onGroups(current => moveBookmarks(current, [activeId], targetGroup.id, before))
    focusAfterDrop(`[data-sortable-id="${CSS.escape(activeId)}"] a`)
  }
  return <DndContext
    sensors={sensors}
    collisionDetection={displayCollision}
    onDragStart={({ active }) => {
      const id = String(active.id)
      setActiveId(id); movedRef.current = false
      sourceRef.current = groups.find(group => group.items.some(item => item.id === id))?.id ?? null
    }}
    onDragMove={() => { movedRef.current = true }}
    onDragCancel={() => {
      const sourceId = sourceRef.current
      const fromFolder = sourceId && sourceId !== desktopId
      resetDrag()
      suppressClickAfterDrag()
      if (fromFolder) focusAfterDrop(`[data-folder="${CSS.escape(sourceId)}"]`)
    }}
    onDragEnd={dragEnd}
    accessibility={{
      announcements: {
        onDragStart: ({ active }) => copy.pickedUp(nameOf(String(active.id))),
        onDragOver: ({ active, over }) => {
          if (!over) return undefined
          const overId = String(over.id)
          if (overId.startsWith('folder:')) {
            const group = groups.find(candidate => `folder:${candidate.id}` === overId)
            return group ? copy.overFolder(groupName(group)) : undefined
          }
          const group = groups.find(candidate => candidate.items.some(item => item.id === overId))
          const position = group?.items.findIndex(item => item.id === overId) ?? -1
          return position >= 0 ? copy.overPosition(position + 1) : copy.pickedUp(nameOf(String(active.id)))
        },
        onDragEnd: ({ active, over }) => over ? copy.dropped(nameOf(String(active.id))) : copy.cancelled,
        onDragCancel: () => copy.cancelled,
      },
      screenReaderInstructions: { draggable: copy.instructions },
    }}
  >
    <div className={`bookmarks mnt-group mnt-bookmark-${style}`} style={{ '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties} data-reduce-motion={reducedMotion || undefined} data-display-drag>
      {onboarding && <OnboardingCard t={t} onAction={onOnboardingAction} />}
      <SortableContext items={renderedGroups.flatMap(group => group.items.map(item => item.id))} strategy={rectSortingStrategy}>
        {renderedGroups.map(group => <div key={group.id} data-drop-group={group.id}>
          {showGroupTitles && !(onboarding && group.items.length === 0) && <GroupMenuTrigger group={group} className="shortcuts-heading mnt-group-title" ariaLabel={t('groups.menuLabel', { name: groupName(group) })} onGroupContextMenu={onGroupContextMenu}>
            {!folderMode && (group.collapsed || groups.length > 1) ? <button type="button" aria-expanded={!group.collapsed} aria-label={t(group.collapsed ? 'groups.expand' : 'groups.collapse', { name: groupName(group) })} onClick={() => onGroups(current => current.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>{group.collapsed ? '▸' : '▾'}</button> : null}
            <span>{groupName(group)}</span><span className="line" /><span className="count">{String(group.items.length).padStart(2, '0')}</span>
          </GroupMenuTrigger>}
          {(folderMode || !group.collapsed) && <div className="grid" style={{ '--mnt-item-count': group.items.length + (folderMode ? visibleGroups.length - 1 : 0) + (showAdd && group === visibleGroups[0] ? 1 : 0), '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties}>
            {group.items.map(stored => { const item = names.get(stored.id) ?? stored
              return <SortableTile key={item.id} id={item.id} reduceMotion={reducedMotion}>
                <ShortcutLink item={item} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onContextMenu} />
              </SortableTile>
            })}
            {folderMode && <Suspense fallback={null}>{visibleGroups.slice(1).map(folder => <DroppableFolder key={folder.id} folder={folder} name={groupName(folder)} shortcuts={shortcuts} style={style} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} reduceMotion={reduceMotion} reduceTransparency={reduceTransparency} t={t} onContextMenu={onGroupContextMenu} onShortcutContextMenu={onContextMenu} />)}</Suspense>}
            {showAdd && group === visibleGroups[0] && !(onboarding && group.items.length === 0) && <button className="add-shortcut" onClick={() => onAdd(group.id)}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
          </div>}
        </div>)}
      </SortableContext>
      {!groups.length && !onboarding && showAdd && <button className="add-shortcut" onClick={() => onAdd()}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
    </div>
    {/* The overlay is the dragged visual for the whole drag, mouse, pen and touch alike.
        dnd-kit positions it in viewport coordinates, so it must be portalled out of the widget
        frame; otherwise the frame's own offset is added to every position. */}
    {createPortal(<DragOverlay dropAnimation={null}>
      {activeItem ? <div className="shortcut-wrap mnt-drag-overlay" aria-hidden="true"><ShortcutLink item={activeItem} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={false} t={t} onContextMenu={onContextMenu} /></div> : null}
    </DragOverlay>, document.body)}
  </DndContext>
}
