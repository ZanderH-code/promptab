import type { CSSProperties, MouseEvent } from 'react'
import type { Shortcut } from '../core/model'
import type { Translate } from '../i18n'
import { WebsiteIcon } from './WebsiteIcon'

const linkHost = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return undefined } }

export function ShortcutLink({ item, iconColor, t, onContextMenu }: {
  item: Shortcut; iconColor: 'per-site' | 'accent'; t: Translate; onContextMenu: (event: MouseEvent, shortcut: Shortcut) => void
}) {
  const name = item.builtinName === 'sample-website' ? t('builtin.sampleWebsite') : item.name
  const icon = item.builtinIcon === 'sample-website' ? t('builtin.sampleWebsiteIcon') : item.icon
  return <a className="shortcut mnt-link" data-link-host={linkHost(item.url)} title={name} href={item.url} onContextMenu={event => onContextMenu(event, item)} onKeyDown={event => { if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); event.stopPropagation(); onContextMenu(event as unknown as MouseEvent, item) } }}><span className="shortcut-icon mnt-link-icon" {...(!item.builtinIcon && !item.image ? { 'data-user-content': true } : {})} style={{ '--tile': item.id === 'example' && item.color.toLowerCase() === '#90d5cd' ? 'var(--mnt-accent)' : item.color } as CSSProperties}><WebsiteIcon shortcut={{ ...item, icon, ...(iconColor === 'accent' ? { iconColorMode: 'accent' as const } : {}) }} /></span><span className="mnt-link-name" {...(item.builtinName ? {} : { 'data-user-content': true })}>{name}</span></a>
}

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
