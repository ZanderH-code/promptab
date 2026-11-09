import type { MessageKey } from '../../../i18n'
import { RangeField, Row, Toggle } from '../controls'
import { Highlighted } from '../searchHighlight'
import { Select, touch, type Ctx, type Item } from './shared'

export function shortcutsItems(ctx: Ctx): Item[] {
  const { t, s, profile, change } = ctx
  const styles = [['tile', 'settings.bookmarkTile'], ['list', 'settings.bookmarkList'], ['minimal', 'settings.bookmarkMinimal'], ['card', 'settings.bookmarkCard'], ['icon-only', 'settings.bookmarkIconOnly']] as const
  const items: Item[] = [
    { id: 'shortcuts', keys: ['settings.shortcuts', 'settings.shortcutsHint'], node: <div className="sd-note"><p><Highlighted text={t('settings.shortcutsHint')} /></p><p><Highlighted text={t(s.shortcuts.length === 1 ? 'settings.shortcutsCountOne' : 'settings.shortcutsCount', { count: s.shortcuts.length })} /></p></div> },
    { id: 'edit-websites', keys: ['settings.editWebsites'], node: <button type="button" className="sd-button sd-primary" onClick={() => ctx.onEnterEditMode?.()}>{t('settings.editWebsites')}</button> },
  ]
  for (const widget of profile.widgets) {
    if (widget.type !== 'bookmarks') continue
    const patch = (updates: Record<string, unknown>) => change(current => touch({ ...current, widgets: current.widgets.map(item => item.id === widget.id ? { ...item, props: { ...item.props, ...updates } } : item) as typeof current.widgets }))
    const row = (key: string, keys: MessageKey[], node: Item['node']) => items.push({ id: `${widget.id}-${key}`, keys, node })
    row('style', ['settings.bookmarkStyle', ...styles.map(([, key]) => key)], <Row label={t('settings.bookmarkStyle')}><Select ctx={ctx} label={t('settings.bookmarkStyle')} value={widget.props.style ?? 'tile'} options={styles.map(([value, key]) => ({ value, label: t(key) }))} onChange={style => patch({ style })} /></Row>)
    row('source', ['settings.bookmarkSource', 'settings.bookmarkAll'], <Row label={t('settings.bookmarkSource')}><Select ctx={ctx} label={t('settings.bookmarkSource')} value={widget.props.source ?? 'all'} options={[{ value: 'all', label: t('settings.bookmarkAll') }, ...profile.bookmarks.groups.map(group => ({ value: group.id, label: group.builtinName ? t('builtin.quickLinks') : group.name }))]} onChange={source => patch({ source })} /></Row>)
    row('titles', ['settings.bookmarkTitles'], <Toggle label={t('settings.bookmarkTitles')} checked={widget.props.showGroupTitles !== false} onChange={showGroupTitles => patch({ showGroupTitles })} />)
    row('icon-color', ['settings.bookmarkIconAccent'], <Toggle label={t('settings.bookmarkIconAccent')} checked={widget.props.iconColor === 'accent'} onChange={enabled => patch({ iconColor: enabled ? 'accent' : 'per-site' })} />)
    row('columns', ['settings.columns'], <RangeField t={t} label={t('settings.columns')} value={widget.props.maxColumns ?? s.columns} min={2} max={10} step={1} onChange={maxColumns => patch({ maxColumns })} />)
  }
  return items
}
