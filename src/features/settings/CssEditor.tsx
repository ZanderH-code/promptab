import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

const CssCodeMirror = lazy(() => import('./CssCodeMirror'))
import { cssIssueText } from '../../core/css/messages'
import { sanitizeCss } from '../../core/css/sanitize'
import { Toggle } from './controls'
import type { Ctx } from './rows'

/**
 * Page-lifetime drafts of the stylesheet editor, keyed by profile id. The drawer unmounts a section
 * when another one is shown, so the editor's own state would drop an unapplied edit on every tab
 * switch or close; keeping the draft here preserves it until Apply, Revert, Clear or a page reload.
 * Keying by profile keeps a draft typed in one profile out of every other one.
 */
const drafts = new Map<string, string>()

/** Textarea editor for the user stylesheet: validates as you type and only applies CSS that passes the filter. */
export function CssEditor({ ctx, safeMode }: { ctx: Ctx; safeMode: boolean }) {
  const { t, profile, change } = ctx
  const profileId = profile.meta.id
  const stored = profile.custom.css
  const [text, setTextState] = useState(() => {
    const draft = drafts.get(profileId)
    return draft !== undefined && draft !== stored ? draft : stored
  })
  const baseline = useRef(stored)
  const setText = (value: string) => {
    setTextState(value)
    if (value === stored) drafts.delete(profileId)
    else drafts.set(profileId, value)
  }
  // Follow outside changes (rollback, restore, import) unless the person has unapplied edits.
  useEffect(() => {
    if (text === baseline.current) { setTextState(stored); drafts.delete(profileId) }
    baseline.current = stored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, profileId])

  const result = useMemo(() => sanitizeCss(text), [text])
  const dirty = text !== stored
  const enabled = profile.custom.cssEnabled
  const apply = () => {
    drafts.delete(profileId)
    change(p => ({ ...p, custom: { ...p.custom, css: result.css === '' ? '' : text, cssEnabled: text.trim() !== '' } }), 'theme')
  }

  return (
    <div className="sd-css">
      <p className="sd-hint">{t('css.hint')}</p>
      {safeMode && <p className="sd-hint" role="note">{t('css.safeNote')}</p>}
      <Toggle label={t('css.enable')} checked={profile.custom.cssEnabled} onChange={value => change(p => ({ ...p, custom: { ...p.custom, cssEnabled: value } }), 'theme')} />
      <Suspense fallback={<textarea className="sd-code" aria-label={t('css.editor')} value={text} onChange={event => setText(event.target.value)} spellCheck={false} rows={12} />}>
        <CssCodeMirror value={text} onChange={setText} label={t('css.editor')} t={t} />
      </Suspense>
      <div className="sd-css-status">
        <span className="sd-usage">{t('css.usage', { kb: (result.bytes / 1024).toFixed(1), rules: result.rules })}</span>
        <span data-state={!enabled ? 'disabled' : result.ok ? (dirty ? 'dirty' : 'ok') : 'error'}>
          {!enabled ? t('css.disabled') : result.ok ? t(dirty ? 'css.dirty' : 'css.applied') : t('css.errorCount', { count: result.errors.length })}
        </span>
      </div>
      {!result.ok && (
        <ul className="sd-css-errors" aria-label={t('css.errorCount', { count: result.errors.length })}>
          {result.errors.map((issue, index) => (
            <li key={index}><code>{t('css.at', { line: issue.line, column: issue.column })}</code> {cssIssueText(t, issue)}</li>
          ))}
        </ul>
      )}
      <div className="sd-css-actions">
        <button type="button" className="sd-button" disabled={!dirty || !result.ok} onClick={apply}>{t('css.apply')}</button>
        <button type="button" className="sd-button" disabled={!dirty} onClick={() => setText(stored)}>{t('css.revert')}</button>
        <button type="button" className="sd-button sd-danger" disabled={text === ''} onClick={() => setText('')}>{t('css.clear')}</button>
      </div>
    </div>
  )
}
