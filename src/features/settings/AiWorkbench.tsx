import { useMessagesVersion } from '../../i18n/useMessages'
import '../../i18n/ai'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
const Gallery = lazy(() => import('./Gallery').then(m => ({ default: m.Gallery })))
import { analyzeCandidate } from '../../core/ai/analyze'
import { applyPack, exportThemePack } from '../../core/ai/apply'
import { PACK_PARTS, type PackPart } from '../../core/ai/pack'
import { extractCandidates } from '../../core/ai/parse'
import { buildPromptPack } from '../../core/ai/prompt'
import { portableCss } from '../../core/css/sanitize'
import { buildErrorFeedback, fixText, problemText, warningText } from '../../core/ai/report'
import type { MessageKey } from '../../i18n'
import { Dropdown } from '../../ui/Dropdown'
import { useAiState } from './aiState'
import { ByokPanel } from './ByokPanel'
import { Toggle } from './controls'
import type { Ctx } from './rows'

const MAX_REPLY_BYTES = 512 * 1024
const PART_LABELS: Record<PackPart, MessageKey> = { theme: 'ai.part.theme', background: 'ai.part.background', css: 'ai.part.css', layout: 'ai.part.layout', widgets: 'ai.part.widgets' }

function markDynamicText(text: string, values: string[]): ReactNode {
  const dynamic = [...new Set(values.filter(Boolean))].sort((a, b) => b.length - a.length)
  if (!dynamic.length) return text
  const pattern = new RegExp(`(${dynamic.map(value => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')).join('|')})`, 'g')
  return text.split(pattern).map((part, index) => dynamic.includes(part) ? <span key={index} data-user-content>{part}</span> : part)
}

function problemContent(t: Ctx['t'], problem: Parameters<typeof problemText>[1], language: Ctx['s']['language']): ReactNode {
  const text = problemText(t, problem, language)
  const values = problem.kind === 'field' ? [problem.path, problem.value] : problem.kind === 'syntax' ? [problem.message] : problem.kind === 'css' ? [problem.issue.detail ?? ''] : []
  return markDynamicText(text, values)
}

function warningContent(t: Ctx['t'], warning: Parameters<typeof warningText>[1]): ReactNode {
  const text = warningText(t, warning)
  const values = warning.kind === 'unknown-key' ? [warning.path] : warning.kind === 'font' ? [warning.path, warning.value] : warning.kind === 'css-foreign' ? [warning.name] : []
  return markDynamicText(text, values)
}

function themeFilename(name: string) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'theme'}.theme-pack.json`
}

function gallerySubmissionUrl(name: string) {
  const params = new URLSearchParams({ template: 'theme_submission.yml', title: `[Theme]: ${name}` })
  return `https://github.com/zanderh-code/promptab/issues/new?${params}`
}

/**
 * Bring-your-own-AI theme workbench: builds the prompt to copy out, reads the pasted reply, shows what was fixed,
 * what is wrong and what is risky, and previews or applies only the parts the person keeps ticked.
 */
export function AiWorkbench({ ctx }: { ctx: Ctx }) {
  useMessagesVersion()
  const { t, store, onError } = ctx
  const [state, set] = useAiState()
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [exportedName, setExportedName] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [excludeCss, setExcludeCss] = useState(false)
  const exportButton = useRef<HTMLButtonElement>(null)
  const cancelExport = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (exportOpen) cancelExport.current?.focus() }, [exportOpen])
  const closeExport = () => { setExportOpen(false); exportButton.current?.focus() }
  function createExportPack() {
    const pack = exportThemePack(active)
    if (excludeCss) delete pack.css
    return pack
  }

  function markExported(name: string) {
    setExportedName(name)
    setExportComplete(true)
  }

  function downloadTheme() {
    const pack = createExportPack()
    const url = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = themeFilename(pack.meta?.name ?? ''); link.click(); URL.revokeObjectURL(url)
    markExported(pack.meta?.name ?? t('ai.defaultName'))
  }

  async function copyThemeReply() {
    const pack = createExportPack()
    const reply = ['```json', JSON.stringify(pack, null, 2), '```'].join('\n')
    try {
      await navigator.clipboard.writeText(reply)
      flash('ai.copied')
      markExported(pack.meta?.name ?? t('ai.defaultName'))
    } catch { onError({ key: 'ai.copyFailed' }) }
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  // Analysis always runs against the saved profile, never against the preview it may itself have produced.
  const active = store.getState().profiles[store.getState().activeProfileId]
  const removedCssDeclarations = useMemo(() => exportOpen && !excludeCss ? portableCss(active.custom.css).removed : 0, [exportOpen, excludeCss, active.custom.css])
  const preview = store.getState().preview
  const previewing = !!preview?.label && preview.profileId === active.meta.id

  const candidates = useMemo(() => extractCandidates(state.reply), [state.reply])
  const pick = Math.min(state.pick, Math.max(0, candidates.length - 1))
  const candidate = candidates[pick]
  const analysis = useMemo(() => (candidate ? analyzeCandidate(candidate, active, ctx.s.language) : null), [candidate, active, ctx.s.language])
  const chosen = analysis?.pack ? PACK_PARTS.filter(part => analysis.parts[part] && !state.skip[part]) : []
  const canApply = !!analysis?.pack && chosen.length > 0

  const stopPreview = () => { if (store.getState().preview?.label) store.getState().clearPreview() }
  /** Any change to the input makes a running preview stale, so it ends. */
  const edit = (patch: Parameters<typeof set>[0]) => { stopPreview(); set(patch) }
  const flash = (key: MessageKey) => { setNotice(key); clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(null), 2500) }

  async function copy(text: string, done: MessageKey) {
    try { await navigator.clipboard.writeText(text); flash(done) } catch { onError({ key: 'ai.copyFailed' }) }
  }

  async function readFile(source?: File) {
    if (!source) return
    if (source.size > MAX_REPLY_BYTES) { onError({ key: 'ai.fileFailed' }); return }
    try { edit({ reply: await source.text(), pick: 0 }) } catch { onError({ key: 'ai.fileFailed' }) }
  }

  function showPreview() {
    if (!analysis?.pack || !canApply) return
    try { store.getState().setPreview(active.meta.id, applyPack(active, analysis.pack, chosen), analysis.pack.meta?.name || t('ai.defaultName')) } catch { onError({ key: 'ai.fileFailed' }) }
  }

  function apply() {
    if (!analysis?.pack || !canApply) return
    try { store.getState().setPreview(active.meta.id, applyPack(active, analysis.pack, chosen), analysis.pack.meta?.name || t('ai.defaultName')) } catch { onError({ key: 'ai.fileFailed' }); return }
    ctx.onApplyPreview()
  }

  const candidateLabel = (index: number) => {
    const item = candidates[index]
    const n = candidates.slice(0, index + 1).filter(other => other.lang === item.lang).length
    return t(item.lang === 'json' ? 'ai.candidate.json' : 'ai.candidate.css', { n })
  }

  return (
    <div className="sd-ai">
      <button type="button" className="sd-button" aria-expanded={galleryOpen} onClick={() => setGalleryOpen(open => !open)}>{t(galleryOpen ? 'gallery.close' : 'gallery.open')}</button>
      {galleryOpen && <Suspense fallback={<p role="status">{t('gallery.loading')}</p>}><Gallery ctx={ctx} profile={active} onSelect={(source, result) => {
        if (!result.pack) return
        edit({ reply: source, pick: 0, skip: { theme: false, background: false, css: false, layout: false, widgets: false } })
        try { store.getState().setPreview(active.meta.id, applyPack(active, result.pack, PACK_PARTS.filter(part => result.parts[part])), result.pack.meta?.name || t('ai.defaultName')) } catch { onError({ key: 'gallery.invalid' }) }
      }} /></Suspense>}
      <p className="sd-hint">{t('ai.intro')}</p>
      <p className="sd-hint"><a href="https://zanderh-code.github.io/promptab/docs/" target="_blank" rel="noreferrer">{t('ai.docsReference')}</a></p>

      <section className="sd-ai-step" aria-labelledby="ai-step1">
        <h4 id="ai-step1">{t('ai.step1')}</h4>
        <label className="sd-label" htmlFor="ai-request">{t('ai.request')}</label>
        <textarea id="ai-request" className="sd-code sd-ai-request" rows={3} value={state.request} placeholder={t('ai.requestPlaceholder')} onChange={event => set({ request: event.target.value })} />
        <Toggle label={t('ai.includeCurrent')} checked={state.includeCurrent} onChange={value => set({ includeCurrent: value })} />
        <div className="sd-css-actions">
          <button type="button" className="sd-button" onClick={() => void copy(buildPromptPack({ language: ctx.s.language, request: state.request, current: state.includeCurrent ? active : null }), 'ai.copied')}>{t('ai.copyPrompt')}</button>
          <span className="sd-ai-notice" role="status">{notice ? t(notice) : ''}</span>
        </div>
      </section>

      <ByokPanel ctx={ctx} prompt={buildPromptPack({ language: ctx.s.language, request: state.request, current: null })} onReply={reply => edit({ reply, pick: 0 })} />

      <section className="sd-ai-step" aria-labelledby="ai-step2">
        <h4 id="ai-step2">{t('ai.step2')}</h4>
        <textarea
          className="sd-code" data-user-content aria-label={t('ai.reply')} value={state.reply} rows={10} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off"
          placeholder={t('ai.replyPlaceholder')} onChange={event => edit({ reply: event.target.value, pick: 0 })}
        />
        <div className="sd-css-actions">
          <input ref={file} type="file" hidden accept=".json,.jsonc,.css,.md,.txt,application/json,text/css,text/plain,text/markdown" aria-label={t('ai.openFile')} onChange={event => { void readFile(event.target.files?.[0]); event.target.value = '' }} />
          <button ref={exportButton} type="button" className="sd-button" onClick={() => { setExcludeCss(false); setExportComplete(false); setExportOpen(true) }}>{t('ai.exportTitle')}</button>
          <button type="button" className="sd-button" onClick={() => file.current?.click()}>{t('ai.openFile')}</button>
        </div>
        {candidates.length > 1 && (
          <div className="sd-ai-pick">
            <span className="sd-label">{t('ai.candidates', { count: candidates.length })}</span>
            <Dropdown theme={ctx.mode} label={t('ai.candidates', { count: candidates.length })} value={String(pick)} options={candidates.map((_, index) => ({ value: String(index), label: candidateLabel(index) }))} onChange={value => edit({ pick: Number(value) })} fullWidth />
          </div>
        )}
      </section>

      {exportOpen && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) closeExport() }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="theme-export-title" onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); closeExport() }
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'))
            if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
            else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
          }
        }}>
          <h3 id="theme-export-title">{t('ai.exportTitle')}</h3>
          <p className="sd-hint">{t('ai.exportAssetsWarning')}</p>
          {active.custom.css.trim() !== '' && <p className="sd-hint">{t('ai.exportCssWarning')}</p>}
          {removedCssDeclarations > 0 && <p className="sd-hint">{t('ai.exportCssRemoved', { count: removedCssDeclarations })}</p>}
          <Toggle label={t('ai.exportExcludeCss')} checked={excludeCss} onChange={setExcludeCss} />
          <div className="sd-css-actions">
            <button ref={cancelExport} type="button" className="sd-button" onClick={closeExport}>{t('ai.exportCancel')}</button>
            <button type="button" className="sd-button" onClick={() => void copyThemeReply()}>{t('ai.copyThemeReply')}</button>
            <button type="button" className="sd-button sd-primary" onClick={downloadTheme}>{t('ai.exportConfirm')}</button>
          </div>
          {exportComplete && <div className="sd-hint"><p>{t('ai.submitGalleryHint')}</p><a href={gallerySubmissionUrl(exportedName)} target="_blank" rel="noreferrer">{t('ai.submitGallery')}</a></div>}
        </div>
      </div>}
      {state.reply.trim() !== '' && (
        <section className="sd-ai-step" aria-labelledby="ai-step3">
          <h4 id="ai-step3">{t('ai.step3')}</h4>
          {!analysis && <p className="sd-ai-problem" role="alert">{t('ai.nothingFound')}</p>}
          {analysis && (
            <>
              {analysis.fixes.length > 0 && (
                <div className="sd-ai-group" data-kind="fix">
                  <strong>{t('ai.fixes', { count: analysis.fixes.length })}</strong>
                  <ul>{analysis.fixes.map((fix, index) => <li key={index}>{fixText(t, fix)}</li>)}</ul>
                </div>
              )}
              {analysis.problems.length > 0 && (
                <div className="sd-ai-group" data-kind="problem" role="alert">
                  <strong>{t('ai.problems', { count: analysis.problems.length })}</strong>
                  <ul>{analysis.problems.map((problem, index) => <li key={index}>{problemContent(t, problem, ctx.s.language)}</li>)}</ul>
                </div>
              )}
              {analysis.warnings.length > 0 && (
                <div className="sd-ai-group" data-kind="warning">
                  <strong>{t('ai.warnings', { count: analysis.warnings.length })}</strong>
                  <ul>{analysis.warnings.map((warning, index) => <li key={index}>{warningContent(t, warning)}</li>)}</ul>
                </div>
              )}
              {analysis.pack && analysis.problems.length === 0 && <p className="sd-ai-ok" role="status">{t('ai.ok')}</p>}

              {analysis.pack && (
                <fieldset className="sd-ai-parts">
                  <legend>{t('ai.parts')}</legend>
                  {PACK_PARTS.map(part => analysis.parts[part]
                    ? <Toggle key={part} label={t(PART_LABELS[part])} checked={!state.skip[part]} onChange={value => edit({ skip: { ...state.skip, [part]: !value } })} />
                    : <p key={part} className="sd-ai-absent">{t(PART_LABELS[part])} · {t('ai.part.absent')}</p>)}
                </fieldset>
              )}

              <div className="sd-css-actions">
                {analysis.problems.length > 0 && (
                  <button type="button" className="sd-button" onClick={() => void copy(buildErrorFeedback(t, analysis.problems, ctx.s.language), 'ai.copied')}>{t('ai.copyErrors')}</button>
                )}
                {analysis.pack && (
                  <>
                    <button type="button" className="sd-button" disabled={!canApply} aria-pressed={previewing} onClick={previewing ? stopPreview : showPreview}>{t(previewing ? 'ai.stopPreview' : 'ai.preview')}</button>
                    <button type="button" className="sd-button sd-primary" disabled={!canApply} onClick={apply}>{t('ai.apply')}</button>
                  </>
                )}
              </div>
              {previewing && <p className="sd-hint">{t('ai.previewHint')}</p>}
            </>
          )}
        </section>
      )}
    </div>
  )
}
