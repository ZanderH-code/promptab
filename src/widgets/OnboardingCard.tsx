import type { Translate } from '../i18n'

export function OnboardingCard({ t, onAction }: { t: Translate; onAction: (action: 'add' | 'import' | 'theme' | 'ai') => void }) {
  return <section className="onboarding-card" aria-labelledby="onboarding-title">
    <div><span className="editor-kicker">{t('onboarding.kicker')}</span><h2 id="onboarding-title">{t('onboarding.title')}</h2><p>{t('onboarding.description')}</p></div>
    <div className="onboarding-actions">
      <button type="button" data-primary onClick={() => onAction('ai')}>{t('onboarding.ai')}</button>
      <button type="button" onClick={() => onAction('add')}>{t('onboarding.add')}</button>
      <button type="button" onClick={() => onAction('import')}>{t('onboarding.import')}</button>
      <button type="button" onClick={() => onAction('theme')}>{t('onboarding.theme')}</button>
    </div>
  </section>
}
