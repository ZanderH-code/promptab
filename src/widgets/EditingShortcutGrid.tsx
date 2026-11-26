import { ArrowDown, ArrowDownAZ, ArrowRight, ArrowUp, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Group, ShortcutGridProps } from './ShortcutGrid'
import { SortableShortcut } from './SortableShortcut'
import { GroupMenuTrigger, ShortcutLink } from './ShortcutGridContent'
import { OnboardingCard } from './OnboardingCard'
import { moveBookmarks } from './bookmarkGroups'
import { reorderGroup, sortItemsByName } from './groupOrder'
import { FormDialog } from '../ui/FormDialog'
import '../i18n/lazy'

type Props = ShortcutGridProps
const groupAwareCollision: CollisionDetection = args => {
  const pointerHits = pointerWithin(args)
  if (pointerHits.length) return pointerHits.filter(hit => !String(hit.id).startsWith('group:')).length ? pointerHits.filter(hit => !String(hit.id).startsWith('group:')) : pointerHits
  return closestCorners(args)
}
function DropGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `group:${id}`, data: { groupId: id } })
  return <div ref={setNodeRef} data-drop-group={id}>{children}</div>
}
/** Only mounted in edit mode (see ShortcutGrid), so every edit control is always on here. */
export function EditingShortcutGrid({ groups, shortcuts, onboarding, onOnboardingAction, t, language, onGroups, onEdit, onRemove, onMove, onAdd, onContextMenu, onGroupContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor, openInNewTab, liftOnHover }: Props) {
  const [picked, setSelected] = useState<string[]>([])
  // Websites can disappear by other routes (single delete, undo, import): only count what is still there.
  const present = new Set(groups.flatMap(group => group.items.map(item => item.id)))
  const selected = picked.filter(id => present.has(id))
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const [dialog, setDialog] = useState<{ kind: 'name'; id?: string; value: string; invalid?: boolean } | { kind: 'delete-group'; id: string } | { kind: 'delete-selected' } | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const dragTarget = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null)
  const names = new Map(shortcuts.map(item => [item.id, item]))
  // The edit toolbar's "Add group" asks the first bookmarks grid on the page to open its name dialog.
  useEffect(() => {
    const addGroup = (event: Event) => {
      if (event.defaultPrevented) return
      event.preventDefault()
      setDialog({ kind: 'name', value: '' })
    }
    window.addEventListener('mnt:add-group', addGroup)
    return () => window.removeEventListener('mnt:add-group', addGroup)
  }, [])
  const update = (fn: (groups: Group[]) => Group[]) => onGroups(fn)
  const move = (ids: string[], group: string, before?: string) => update(current => moveBookmarks(current, ids, group, before))
  function dragStart({ active }: import('@dnd-kit/core').DragStartEvent) {
    const activeId = String(active.id)
    const source = document.querySelector<HTMLElement>(`[data-sortable-id="${CSS.escape(activeId)}"]`)
    if (!source) return
    const rect = source.getBoundingClientRect()
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
    dragTarget.current = { id: activeId, startX: x, startY: y, x, y }
  }
  function dragMove({ active, delta }: DragMoveEvent) {
    if (dragTarget.current?.id === String(active.id)) {
      dragTarget.current = { ...dragTarget.current, x: dragTarget.current.startX + delta.x, y: dragTarget.current.startY + delta.y }
    }
  }
  function dragEnd({ active, over }: DragEndEvent) {
    const activeId = String(active.id)
    const pointerTarget = dragTarget.current?.id === activeId ? dragTarget.current : undefined
    dragTarget.current = null
    if (!over || activeId === String(over.id)) return
    const sourceGroup = groups.find(candidate => candidate.items.some(item => item.id === activeId))
    const target = String(over.id)
    const targetGroup = target.startsWith('group:')
      ? groups.find(group => `group:${group.id}` === target)
      : groups.find(group => group.items.some(item => item.id === target))
    const pointerGroupId = pointerTarget && document.elementFromPoint(pointerTarget.x, pointerTarget.y)?.closest<HTMLElement>('[data-drop-group]')?.dataset.dropGroup
    const destination = targetGroup ?? groups.find(group => group.id === pointerGroupId)
    if (!sourceGroup || !destination) return
    const ids = selected.includes(activeId) ? selected : [activeId]
    if (sourceGroup.id !== destination.id) {
      // A drop on a tile in another group lands before that tile; a drop on the group area appends.
      move(ids, destination.id, !target.startsWith('group:') && !ids.includes(target) ? target : undefined)
      return
    }
    if (target.startsWith('group:')) return
    // Reorder the saved group, not this render's copy: an earlier save may still be on its way.
    update(current => current.map(group => {
      if (group.id !== destination.id) return group
      const from = group.items.findIndex(item => item.id === activeId), to = group.items.findIndex(item => item.id === target)
      if (from < 0 || to < 0) return group
      const items = [...group.items]
      items.splice(to, 0, ...items.splice(from, 1))
      return { ...group, items }
    }))
  }
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  const itemName = (item: Group['items'][number]) => {
    const live = names.get(item.id) ?? item
    return live.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : live.name
  }
  const reorder = (id: string, delta: -1 | 1) => update(current => reorderGroup(current, id, delta))
  const groupIndex = (id: string) => groups.findIndex(group => group.id === id)
  const sortGroup = (group: Group) => update(current => current.map(candidate => candidate.id === group.id ? { ...candidate, items: sortItemsByName(candidate.items, itemName, language) } : candidate))
  const hasItems = visibleGroups.some(group => group.items.length > 0)
  return <div className={`bookmarks mnt-group mnt-bookmark-${style}`} style={{ '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties}>
    {onboarding && !hasItems && <OnboardingCard t={t} onAction={onOnboardingAction} />}
    {selected.length > 0 && <div className="bookmark-edit-tools">
      <>
        <span>{t('groups.selected', { count: selected.length })}</span>
        <select aria-label={t('groups.moveSelected')} value="" onChange={event => { if (event.target.value) { move(selected, event.target.value); setSelected([]) } }}><option value="">{t('groups.moveTo')}</option>{groups.map(g => <option key={g.id} value={g.id}>{groupName(g)}</option>)}</select>
        <button type="button" onClick={() => setDialog({ kind: 'delete-selected' })}>{t('groups.deleteSelected')}</button>
        <button type="button" onClick={() => setSelected([])}>{t('common.cancel')}</button>
      </>
    </div>}
    <DndContext sensors={sensors} collisionDetection={groupAwareCollision} onDragStart={dragStart} onDragMove={dragMove} onDragEnd={dragEnd}>
      <SortableContext items={visibleGroups.flatMap(group => group.items.map(item => item.id))} strategy={rectSortingStrategy}>
      {visibleGroups.map(group => <DropGroup key={group.id} id={group.id}>
        {!(onboarding && group.items.length === 0) && <GroupMenuTrigger group={group} className={`shortcuts-heading mnt-group-title ${showGroupTitles ? '' : 'mnt-group-title-hidden'}`} ariaLabel={t('groups.menuLabel', { name: groupName(group) })} onGroupContextMenu={onGroupContextMenu}>
          <button type="button" aria-expanded={!group.collapsed} aria-label={t(group.collapsed ? 'groups.expand' : 'groups.collapse', { name: groupName(group) })} onClick={() => update(current => current.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>{group.collapsed ? '▸' : '▾'}</button>
          <span className="mnt-group-name">{groupName(group)}</span><span className="line" /><span className="count">{String(group.items.length).padStart(2, '0')}</span>          <div className="group-actions">
            <button type="button" aria-label={t('groups.moveUpNamed', { name: groupName(group) })} disabled={groupIndex(group.id) <= 0} onClick={() => reorder(group.id, -1)}><ArrowUp size={15} aria-hidden="true" /></button>
            <button type="button" aria-label={t('groups.moveDownNamed', { name: groupName(group) })} disabled={groupIndex(group.id) >= groups.length - 1} onClick={() => reorder(group.id, 1)}><ArrowDown size={15} aria-hidden="true" /></button>
            <button type="button" aria-label={t('groups.sortAZNamed', { name: groupName(group) })} disabled={group.items.length < 2} onClick={() => sortGroup(group)}><ArrowDownAZ size={15} aria-hidden="true" /></button>
            <button type="button" aria-label={t('groups.rename')} onClick={() => setDialog({ kind: 'name', id: group.id, value: groupName(group) })}><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={t('groups.delete')} onClick={() => setDialog({ kind: 'delete-group', id: group.id })}><X size={15} aria-hidden="true" /></button>
          </div>
        </GroupMenuTrigger>}
        {!group.collapsed && <div className="grid" style={{ '--mnt-item-count': group.items.length + (showAdd && group === visibleGroups[0] ? 1 : 0), '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties}>
          {group.items.map(stored => { const item = names.get(stored.id) ?? stored; const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
            return <SortableShortcut id={item.id} groupId={group.id} dragLabel={t('shortcuts.drag')} key={item.id}>
              <input type="checkbox" aria-label={t('groups.select', { name })} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />
              <ShortcutLink item={item} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onContextMenu} />
              <div className="shortcut-actions"><button aria-label={t('shortcuts.editNamed', { name })} onClick={() => onEdit(item)}><span className="visually-hidden">{t('common.edit')}</span><Pencil size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.moveToGroupNamed', { name: item.builtinName ? name : item.name })} onClick={() => onMove(item)}><span className="visually-hidden">{t('shortcuts.moveToGroup')}</span><ArrowRight size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.deleteNamed', { name })} onClick={() => onRemove(item)}><span className="visually-hidden">{t('shortcuts.delete')}</span><X size={16} aria-hidden="true" /></button></div>
            </SortableShortcut> })}
          {!(onboarding && group.items.length === 0) && <button className="add-shortcut" onClick={() => onAdd(group.id)}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
        </div>}
      </DropGroup>)}
      </SortableContext>
    </DndContext>
    {dialog && <FormDialog
      title={dialog.kind === 'name' ? t(dialog.id ? 'groups.rename' : 'groups.add') : t(dialog.kind === 'delete-group' ? 'groups.delete' : 'groups.deleteSelected')}
      cancelLabel={t('common.cancel')} submitLabel={t(dialog.kind === 'name' ? 'groups.save' : 'groups.confirm')} danger={dialog.kind !== 'name'} focusSubmit={dialog.kind !== 'name'}
      onCancel={() => setDialog(null)}
      onSubmit={() => {
        if (dialog.kind === 'name') {
          const name = dialog.value.trim()
          if (!name) { setDialog({ ...dialog, invalid: true }); return }
          if (dialog.id) update(current => current.map(g => { if (g.id !== dialog.id) return g; const { builtinName: _builtinName, ...rest } = g; return { ...rest, name } }))
          else update(current => [...current, { id: crypto.randomUUID(), name, collapsed: false, items: [] }])
        } else if (dialog.kind === 'delete-group') { update(current => current.filter(g => g.id !== dialog.id)); setSelected([]) }
        else { update(current => current.map(g => ({ ...g, items: g.items.filter(item => !selected.includes(item.id)) }))); setSelected([]) }
        setDialog(null)
      }}>
      {dialog.kind === 'name'
        ? <><label className="stack">{t('groups.name')}<input autoFocus maxLength={60} value={dialog.value} aria-invalid={dialog.invalid || undefined} aria-describedby={dialog.invalid ? 'group-name-error' : undefined} onChange={event => setDialog({ ...dialog, value: event.target.value, invalid: false })} /></label>
        {dialog.invalid && <small id="group-name-error" role="alert" className="mnt-form-error">{t('groups.nameRequired')}</small>}</>
        : <p>{t(dialog.kind === 'delete-group' ? 'groups.confirmDelete' : 'groups.confirmSelected')}</p>}
    </FormDialog>}
    {!groups.length && !onboarding && <button className="add-shortcut" onClick={() => onAdd()}><span><Plus size={24} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
    {onboarding && hasItems && <OnboardingCard t={t} onAction={onOnboardingAction} hasWebsites />}
  </div>
}
