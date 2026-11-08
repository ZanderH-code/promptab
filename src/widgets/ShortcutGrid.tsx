import { ArrowRight, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { lazy, Suspense, useState, type CSSProperties, type SyntheticEvent } from 'react'
import type { ProfileV2 } from '../core/schema/profile'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import { GroupMenuTrigger, ShortcutLink, type ContextMenuEvent } from './ShortcutGridContent'
import { BookmarkFolder, OnboardingCard } from './lazyWidgets'

export type Group = ProfileV2['bookmarks']['groups'][number]
export type ShortcutGridProps = {
  groups: Group[]; shortcuts: Shortcut[]; editing: boolean; onManageDone: () => void; t: Translate; language: 'en' | 'zh-CN'
  style: 'tile' | 'list' | 'minimal' | 'card' | 'icon-only'; source: string; showGroupTitles: boolean; maxColumns: number; showAdd: boolean; iconColor: 'per-site' | 'accent'; openInNewTab: boolean; liftOnHover: boolean
  reduceMotion?: 'system' | 'on' | 'off'; reduceTransparency?: 'system' | 'on' | 'off'
  onGroups: (update: (groups: Group[]) => Group[]) => void
  onEdit: (shortcut: Shortcut) => void; onRemove: (shortcut: Shortcut) => void; onMove: (shortcut: Shortcut) => void; onAdd: (groupId?: string) => void
  onContextMenu: (event: ContextMenuEvent, shortcut: Shortcut) => void
  onGroupContextMenu: (event: ContextMenuEvent, group: Group) => void
  onboarding: boolean; onOnboardingAction: (action: 'add' | 'import' | 'theme' | 'ai') => void
}
const EditingShortcutGrid = lazy(() => import('./EditingShortcutGrid').then(module => ({ default: module.EditingShortcutGrid })))
const DisplayDragGrid = lazy(() => import('./DisplayDragGrid').then(module => ({ default: module.DisplayDragGrid })))
let swapTimer: ReturnType<typeof setTimeout> | undefined

export function ShortcutGrid(props: ShortcutGridProps) {
  const [dragReady, setDragReady] = useState(false)
  const swap = () => { document.querySelector('.context-menu, .mnt-folder-dialog') || setDragReady(true) }
  // Touch only preloads: remounting mid-gesture would drop the pressed tile and its long-press menu.
  // The swap waits until the gesture is over and the tap's click or menu has had its say.
  // A new press cancels a pending swap, so it can never land inside the next long press.
  // 0 preload, 1 pointer, 2 touch-start, 3 touch-end, 4 press.
  const beginDrag = (mode: 0 | 1 | 2 | 3 | 4) => {
    if (mode === 1) return swap()
    if (mode !== 0) clearTimeout(swapTimer)
    if (mode === 3) swapTimer = setTimeout(swap, 600)
    else void import('./DisplayDragGrid')
  }
  const display = <DisplayShortcutGrid {...props} onDragIntent={props.editing || dragReady ? undefined : beginDrag} />
  return props.editing ? <Suspense fallback={display}><EditingShortcutGrid {...props} /></Suspense>
    : dragReady ? <Suspense fallback={display}><DisplayDragGrid {...props} /></Suspense>
    : display
}

function DisplayShortcutGrid({ groups, shortcuts, editing, onboarding, onOnboardingAction, onManageDone, t, onGroups, onEdit, onMove, onRemove, onAdd, onContextMenu, onGroupContextMenu, style, source, showGroupTitles, maxColumns, showAdd, iconColor, openInNewTab, liftOnHover, reduceMotion = 'system', reduceTransparency = 'system', onDragIntent }: ShortcutGridProps & { onDragIntent?: (mode: 0 | 1 | 2 | 3 | 4) => void }) {
  const visibleGroups = source === 'all' ? groups : groups.filter(group => group.id === source)
  const folderMode = !editing && source === 'all' && visibleGroups.length >= 2
  const names = new Map(shortcuts.map(item => [item.id, item]))
  const groupName = (group: Group) => group.builtinName === 'quick-links' ? t('builtin.quickLinks') : group.name
  // Reserve the edit controls during the first download so resolving Suspense does not move tiles.
  // Portal events bubble through React but not the DOM, so only accept targets inside the grid.
  // A pointerover whose previous target was removed is the dialog closing under the cursor, not a move.
  const intent = (mode: 0 | 1 | 2 | 3 | 4) => onDragIntent && ((event: SyntheticEvent & { pointerType?: string; relatedTarget?: EventTarget | null }) => {
    if (!event.currentTarget.contains(event.target as Node)) return
    if (mode === 1 && (event.pointerType === 'touch' || (event.relatedTarget as Node | null)?.isConnected === false)) return
    onDragIntent(mode)
  })
  return <div className={`bookmarks mnt-group mnt-bookmark-${style}`} style={{ '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties} aria-busy={editing || undefined} onPointerOver={intent(1)} onPointerDown={intent(4)} onTouchStart={intent(2)} onTouchEnd={intent(3)} onTouchCancel={intent(3)} onFocus={intent(0)}>
    {onboarding && <Suspense fallback={null}><OnboardingCard t={t} onAction={onOnboardingAction} /></Suspense>}
    {editing && <div className="bookmark-edit-tools"><button type="button" disabled>{t('groups.add')}</button></div>}
    {(folderMode ? visibleGroups.slice(0, 1) : visibleGroups).map(group => <div key={group.id} data-drop-group={group.id}>
      {(showGroupTitles || editing) && !(onboarding && group.items.length === 0) && <GroupMenuTrigger group={group} className={`shortcuts-heading mnt-group-title ${showGroupTitles ? '' : 'mnt-group-title-hidden'}`} ariaLabel={t('groups.menuLabel', { name: groupName(group) })} onGroupContextMenu={onGroupContextMenu}>
        {!folderMode && (editing || group.collapsed || groups.length > 1) ? <button type="button" aria-expanded={!group.collapsed} aria-label={t(group.collapsed ? 'groups.expand' : 'groups.collapse', { name: groupName(group) })} onClick={() => onGroups(current => current.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>{group.collapsed ? '▸' : '▾'}</button> : null}
        <span>{groupName(group)}</span><span className="line" /><span className="count">{String(group.items.length).padStart(2, '0')}</span>        {editing && <div className="group-actions"><button type="button" aria-label={t('groups.rename')} disabled><Pencil size={15} aria-hidden="true" /></button><button type="button" aria-label={t('groups.delete')} disabled><X size={15} aria-hidden="true" /></button></div>}
      </GroupMenuTrigger>}
      {(folderMode || !group.collapsed) && <div className="grid" style={{ '--mnt-item-count': group.items.length + (folderMode ? visibleGroups.length - 1 : 0) + (showAdd && group === visibleGroups[0] ? 1 : 0), '--mnt-columns': maxColumns, '--mnt-grid-max-width': `${maxColumns * 192 - 12}px` } as CSSProperties}>
        {group.items.map(stored => { const item = names.get(stored.id) ?? stored; const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
          return <div className="shortcut-wrap" data-sortable-id={item.id} key={item.id}>
            {editing && <input type="checkbox" aria-label={t('groups.select', { name })} checked={false} disabled />}
            <ShortcutLink item={item} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} t={t} onContextMenu={onContextMenu} />
            {editing && <div className="shortcut-actions"><button aria-label={t('shortcuts.editNamed', { name })} onClick={() => onEdit(item)}><span className="visually-hidden">{t('common.edit')}</span><Pencil size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.moveToGroupNamed', { name })} onClick={() => onMove(item)}><span className="visually-hidden">{t('shortcuts.moveToGroup')}</span><ArrowRight size={16} aria-hidden="true" /></button><button aria-label={t('shortcuts.deleteNamed', { name })} onClick={() => onRemove(item)}><span className="visually-hidden">{t('shortcuts.delete')}</span><X size={16} aria-hidden="true" /></button></div>}
            {editing && <button className="drag-handle" disabled aria-label={t('shortcuts.drag')}><GripVertical size={20} strokeWidth={1.5} aria-hidden="true" /></button>}
          </div>
        })}
        {folderMode && <Suspense fallback={null}>{visibleGroups.slice(1).map(folder => <BookmarkFolder key={folder.id} group={folder} name={groupName(folder)} shortcuts={shortcuts} style={style} iconColor={iconColor} openInNewTab={openInNewTab} liftOnHover={liftOnHover} reduceMotion={reduceMotion} reduceTransparency={reduceTransparency} t={t} onContextMenu={onGroupContextMenu} onShortcutContextMenu={onContextMenu} />)}</Suspense>}
        {(editing || (showAdd && group === visibleGroups[0])) && !(onboarding && group.items.length === 0) && <button className="add-shortcut" onClick={() => onAdd(group.id)}><span><Plus size={24} strokeWidth={1.5} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
        {editing && group === visibleGroups[0] && <button className="edit-done" type="button" onClick={onManageDone}>{t('groups.done')}</button>}
      </div>}
    </div>)}
    {!groups.length && !onboarding && (editing || showAdd) && <button className="add-shortcut" onClick={() => onAdd()}><span><Plus size={24} aria-hidden="true" /></span>{t('shortcuts.add')}</button>}
  </div>
}
