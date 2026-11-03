import { ArrowRight, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { lazy, Suspense, type CSSProperties } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import { ShortcutLink, OnboardingCard, type ContextMenuEvent } from './ShortcutGridContent'

export type Group = ProfileV2['bookmarks']['groups'][number]
export type ShortcutGridProps = {
  groups: Group[]; shortcuts: Shortcut[]; editing: boolean; onManageDone: () => void; t: Translate; language: 'en' | 'zh-CN'
  style: 'tile' | 'list' | 'minimal' | 'card' | 'icon-only'; source: string; showGroupTitles: boolean; maxColumns: number; showAdd: boolean; iconColor: 'per-site' | 'accent'
  onGroups: (update: (groups: Group[]) => Group[]) => void
  onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onMove: (shortcut: Shortcut) => void; onAdd: (groupId?: string) => void
  onContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void
  onboarding: boolean; onOnboardingAction: (action: 'add' | 'import' | 'theme' | 'ai') => void
}
const EditingShortcutGrid = lazy(() => import('./EditingShortcutGrid').then(module => ({ default: module.EditingShortcutGrid })))

export function ShortcutGrid(props: ShortcutGridProps) {
  const display = <DisplayShortcutGrid {...props} />
  return props.editing ? <Suspense fallback={display}><EditingShortcutGrid {...props} /></Suspense> : display
}

function DisplayShortcutGrid({ groups, shortcuts, editing, onboarding, onOnboardingAction, onManageDone, t, onGroups, onEdit, onMove, onRemove, onAdd, onContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor }: ShortcutGridProps) {
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const names = new Map(shortcuts.map(item => [item.id, item]))
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  // Reserve the edit controls during the first download so resolving Suspense does not move tiles.
  return <div className={`bookmarks mnt-group mnt-bookmark-${style}`} style={{ '--mnt-columns': maxColumns } as CSSProperties} aria-busy={editing || undefined}>
    {onboarding && <OnboardingCard t={t} onAction={onOnboardingAction} />}
    {editing && <div className="bookmark-edit-tools"><button type="button" disabled>{t('groups.add')}</button></div>}
    {visibleGroups.map(group => <div key={group.id} data-drop-group={group.id}>
      {(showGroupTitles || editing) && !(onboarding && group.items.length === 0) && <div className={`shortcuts-heading mnt-group-title ${showGroupTitles ? '' : 'mnt-group-title-hidden'}`}>
        {editing || group.collapsed || groups.length > 1 ? <button type="button" aria-expanded={!group.collapsed} aria-label={t(group.collapsed ? 'groups.expand' : 'groups.collapse', { name: groupName(group) })} onClick={() => onGroups(current => current.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>{group.collapsed ? '▸' : '▾'}</button> : null}
        <span>{groupName(group)}</span><span className="line" /><span className="count">{String(group.items.length).padStart(2, '0')}</span>
        {editing && <div className="group-actions"><button type="button" aria-label={t('groups.rename')} disabled><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={t('groups.delete')} disabled><X size={15} aria-hidden="true" /></button></div>}
      </div>}
      {!group.collapsed && <div className="grid" style={{ '--mnt-item-count': group.items.length + (showAdd && group === visibleGroups[0] ? 1 : 0), '--mnt-columns': maxColumns } as CSSProperties}>
        {group.items.map(stored => { const item = names.get(stored.id) ?? stored; const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
          return <div className="shortcut-wrap" data-sortable-id={item.id} key={item.id}>
            {editing && <input type="checkbox" aria-label={t('groups.select', { name })} checked={false} disabled />}
            <ShortcutLink item={item} iconColor={iconColor} t={t} onContextMenu={onContextMenu} />
            {editing && <div className="shortcut-actions"><button aria-label={t('shortcuts.editNamed', { name })} onClick={() => onEdit(item)}><span className="visually-hidden">{t('common.edit')}</span><Pencil size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.moveToGroupNamed', { name })} onClick={() => onMove(item)}><span className="visually-hidden">{t('shortcuts.moveToGroup')}</span><ArrowRight size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.deleteNamed', { name })} onClick={() => onRemove(item)}><span className="visually-hidden">{t('shortcuts.delete')}</span><X size={16} aria-hidden="true" /></button></div>}
            {editing && <button className="drag-handle" disabled aria-label={t('shortcuts.drag')}><GripVertical size={20} strokeWidth={1.5} aria-hidden="true" /></button>}
          </div>
        })}
        {(editing || (showAdd && group === visibleGroups[0])) && !(onboarding && group.items.length === 0) && <button className="add-shortcut" onClick={() => onAdd(group.id)}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
        {editing && group === visibleGroups[0] && <button className="edit-done" type="button" onClick={onManageDone}>{t('groups.done')}</button>}
      </div>}
    </div>)}
    {!groups.length && !onboarding && (editing || showAdd) && <button className="add-shortcut" onClick={() => onAdd()}><span><Plus size={24} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
  </div>
}
