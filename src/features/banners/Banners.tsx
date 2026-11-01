import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { Translate } from '../../i18n'

/** Top-of-page banners. They sit in the guard layer, so user CSS cannot hide or move them. */
export function Banners({ children }: { children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null)
  // The settings drawer starts below the banners instead of hiding behind them.
  useLayoutEffect(() => {
    const element = node.current
    if (!element) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--mnt-banner-h', `${element.offsetHeight}px`)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(element)
    return () => { observer?.disconnect(); root.style.removeProperty('--mnt-banner-h') }
  }, [])
  return <div ref={node} className="mnt-banners">{children}</div>
}

type SafeProps = { t: Translate; canRollback: boolean; onEditCss: () => void; onRollback: () => void; onExit: () => void }

export function SafeModeBanner({ t, canRollback, onEditCss, onRollback, onExit }: SafeProps) {
  return (
    <div className="mnt-banner" data-kind="safe" role="status">
      <span className="mnt-banner-text"><strong>{t('safe.banner')}</strong> · {t('safe.hint')}</span>
      <button type="button" onClick={onEditCss}>{t('safe.editCss')}</button>
      <button type="button" disabled={!canRollback} title={canRollback ? undefined : t('safe.rollbackNone')} onClick={onRollback}>{t('safe.rollback')}</button>
      <button type="button" data-primary onClick={onExit}>{t('safe.exit')}</button>
    </div>
  )
}

type PreviewProps = { t: Translate; name: string; onApply: () => void; onDiscard: () => void }

/** Shown while an AI theme is previewed but not yet saved. */
export function PreviewBanner({ t, name, onApply, onDiscard }: PreviewProps) {
  return (
    <div className="mnt-banner" data-kind="preview" role="status">
      <span className="mnt-banner-text"><strong>{t('ai.previewing', { name })}</strong> · {t('ai.previewHint')}</span>
      <button type="button" onClick={onDiscard}>{t('ai.discard')}</button>
      <button type="button" data-primary onClick={onApply}>{t('ai.apply')}</button>
    </div>
  )
}
