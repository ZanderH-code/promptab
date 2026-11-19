import { useMessagesVersion } from '../../i18n/useMessages'
import '../../i18n/ai'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
const Gallery = lazy(() => import('./Gallery').then(m => ({ default: m.Gallery })))
import { analyzeCandidate } from '../../core/ai/analyze'
import { applyPack, exportThemePack } from '../../core/ai/apply'
import { PACK_PARTS, type AiPack, type PackPart } from '../../core/ai/pack'
import { extractCandidates } from '../../core/ai/parse'
import { buildPromptPack, buildRefinePrompt } from '../../core/ai/prompt'
import { portableCss } from '../../core/css/sanitize'
import { buildErrorFeedback, fixText, isAdvice, problemText, warningText } from '../../core/ai/report'
import type { MessageKey } from '../../i18n'
import { Dropdown } from '../../ui/Dropdown'
import { transitionPage } from '../../ui/motion'
import { useAiState } from './aiState'
import { ByokFields, useAiConnection } from './ByokPanel'
import { Segmented, Toggle } from './controls'
import type { Ctx } from './rows'
import { downloadJson } from '../../ui/download'

const MAX_REPLY_BYTES = 512 * 1024
const PART_LABELS: Record<PackPart, MessageKey> = { theme: 'ai.part.theme', background: 'ai.part.background', css: 'ai.part.css', layout: 'ai.part.layout', widgets: 'ai.part.widgets' }
/** Starting points for people who do not know what to ask for; each adds a phrase to the request. */
const IDEAS: MessageKey[] = ['ai.idea.paper', 'ai.idea.minimal', 'ai.idea.glass', 'ai.idea.contrast', 'ai.idea.terminal', 'ai.idea.gradient']

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
  const values = warning.kind === 'unknown-key' ? [warning.path] : warning.kind === 'font' ? [warning.path, warning.value] : warning.kind === 'css-foreign' ? [warning.name] : warning.kind === 'css-pitfall' ? [warning.pitfall.selector] : []
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
 * Bring-your-own-AI theme workbench, in three steps: say what you want; have an AI write it, either through a
 * chat you already use (copy and paste) or with your own API key; then review what came back, preview or
 * apply the parts you keep, and ask for changes. Sharing the current theme sits at the end.
 */
export function AiWorkbench({ ctx }: { ctx: Ctx }) {
  useMessagesVersion()
  const { t, store, onError } = ctx
  const [state, set] = useAiState()
  const connection = useAiConnection()
  const api = connection.method === 'api'
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [exportedName, setExportedName] = useState('')
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [excludeCss, setExcludeCss] = useState(false)
  const hasReply = state.reply.trim() !== ''
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
    downloadJson(pack, themeFilename(pack.meta?.name ?? ''))
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
  const result = useRef<HTMLElement>(null)
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
  const needsFix = !!analysis && (analysis.problems.length > 0 || analysis.warnings.some(isAdvice))

  // Every prompt carries the same context: a description of the page (never names or addresses) and, when
  // ticked, the current theme and CSS.
  const promptOptions = { language: ctx.s.language, request: state.request, current: state.includeCurrent ? active : null, page: active, scheme: ctx.mode }

  const stopPreview = () => { if (store.getState().preview?.label) store.getState().clearPreview() }
  const fadeOutPreview = () => { if (store.getState().preview?.label) transitionPage(() => store.getState().clearPreview()) }
  /** Shows a pack on the page with a short cross-fade; `then` runs once it is on screen. */
  function showPack(pack: AiPack, parts: PackPart[], failure: MessageKey, then?: () => void) {
    let next: ReturnType<typeof applyPack>
    try { next = applyPack(active, pack, parts) } catch { onError({ key: failure }); return }
    transitionPage(() => {
      try { store.getState().setPreview(active.meta.id, next, pack.meta?.name || t('ai.defaultName')) } catch { onError({ key: failure }); return }
      then?.()
    })
  }
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

  /** A reply from the API is checked straight away; a clean one goes on screen as a preview. */
  function receive(reply: string) {
    edit({ reply, pick: 0, change: '', skip: { theme: false, background: false, css: false, layout: false, widgets: false } })
    const first = extractCandidates(reply)[0]
    const checked = first ? analyzeCandidate(first, active, ctx.s.language) : null
    if (checked?.pack && checked.problems.length === 0) showPack(checked.pack, PACK_PARTS.filter(part => checked.parts[part]), 'ai.fileFailed')
    requestAnimationFrame(() => result.current?.scrollIntoView({ block: 'nearest' }))
  }

  function generate() {
    connection.send(buildPromptPack(promptOptions), receive)
  }

  /** The change to ask for: the person's words, or the problems found when they ask for a fix. */
  function followUp(fix: boolean) {
    if (!analysis || !candidate) return ''
    const change = fix ? buildErrorFeedback(t, analysis.problems, ctx.s.language, analysis.warnings) : state.change
    return buildRefinePrompt({ ...promptOptions, pack: analysis.pack ?? candidate.code, change, full: api })
  }

  function askForChange(fix: boolean) {
    const prompt = followUp(fix)
    if (!prompt) return
    if (api) connection.send(prompt, receive)
    else void copy(prompt, 'ai.copiedFollowUp')
  }

  function addIdea(key: MessageKey) {
    const idea = t(key)
    const current = state.request.trim()
    if (current.includes(idea)) return
    set({ request: current ? `${current}${t('ai.ideaJoin')}${idea}` : idea })
  }

  function showPreview() {
    if (!analysis?.pack || !canApply) return
    showPack(analysis.pack, chosen, 'ai.fileFailed')
  }

  function apply() {
    if (!analysis?.pack || !canApply) return
    showPack(analysis.pack, chosen, 'ai.fileFailed', ctx.onApplyPreview)
  }

  const candidateLabel = (index: number) => {
    const item = candidates[index]
    const n = candidates.slice(0, index + 1).filter(other => other.lang === item.lang).length
    return t(item.lang === 'json' ? 'ai.candidate.json' : 'ai.candidate.css', { n })
  }

  const replyBox = <textarea
    className="sd-code" data-user-content aria-label={t('ai.reply')} value={state.reply} rows={api ? 6 : 8} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off"
    placeholder={t('ai.replyPlaceholder')} onChange={event => edit({ reply: event.target.value, pick: 0 })}
  />
  // Progress and errors show next to whatever sent the request: step 2 at first, the review once there is one.
  const requestStatus = api && <>
    {connection.sending && <p className="sd-ai-progress" role="status">{t('ai.byok.sending')}</p>}
    {connection.error && <p className="sd-ai-problem" role="alert">{t(connection.error)}</p>}
  </>
  const packName = analysis?.pack?.meta?.name
  const packDescription = analysis?.pack?.meta?.description

  return (
    <div className="sd-ai">
      <p className="sd-hint">{t('ai.intro')}</p>
      <div className="sd-css-actions">
        <button type="button" className="sd-button" aria-expanded={galleryOpen} onClick={() => setGalleryOpen(open => !open)}>{t(galleryOpen ? 'gallery.close' : 'gallery.open')}</button>
        <a className="sd-ai-link" href="https://zanderh-code.github.io/promptab/docs/" target="_blank" rel="noreferrer">{t('ai.docsReference')}</a>
      </div>
      {galleryOpen && <Suspense fallback={<p role="status">{t('gallery.loading')}</p>}><Gallery ctx={ctx} profile={active} onSelect={(source, picked) => {
        if (!picked.pack) return
        edit({ reply: source, pick: 0, skip: { theme: false, background: false, css: false, layout: false, widgets: false } })
        showPack(picked.pack, PACK_PARTS.filter(part => picked.parts[part]), 'gallery.invalid')
      }} /></Suspense>}

      <section className="sd-ai-step" aria-labelledby="ai-step1">
        <h3 id="ai-step1"><span className="sd-ai-num" aria-hidden="true">1</span>{t('ai.step1')}</h3>
        <label className="sd-label" htmlFor="ai-request">{t('ai.request')}</label>
        <textarea id="ai-request" className="sd-code sd-ai-request" rows={3} value={state.request} placeholder={t('ai.requestPlaceholder')} onChange={event => set({ request: event.target.value })} />
        <div className="sd-ai-ideas" role="group" aria-label={t('ai.ideas')}>
          {IDEAS.map(key => <button key={key} type="button" className="sd-ai-chip" onClick={() => addIdea(key)}>{t(key)}</button>)}
        </div>
        <Toggle label={t('ai.includeCurrent')} checked={state.includeCurrent} onChange={value => set({ includeCurrent: value })} />
      </section>

      <section className="sd-ai-step" aria-labelledby="ai-step2">
        <h3 id="ai-step2"><span className="sd-ai-num" aria-hidden="true">2</span>{t('ai.step2')}</h3>
        <Segmented label={t('ai.method')} value={connection.method} options={[{ value: 'chat', label: t('ai.method.chat') }, { value: 'api', label: t('ai.method.api') }]} onChange={connection.setMethod} />
        {api ? (
          <>
            <ByokFields ctx={ctx} connection={connection} />
            <div className="sd-css-actions">
              <button id="byok-send-button" type="button" className="sd-button sd-primary" disabled={connection.sending || !connection.ready} onClick={generate}>{t('ai.byok.send')}</button>
              {connection.sending && <button type="button" className="sd-button" onClick={connection.cancel}>{t('ai.byok.cancel')}</button>}
            </div>
            {!hasReply && requestStatus}
            <details className="sd-ai-more">
              <summary>{t('ai.rawReply')}</summary>
              {replyBox}
            </details>
          </>
        ) : (
          <>
            <ol className="sd-ai-howto">
              <li>{t('ai.howto.copy')}</li>
              <li>{t('ai.howto.send')}</li>
              <li>{t('ai.howto.paste')}</li>
            </ol>
            <div className="sd-css-actions">
              <button type="button" className="sd-button sd-primary" onClick={() => void copy(buildPromptPack(promptOptions), 'ai.copied')}>{t('ai.copyPrompt')}</button>
              <button type="button" className="sd-button" onClick={() => file.current?.click()}>{t('ai.openFile')}</button>
              <input ref={file} type="file" hidden accept=".json,.jsonc,.css,.md,.txt,application/json,text/css,text/plain,text/markdown" aria-label={t('ai.openFile')} onChange={event => { void readFile(event.target.files?.[0]); event.target.value = '' }} />
            </div>
            {replyBox}
          </>
        )}
        <span className="sd-ai-notice" role="status">{notice ? t(notice) : ''}</span>
        {candidates.length > 1 && (
          <div className="sd-ai-pick">
            <span className="sd-label">{t('ai.candidates', { count: candidates.length })}</span>
            <Dropdown theme={ctx.mode} label={t('ai.candidates', { count: candidates.length })} value={String(pick)} options={candidates.map((_, index) => ({ value: String(index), label: candidateLabel(index) }))} onChange={value => edit({ pick: Number(value) })} fullWidth />
          </div>
        )}
      </section>

      {hasReply && (
        <section ref={result} className="sd-ai-step sd-ai-result" aria-labelledby="ai-step3">
          <h3 id="ai-step3"><span className="sd-ai-num" aria-hidden="true">3</span>{t('ai.step3')}</h3>
          {!analysis && <p className="sd-ai-problem" role="alert">{t('ai.nothingFound')}</p>}
          {analysis && (
            <>
              {(packName || packDescription) && (
                <div className="sd-ai-card">
                  {packName && <strong data-user-content>{packName}</strong>}
                  {packDescription && <p data-user-content>{packDescription}</p>}
                </div>
              )}
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
                {needsFix && (
                  <button type="button" className="sd-button" disabled={api && (connection.sending || !connection.ready)} onClick={() => api ? askForChange(true) : void copy(buildErrorFeedback(t, analysis.problems, ctx.s.language, analysis.warnings), 'ai.copied')}>
                    {t(api ? 'ai.askFix' : analysis.problems.length ? 'ai.copyErrors' : 'ai.copyAdvice')}
                  </button>
                )}
                {analysis.pack && (
                  <>
                    <button type="button" className="sd-button" disabled={!canApply} aria-pressed={previewing} onClick={previewing ? fadeOutPreview : showPreview}>{t(previewing ? 'ai.stopPreview' : 'ai.preview')}</button>
                    <button type="button" className="sd-button sd-primary" disabled={!canApply} onClick={apply}>{t('ai.apply')}</button>
                  </>
                )}
              </div>
              {previewing && <p className="sd-hint">{t('ai.previewHint')}</p>}

              {analysis.pack && (
                <div className="sd-ai-refine">
                  <label className="sd-label" htmlFor="ai-change">{t('ai.change')}</label>
                  <textarea id="ai-change" className="sd-code sd-ai-request" rows={2} value={state.change} placeholder={t('ai.changePlaceholder')} onChange={event => set({ change: event.target.value })} />
                  <div className="sd-css-actions">
                    <button type="button" className="sd-button" disabled={!state.change.trim() || connection.sending || (api && !connection.ready)} onClick={() => askForChange(false)}>{t(api ? 'ai.sendChange' : 'ai.copyChange')}</button>
                  </div>
                  {!api && <p className="sd-hint">{t('ai.changeHint')}</p>}
                </div>
              )}
            </>
          )}
          {requestStatus}
        </section>
      )}

      <section className="sd-ai-step" aria-labelledby="ai-share">
        <h3 id="ai-share">{t('ai.share')}</h3>
        <p className="sd-hint">{t('ai.shareHint')}</p>
        <div className="sd-css-actions">
          <button ref={exportButton} type="button" className="sd-button" onClick={() => { setExcludeCss(false); setExportComplete(false); setExportOpen(true) }}>{t('ai.exportTitle')}</button>
        </div>
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
    </div>
  )
}
