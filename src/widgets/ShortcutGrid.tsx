import { ArrowRight, Pencil, Plus, X } from 'lucide-react'
import { useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { ProfileV2 } from '../core/schema/profile'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import { SortableShortcut } from './SortableShortcut'
import { WebsiteIcon } from './WebsiteIcon'
import { moveBookmarks } from './bookmarkGroups'

type Group = ProfileV2['bookmarks']['groups'][number]
type Props = {
  groups: Group[]; shortcuts: Shortcut[]; editing: boolean; onManageDone: () => void; t: Translate; language: 'en' | 'zh-CN'
  style: 'tile' | 'list' | 'minimal' | 'card' | 'icon-only'; source: string; showGroupTitles: boolean; maxColumns: number; showAdd: boolean; iconColor: 'per-site' | 'accent'
  onGroups: (update: (groups: Group[]) => Group[]) => void
  onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onMove: (shortcut: Shortcut) => void; onAdd: (groupId?: string) => void
  onContextMenu: (event: MouseEvent, shortcut: Shortcut) => void
  onboarding: boolean; onOnboardingAction: (action: 'add' | 'import' | 'theme' | 'ai') => void
}
const linkHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined } }
const groupAwareCollision: CollisionDetection = args => {
  const pointerHits = pointerWithin(args)
  if (pointerHits.length) return pointerHits.filter(hit => !String(hit.id).startsWith('group:')).length ? pointerHits.filter(hit => !String(hit.id).startsWith('group:')) : pointerHits
  return closestCorners(args)
}
function DropGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `group:${id}`, data: { groupId: id } })
  return <div ref={setNodeRef} data-drop-group={id}>{children}</div>
}
export function ShortcutGrid({ groups, shortcuts, editing, onboarding, onOnboardingAction, onManageDone, t, onGroups, onEdit, onRemove, onMove, onAdd, onContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const [dialog, setDialog] = useState<{ kind: 'name'; id?: string; value: string } | { kind: 'delete-group'; id: string } | { kind: 'delete-selected' } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const dragTarget = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null)
  const names = new Map(shortcuts.map(item => [item.id, item]))
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
    const sourceGroup = groups.find(candidate => candidate.items.some(item => item.id === activeId))
    if (!over) return
    if (activeId === over.id) return
    const target = String(over.id)
    const overGroup = target.startsWith('group:')
      ? groups.find(group => `group:${group.id}` === target)
      : groups.find(group => group.items.some(item => item.id === target))
    const pointerGroupId = pointerTarget && document.elementFromPoint(pointerTarget.x, pointerTarget.y)?.closest<HTMLElement>('[data-drop-group]')?.dataset.dropGroup
    const targetGroup = overGroup ?? groups.find(group => group.id === pointerGroupId)
    if (sourceGroup && targetGroup && sourceGroup.id !== targetGroup.id) {
      move(selected.includes(activeId) ? selected : [activeId], targetGroup.id)
      return
    }
    const currentGroup = sourceGroup
    if (!targetGroup) return
    if (target.startsWith('group:') && targetGroup.id === currentGroup?.id) return
    if (!target.startsWith('group:') && targetGroup.id === currentGroup?.id) {
      const groupItems = targetGroup.items.map(item => item.id)
      const from = groupItems.indexOf(activeId), to = groupItems.indexOf(target)
      if (from < 0 || to < 0) return
      const reordered = [...groupItems]
      reordered.splice(from, 1)
      reordered.splice(to, 0, activeId)
      update(current => current.map(group => group.id === targetGroup.id ? { ...group, items: reordered.map(id => group.items.find(item => item.id === id)!) } : group))
      return
    }
    move(selected.includes(activeId) ? selected : [activeId], targetGroup.id, target.startsWith('group:') ? undefined : target)
  }
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  return <div className={`bookmarks mnt-group mnt-bookmark-${style}`} style={{ '--mnt-columns': maxColumns } as CSSProperties}>
    {onboarding && <section className="onboarding-card" aria-labelledby="onboarding-title">
      <div><span className="editor-kicker">{t('onboarding.kicker')}</span><h2 id="onboarding-title">{t('onboarding.title')}</h2><p>{t('onboarding.description')}</p></div>
      <div className="onboarding-actions">
        <button type="button" data-primary onClick={() => onOnboardingAction('ai')}>{t('onboarding.ai')}</button>
        <button type="button" onClick={() => onOnboardingAction('add')}>{t('onboarding.add')}</button>
        <button type="button" onClick={() => onOnboardingAction('import')}>{t('onboarding.import')}</button>
        <button type="button" onClick={() => onOnboardingAction('theme')}>{t('onboarding.theme')}</button>
      </div>
    </section>}
    {editing && <div className="bookmark-edit-tools">
      <button type="button" onClick={() => setDialog({ kind: 'name', value: '' })}>{t('groups.add')}</button>
      {selected.length > 0 && <>
        <span>{t('groups.selected', { count: selected.length })}</span>
        <select aria-label={t('groups.moveSelected')} value="" onChange={event => { if (event.target.value) { move(selected, event.target.value); setSelected([]) } }}><option value="">{t('groups.moveTo')}</option>{groups.map(g => <option key={g.id} value={g.id}>{groupName(g)}</option>)}</select>
        <button type="button" onClick={() => setDialog({ kind: 'delete-selected' })}>{t('groups.deleteSelected')}</button>
      </>}
    </div>}
    <DndContext sensors={sensors} collisionDetection={groupAwareCollision} onDragStart={dragStart} onDragMove={dragMove} onDragEnd={dragEnd}>
      <SortableContext items={visibleGroups.flatMap(group => group.items.map(item => item.id))} strategy={rectSortingStrategy}>
      {visibleGroups.map(group => <DropGroup key={group.id} id={group.id}>
        {(showGroupTitles || editing) && !(onboarding && group.items.length === 0) && <div className={`shortcuts-heading mnt-group-title ${showGroupTitles ? '' : 'mnt-group-title-hidden'}`}>
          {editing || group.collapsed || groups.length > 1 ? <button type="button" aria-expanded={!group.collapsed} aria-label={t(group.collapsed ? 'groups.expand' : 'groups.collapse', { name: groupName(group) })} onClick={() => update(current => current.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>{group.collapsed ? '▸' : '▾'}</button> : null}
          <span>{groupName(group)}</span><span className="line" /><span className="count">{String(group.items.length).padStart(2, '0')}</span>
          {editing && <div className="group-actions"><button type="button" aria-label={t('groups.rename')} onClick={() => setDialog({ kind: 'name', id: group.id, value: groupName(group) })}><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={t('groups.delete')} onClick={() => setDialog({ kind: 'delete-group', id: group.id })}><X size={15} aria-hidden="true" /></button></div>}
        </div>}
        {!group.collapsed && <div className="grid" style={{ '--mnt-item-count': group.items.length + (showAdd && group === visibleGroups[0] ? 1 : 0), '--mnt-columns': maxColumns } as CSSProperties}>
          {group.items.map((stored, index) => { const item = names.get(stored.id) ?? stored; const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name; const icon = item.builtinIcon === 'sample-website' ? t('builtin.sampleWebsiteIcon') : item.icon
            return <SortableShortcut id={item.id} enabled={editing} groupId={group.id} dragLabel={t('shortcuts.drag')} key={item.id}>
              {editing && <input type="checkbox" aria-label={t('groups.select', { name })} checked={selected.includes(item.id)} onChange={event => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />}
              <a className="shortcut mnt-link" data-link-host={linkHost(item.url)} title={name} href={item.url} onContextMenu={event => onContextMenu(event, item)} onKeyDown={event => { if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); event.stopPropagation(); onContextMenu(event as unknown as MouseEvent, item) } }}><span className="shortcut-icon mnt-link-icon" {...(!item.builtinIcon && !item.image ? { 'data-user-content': true } : {})} style={{ '--tile': item.id === 'example' && item.color.toLowerCase() === '#90d5cd' ? 'var(--mnt-accent)' : item.color } as CSSProperties}><WebsiteIcon shortcut={{ ...item, icon, ...(iconColor === 'accent' ? { iconColorMode: 'accent' as const } : {}) }} /></span><span className="mnt-link-name" {...(item.builtinName ? {} : { 'data-user-content': true })}>{name}</span></a>
              {editing && <div className="shortcut-actions"><button aria-label={t('shortcuts.editNamed', { name })} onClick={() => onEdit(item)}><span className="visually-hidden">{t('common.edit')}</span><Pencil size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.moveToGroupNamed', { name: item.builtinName ? name : item.name })} onClick={() => onMove(item)}><span className="visually-hidden">{t('shortcuts.moveToGroup')}</span><ArrowRight size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.deleteNamed', { name })} onClick={() => onRemove(item)}><span className="visually-hidden">{t('shortcuts.delete')}</span><X size={16} aria-hidden="true" /></button></div>}
            </SortableShortcut> })}
          {(editing || (showAdd && group === visibleGroups[0])) && !(onboarding && group.items.length === 0) && <button className="add-shortcut" onClick={() => onAdd(group.id)}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
          {editing && group === visibleGroups[0] && <button className="edit-done" type="button" onClick={onManageDone}>{t('groups.done')}</button>}
        </div>}
      </DropGroup>)}
      </SortableContext>
    </DndContext>
    {dialog && <div role="dialog" aria-modal="true" aria-label={dialog.kind === 'name' ? t('groups.name') : t(dialog.kind === 'delete-group' ? 'groups.confirmDelete' : 'groups.confirmSelected')} className="modal-backdrop">
      <form className="modal" onSubmit={event => { event.preventDefault(); if (dialog.kind === 'name') { const name = dialog.value.trim(); if (!name) return; if (dialog.id) update(current => current.map(g => { if (g.id !== dialog.id) return g; const { builtinName: _builtinName, ...rest } = g; return { ...rest, name } })); else update(current => [...current, { id: crypto.randomUUID(), name, collapsed: false, items: [] }]) } else if (dialog.kind === 'delete-group') { update(current => current.filter(g => g.id !== dialog.id)); setSelected([]) } else { update(current => current.map(g => ({ ...g, items: g.items.filter(item => !selected.includes(item.id)) }))); setSelected([]) } setDialog(null) }}>
        {dialog.kind === 'name' ? <label>{t('groups.name')}<input autoFocus value={dialog.value} onChange={event => setDialog({ ...dialog, value: event.target.value })} /></label> : <p>{t(dialog.kind === 'delete-group' ? 'groups.confirmDelete' : 'groups.confirmSelected')}</p>}
        <button type="button" onClick={() => setDialog(null)}>{t('common.cancel')}</button><button type="submit">{t(dialog.kind === 'name' ? 'groups.save' : 'groups.confirm')}</button>
      </form>
    </div>}
    {!groups.length && !onboarding && (editing || showAdd) && <button className="add-shortcut" onClick={() => onAdd()}><span><Plus size={24} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
  </div>
}
