import type { ProfileV2 } from '../../../core/schema/profile'
import { Row, Toggle } from '../controls'
import { Select, touch, type Ctx, type Item } from './shared'

export function aboutItems(ctx: Ctx): Item[] {
  const { t, profile, change } = ctx
  return [
    {
      id: 'language', keys: ['settings.language', 'settings.languageSystem'], words: ['简体中文', 'English'],
      node: (
        <Row label={t('settings.language')}>
          <Select ctx={ctx} label={t('settings.language')} value={profile.prefs.language} onChange={value => change(p => touch({ ...p, prefs: { ...p.prefs, language: value as ProfileV2['prefs']['language'] } }))}
            options={[{ value: 'system', label: t('settings.languageSystem') }, { value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} />
        </Row>
      ),
    },
    {
      id: 'page-title', keys: ['settings.pageTitle', 'settings.hint.pageTitle'], words: ['tab', 'title', '标签页', '标题'],
      node: (
        <Row label={t('settings.pageTitle')} hint={t('settings.hint.pageTitle')} changed={!!profile.prefs.pageTitle} onReset={() => change(p => { const { pageTitle: _removed, ...prefs } = p.prefs; return touch({ ...p, prefs }) })} resetLabel={t('settings.resetRow', { label: t('settings.pageTitle') })}>
          <input className="sd-input" maxLength={80} value={profile.prefs.pageTitle ?? ''} placeholder={t('app.title')} aria-label={t('settings.pageTitle')} onChange={event => { const title = event.target.value; change(p => { const { pageTitle: _removed, ...prefs } = p.prefs; return touch({ ...p, prefs: title ? { ...prefs, pageTitle: title } : prefs }) }) }} />
        </Row>
      ),
    },
    { id: 'keyboard-shortcuts', keys: ['settings.keyboardShortcuts'], node: <Toggle label={t('settings.keyboardShortcuts')} checked={profile.prefs.keyboardShortcuts} onChange={keyboardShortcuts => change(p => touch({ ...p, prefs: { ...p.prefs, keyboardShortcuts } }))} /> },
    { id: 'about', keys: ['settings.about', 'settings.aboutText', 'settings.intro', 'settings.privacy'], node: <div className="sd-note"><p>{t('settings.aboutText')}</p><p>{t('settings.intro')}</p><p><a href="https://zanderh-code.github.io/promptab/privacy/" target="_blank" rel="noopener noreferrer">{t('settings.privacy')}</a></p></div> },
  ]
}
