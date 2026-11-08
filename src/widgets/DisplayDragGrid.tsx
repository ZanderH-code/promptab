import { Plus } from 'lucide-react'
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { DndContext, PointerSensor, TouchSensor, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core'
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
const displayCollision: CollisionDetection = args => {
  const hits = pointerWithin(args)
  const folder = hits.find(hit => String(hit.id).startsWith('folder:'))
  return folder ? [folder] : hits
}

function SortableTile({ id, moved, reduceMotion, children }: { id: string; moved: boolean; reduceMotion: boolean; children: ReactNode }) {
  const { listeners, setNodeRef, transform, isDragging } = useSortable({ id })
  return <div
    ref={setNodeRef}
    className="shortcut-wrap"
    data-sortable-id={id}
    data-dragging={isDragging ? 'true' : undefined}
    style={{ transform: DndCSS.Transform.toString(transform), transition: isDragging || reduceMotion ? undefined : 'transform 180ms ease', opacity: isDragging && moved ? 0.45 : 1 }}
    {...listeners}
    onPointerDown={event => { if (event.pointerType !== 'touch') listeners?.onPointerDown?.(event) }}
  >{children}</div>
}

function DroppableFolder({ folder, name, shortcuts, style, iconColor, openInNewTab, liftOnHover, reduceMotion, reduceTransparency, t, onContextMenu, onShortcutContextMenu }: {
  folder: Group; name: string; shortcuts: Shortcut[]; style: Props['style']; iconColor: Props['iconColor']; openInNewTab: boolean; liftOnHover: boolean
  reduceMotion: 'system' | 'on' | 'off'; reduceTransparency: 'system' | 'on' | 'off'; t: Translate
  onContextMenu: Props['onGroupContextMenu']; onShortcutContextMenu: Props['onContextMenu']
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}`, data: { folderId: folder.id } })
  return <BookmarkFolder group={folder} name={name} shortcuts={shortcuts} style={style} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} reduceMotion={reduceMotion} reduceTransparency={reduceTransparency} t={t} onContextMenu={onContextMenu} onShortcutContextMenu={onShortcutContextMenu} dropRef={setNodeRef} dropActive={isOver} />
}

export function DisplayDragGrid({ groups, shortcuts, onboarding, onOnboardingAction, t, language, onGroups, onAdd, onContextMenu, onGroupContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor, openInNewTab, liftOnHover, reduceMotion = 'system', reduceTransparency = 'system' }: Props) {
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const folderMode = source === 'all' && visibleGroups.length >= 2
  const renderedGroups = folderMode ? visibleGroups.slice(0, 1) : visibleGroups
  const names = new Map(shortcuts.map(item => [item.id, item]))
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  const reducedMotion = reduceMotion === 'on' || (reduceMotion === 'system' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [moved, setMoved] = useState(false)
  const movedRef = useRef(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
  )
  const copy = strings[language]
  const nameOf = (id: string) => { for (const group of groups) { const item = group.items.find(candidate => candidate.id === id); if (item) return item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name } return id }
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
    const block = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); cleanup() }
    let timer = 0
    const cleanup = () => { document.removeEventListener('click', block, true); window.clearTimeout(timer) }
    document.addEventListener('click', block, true)
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
  const dragEnd = ({ active, over }: DragEndEvent) => {
    const activeId = String(active.id)
    setActiveId(null); setMoved(false)
    suppressClickAfterDrag()
    if (!over) return
    const overId = String(over.id)
    if (overId === activeId) return
    const sourceGroup = groups.find(group => group.items.some(item => item.id === activeId))
    if (!sourceGroup) return
    if (overId.startsWith('folder:')) {
      const folderId = overId.slice(7)
      if (folderId === sourceGroup.id) return
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
    onDragStart={({ active }) => { setActiveId(String(active.id)); movedRef.current = false; setMoved(false) }}
    onDragMove={() => { if (!movedRef.current) { movedRef.current = true; setMoved(true) } }}
    onDragCancel={() => { setActiveId(null); setMoved(false); suppressClickAfterDrag() }}
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
          const position = visibleGroups[0]?.items.findIndex(item => item.id === overId) ?? -1
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
              return <SortableTile key={item.id} id={item.id} moved={moved} reduceMotion={reducedMotion}>
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
  </DndContext>
}
