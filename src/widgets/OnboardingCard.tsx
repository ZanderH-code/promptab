import type { Translate } from '../i18n'

export type OnboardingAction = 'add' | 'import' | 'theme' | 'ai' | 'dismiss'

/** `hasWebsites`: starter websites are already there, so the add button should not say "first". */
export function OnboardingCard({ t, onAction, hasWebsites = false }: { t: Translate; onAction: (action: OnboardingAction) => void; hasWebsites?: boolean }) {
  return <section className="onboarding-card" aria-labelledby="onboarding-title">
    <div><span className="editor-kicker">{t('onboarding.kicker')}</span><h2 id="onboarding-title">{t('onboarding.title')}</h2><p>{t('onboarding.description')}</p></div>
    <div className="onboarding-actions">
      <button type="button" data-primary onClick={() => onAction('ai')}>{t('onboarding.ai')}</button>
      <button type="button" onClick={() => onAction('add')}>{t(hasWebsites ? 'shortcuts.add' : 'onboarding.add')}</button>
      <button type="button" onClick={() => onAction('import')}>{t('onboarding.import')}</button>
      <button type="button" onClick={() => onAction('theme')}>{t('onboarding.theme')}</button>
      <button type="button" data-quiet onClick={() => onAction('dismiss')}>{t('onboarding.dismiss')}</button>
    </div>
  </section>
}
