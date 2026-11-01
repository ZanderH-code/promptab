import type { Ctx, Item } from './shared'

export function shortcutsItems(ctx: Ctx): Item[] {
  const { t, s } = ctx
  return [{ id: 'shortcuts', keys: ['settings.shortcuts', 'settings.shortcutsHint'], node: <div className="sd-note"><p>{t('settings.shortcutsHint')}</p><p>{t('settings.shortcutsCount', { count: s.shortcuts.length })}</p></div> }]
}
