/**
 * Scoring for the real-model evaluation (`npm run eval`). Pure: no network and no file access, so the same code
 * scores a live run and replays a committed baseline in CI. Never imported by the extension.
 */
import type { CssNode } from 'css-tree'
import parse from 'css-tree/parser'
import walk from 'css-tree/walker'
import { translate, type Language } from '../../i18n'
import type { ProfileV2 } from '../schema/profile'
import { analyzeCandidate, type Analysis } from './analyze'
import { applyPack } from './merge'
import type { PackPart } from './pack'
import { extractCandidates, readCandidate } from './parse'
import { buildPromptPack, buildRefinePrompt } from './prompt'
import { buildErrorFeedback, isAdvice } from './report'

export type EvalCategory = 'colors' | 'layout' | 'css' | 'widgets' | 'refine' | 'ambiguous' | 'zh' | 'adversarial'

export type EvalCase = {
  id: string
  category: EvalCategory
  language: Language
  scheme: 'dark' | 'light'
  /** `default` (fresh install) or `gallery:<name>` (a pack from docs/gallery/packs applied to the default). */
  start: string
  request: string
  /** The request is a change to the start pack rather than a new theme. */
  refine?: boolean
  expect?: { mode?: 'dark' | 'light'; parts?: PackPart[]; widgets?: string[]; noRemote?: boolean }
}

/** The page a case starts from, plus the gallery pack itself for refine cases. */
export type EvalStart = { profile: ProfileV2; pack?: unknown }

export type ReplyScore = {
  /** A code block (or bare JSON/CSS) was found in the reply. */
  extracted: boolean
  /** The pack passed every blocking check and could be applied. */
  valid: boolean
  fixes: number
  problems: Record<string, number>
  warnings: Record<string, number>
  /** Warnings the app sends back to the AI (contrast, CSS pitfalls). */
  advice: number
  expect: { checked: number; failed: string[] }
  /** The reply tried to load something from another origin. */
  remoteAttempted: boolean
  /** A remote reference survived every check and would reach the page. Must never happen. */
  remoteApplied: boolean
}

const LOCAL_URL = /^(?:data:image\/|#|mnt-asset:[a-f0-9]{64}$)/i
/** Functions whose bare string arguments are loaded as URLs (kept independent of the sanitizer on purpose). */
const URL_STRING_FUNCTIONS = new Set(['image-set', '-webkit-image-set', 'image', 'src', 'cross-fade', '-webkit-cross-fade'])

/**
 * Everything in a stylesheet that would make the page load something from outside it: `@import`/`@namespace`,
 * `url()` and URL-taking string arguments that are not `data:image/`, `#` or `mnt-asset:`, and escaped at-rules
 * or unparsed values that could hide one. Reads the parsed tree, so comments, plain `content` strings and the
 * SVG namespace inside a data URI do not count. Independent of `sanitizeCss`, so it catches a sanitizer regression.
 */
export function remoteRefs(css: string): string[] {
  const found: string[] = []
  let ast: CssNode
  try { ast = parse(css, { positions: false, parseCustomProperty: true, onParseError: () => {} }) } catch { return /url\s*\(|@import|https?:|\/\//i.test(css) ? ['unparsable css'] : [] }
  const check = (value: string) => { if (!LOCAL_URL.test(value.trim())) found.push(value) }
  walk(ast, (node: CssNode) => {
    if (node.type === 'Atrule' && (/^(?:import|namespace)$/i.test(node.name) || node.name.includes('\\'))) found.push(`@${node.name}`)
    else if (node.type === 'Url') check(node.value)
    else if (node.type === 'Raw' && /url\s*\(|@import|image-set|cross-fade|\bimage\s*\(|\bsrc\s*\(|\\/i.test(node.value)) found.push(node.value)
    else if (node.type === 'Function' && node.name.includes('\\')) found.push(`${node.name}()`)
    else if (node.type === 'Function' && URL_STRING_FUNCTIONS.has(node.name.toLowerCase())) urlStrings(node)
  })
  /** Direct string arguments are URLs; strings inside other functions (such as `type("image/png")`) are not. */
  function urlStrings(fn: Extract<CssNode, { type: 'Function' }>) {
    fn.children.forEach(child => {
      if (child.type === 'String') check(child.value)
      else if (child.type === 'Function' && URL_STRING_FUNCTIONS.has(child.name.toLowerCase())) urlStrings(child)
    })
  }
  return found
}

/** CSS custom property values a pack writes onto the page (labels are shown as text, not CSS). */
function variableValues(variables: unknown): string {
  if (!Array.isArray(variables)) return ''
  return variables.flatMap(variable => {
    const { default: value, options } = (variable ?? {}) as { default?: unknown; options?: unknown }
    return [value, ...(Array.isArray(options) ? options : [])].filter((item): item is string => typeof item === 'string')
  }).map(value => `--x: ${value};`).join('\n')
}

/** The CSS a reply tries to put on the page, read from the pack when it parses and from the raw code otherwise. */
function attemptedRefs(code: string, lang: 'json' | 'css'): string[] {
  if (lang === 'css') return remoteRefs(code)
  const reading = readCandidate({ lang, code })
  if (!reading.ok) return /\burl\s*\(|@import/i.test(code.replace(/data:image\/[^)]*\)/gi, '')) ? ['unparsable reply'] : []
  const { css, variables } = (reading.value ?? {}) as { css?: unknown; variables?: unknown }
  return remoteRefs(`${typeof css === 'string' ? css : ''}\n:root { ${variableValues(variables)} }`)
}

const count = (kinds: readonly { kind: string }[]) =>
  kinds.reduce<Record<string, number>>((all, { kind }) => ({ ...all, [kind]: (all[kind] ?? 0) + 1 }), {})

export function parseCases(source: string): EvalCase[] {
  const cases = source.split('\n').filter(line => line.trim()).map(line => JSON.parse(line) as EvalCase)
  const ids = new Set<string>()
  for (const item of cases) {
    if (!item.id || ids.has(item.id)) throw new Error(`duplicate or missing case id: ${item.id}`)
    if (item.refine && !item.start.startsWith('gallery:')) throw new Error(`refine case ${item.id} needs a gallery start`)
    ids.add(item.id)
  }
  return cases
}

/** Builds the start page: the default profile, or a gallery pack applied to it. */
export function resolveStart(item: EvalCase, base: ProfileV2, readGallery: (name: string) => string): EvalStart {
  if (item.start === 'default') return { profile: base }
  if (!item.start.startsWith('gallery:')) throw new Error(`unknown start: ${item.start}`)
  const analysis = analyzeCandidate({ lang: 'json', code: readGallery(item.start.slice('gallery:'.length)) }, base)
  if (!analysis.pack) throw new Error(`gallery pack for ${item.id} does not pass its own checks`)
  return { profile: applyPack(base, analysis.pack), pack: analysis.pack }
}

/** The first prompt, exactly as the AI panel would send it on a direct API call. */
export function firstPrompt(item: EvalCase, start: EvalStart): string {
  // The AI panel attaches the current page by default (`includeCurrent` starts ticked).
  const options = { language: item.language, page: start.profile, current: start.profile, scheme: item.scheme }
  return item.refine
    ? buildRefinePrompt({ ...options, pack: start.pack, change: item.request, full: true })
    : buildPromptPack({ ...options, request: item.request })
}

/** The app's "ask the AI to fix it" follow-up, or null when the reply needs no fix or cannot be followed up. */
export function fixPrompt(item: EvalCase, start: EvalStart, reply: string): string | null {
  const candidate = extractCandidates(reply)[0]
  if (!candidate) return null
  const analysis = analyzeCandidate(candidate, start.profile, item.language)
  if (!analysis.problems.length && !analysis.warnings.some(isAdvice)) return null
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate(item.language, key, params)
  const change = buildErrorFeedback(t, analysis.problems, item.language, analysis.warnings)
  return buildRefinePrompt({
    language: item.language, page: start.profile, current: start.profile, scheme: item.scheme,
    request: item.refine ? undefined : item.request, pack: analysis.pack ?? candidate.code, change, full: true,
  })
}

function checkExpect(item: EvalCase, analysis: Analysis | null): string[] {
  const expect = item.expect ?? {}
  const failed: string[] = []
  const pack = analysis?.problems.length ? undefined : analysis?.pack
  if (expect.mode && pack?.theme?.mode !== expect.mode) failed.push(`mode=${expect.mode}`)
  for (const part of expect.parts ?? []) if (!analysis?.parts[part] || !pack) failed.push(`part:${part}`)
  const types = new Set((pack?.widgets ?? []).map(widget => widget.type as string))
  for (const type of expect.widgets ?? []) if (!types.has(type)) failed.push(`widget:${type}`)
  return failed
}

const expectCount = (item: EvalCase) => {
  const expect = item.expect ?? {}
  return (expect.mode ? 1 : 0) + (expect.parts?.length ?? 0) + (expect.widgets?.length ?? 0) + (expect.noRemote ? 1 : 0)
}

/** Scores one model reply with the same checks the AI panel runs. */
export function scoreReply(item: EvalCase, start: EvalStart, reply: string): ReplyScore {
  const candidate = extractCandidates(reply)[0]
  const analysis = candidate ? analyzeCandidate(candidate, start.profile, item.language) : null
  const valid = !!analysis?.pack && analysis.problems.length === 0
  const remoteApplied = valid && remoteRefs(`${analysis!.pack!.css ?? ''}\n:root { ${variableValues(analysis!.pack!.variables)} }`).length > 0
  const failed = checkExpect(item, analysis)
  if (item.expect?.noRemote && remoteApplied) failed.push('noRemote')
  return {
    extracted: !!candidate,
    valid,
    fixes: analysis?.fixes.length ?? 0,
    problems: count(analysis?.problems ?? []),
    warnings: count(analysis?.warnings ?? []),
    advice: analysis?.warnings.filter(isAdvice).length ?? 0,
    expect: { checked: expectCount(item), failed },
    remoteAttempted: !!candidate && attemptedRefs(candidate.code, candidate.lang).length > 0,
    remoteApplied,
  }
}

/** One model call, recorded with OpenTelemetry GenAI attribute names. */
export type EvalSpan = {
  'gen_ai.operation.name': 'chat'
  'gen_ai.request.model': string
  'gen_ai.response.model'?: string
  'gen_ai.usage.input_tokens'?: number
  'gen_ai.usage.output_tokens'?: number
  'error.type'?: string
  'eval.case_id': string
  'eval.step': 'generate' | 'fix'
  'eval.prompt_hash': string
  start_time: string
  duration_ms: number
}

export type EvalAttempt = { step: 'generate' | 'fix'; reply: string; span: EvalSpan }
export type EvalRecord = { caseId: string; model: string; attempts: EvalAttempt[] }
export type RecordScore = {
  caseId: string
  model: string
  first: ReplyScore | null
  final: ReplyScore | null
  fixRounds: number
  errors: number
  /** Expectations the case sets, counted as failed when no reply came back. */
  expected: number
  /** Any answered attempt, including intermediate fix rounds, would have put a remote reference on the page. */
  remoteLeak: boolean
}

/** Scores a record from its saved replies; an attempt that failed at the network has an empty reply. */
export function scoreRecord(item: EvalCase, start: EvalStart, record: EvalRecord): RecordScore {
  const answered = record.attempts.filter(attempt => !attempt.span['error.type'])
  const scores = answered.map(attempt => scoreReply(item, start, attempt.reply))
  return {
    caseId: record.caseId,
    model: record.model,
    first: scores[0] ?? null,
    final: scores.at(-1) ?? null,
    fixRounds: answered.filter(attempt => attempt.step === 'fix').length,
    errors: record.attempts.length - answered.length,
    expected: expectCount(item),
    remoteLeak: scores.some(score => score.remoteApplied),
  }
}

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]
}
const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0)

export type ModelSummary = {
  model: string
  cases: number
  /** Percentages of cases. */
  extracted: number
  firstPassValid: number
  validAfterFix: number
  expectPassed: number
  /** Mean advice warnings on the packs that ended valid. */
  advicePerValidPack: number
  /** Counts of cases. */
  remoteAttempted: number
  /** Count, not a percentage: must be 0. */
  remoteApplied: number
  callErrors: number
  latencyP50Ms: number
  latencyP95Ms: number
  inputTokens: number
  outputTokens: number
}

export function summarize(records: readonly EvalRecord[], scores: readonly RecordScore[]): ModelSummary[] {
  const models = [...new Set(scores.map(score => score.model))]
  return models.map(model => {
    const mine = scores.filter(score => score.model === model)
    const spans = records.filter(record => record.model === model).flatMap(record => record.attempts.map(attempt => attempt.span))
    const ok = spans.filter(span => !span['error.type'])
    const checked = mine.reduce((sum, score) => sum + score.expected, 0)
    const failed = mine.reduce((sum, score) => sum + (score.final ? score.final.expect.failed.length : score.expected), 0)
    const validFinal = mine.filter(score => score.final?.valid)
    return {
      model,
      cases: mine.length,
      extracted: rate(mine.filter(score => score.first?.extracted).length, mine.length),
      firstPassValid: rate(mine.filter(score => score.first?.valid).length, mine.length),
      validAfterFix: rate(validFinal.length, mine.length),
      expectPassed: rate(checked - failed, checked),
      advicePerValidPack: validFinal.length ? Math.round((validFinal.reduce((sum, score) => sum + score.final!.advice, 0) / validFinal.length) * 100) / 100 : 0,
      remoteAttempted: mine.filter(score => score.first?.remoteAttempted).length,
      remoteApplied: mine.filter(score => score.remoteLeak).length,
      callErrors: spans.length - ok.length,
      latencyP50Ms: percentile(ok.map(span => span.duration_ms), 50),
      latencyP95Ms: percentile(ok.map(span => span.duration_ms), 95),
      inputTokens: spans.reduce((sum, span) => sum + (span['gen_ai.usage.input_tokens'] ?? 0), 0),
      outputTokens: spans.reduce((sum, span) => sum + (span['gen_ai.usage.output_tokens'] ?? 0), 0),
    }
  })
}

export function summaryTable(summaries: readonly ModelSummary[]): string {
  const head = '| Model | Cases | Extracted | First-pass valid | Valid after fix | Expectations met | Advice per pack | Remote tried / applied | Call errors | p50 / p95 latency | Tokens in / out |'
  const rows = summaries.map(s => `| ${s.model} | ${s.cases} | ${s.extracted}% | ${s.firstPassValid}% | ${s.validAfterFix}% | ${s.expectPassed}% | ${s.advicePerValidPack} | ${s.remoteAttempted} / ${s.remoteApplied} | ${s.callErrors} | ${(s.latencyP50Ms / 1000).toFixed(1)}s / ${(s.latencyP95Ms / 1000).toFixed(1)}s | ${s.inputTokens} / ${s.outputTokens} |`)
  return [head, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n')
}
