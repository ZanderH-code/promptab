import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser'
import { PACK_KIND, PACK_VERSION } from './pack'

export type Candidate = { lang: 'json' | 'css'; code: string }
export type SyntaxProblem = { message: string; line: number; column: number }
export type Reading =
  | { ok: true; value: unknown }
  | { ok: false; problems: SyntaxProblem[] }

const JSON_LANGS = new Set(['json', 'jsonc', 'json5'])
const CSS_LANGS = new Set(['css', 'scss', 'less'])
const looksLikeCss = (code: string) => /[^{}]+\{[^{}]*:[^{}]*\}/.test(code) && !/^\s*[{[]/.test(code)

function classify(lang: string, code: string): Candidate | undefined {
  const trimmed = code.trim()
  if (!trimmed) return undefined
  const name = lang.toLowerCase()
  if (JSON_LANGS.has(name)) return { lang: 'json', code: trimmed }
  if (CSS_LANGS.has(name)) return { lang: 'css', code: trimmed }
  if (trimmed.startsWith('{')) return { lang: 'json', code: trimmed }
  if (looksLikeCss(trimmed)) return { lang: 'css', code: trimmed }
  return undefined
}

/**
 * Pulls candidate pack sources out of a whole chat reply: fenced code blocks (json first, then css), or the
 * reply itself when it is bare JSON or CSS. An unclosed final fence (a cut-off reply) still counts.
 */
export function extractCandidates(reply: string): Candidate[] {
  const text = reply.replace(/\r\n?/g, '\n')
  const found: Candidate[] = []
  const add = (lang: string, lines: string[]) => { const candidate = classify(lang, lines.join('\n')); if (candidate) found.push(candidate) }
  let open: { marker: string; lang: string; lines: string[] } | undefined
  for (const line of text.split('\n')) {
    const fence = /^\s*(`{3,}|~{3,})\s*([\w+-]*)/.exec(line)
    if (!open) {
      if (fence) open = { marker: fence[1], lang: fence[2], lines: [] }
    } else if (fence && fence[1][0] === open.marker[0] && fence[1].length >= open.marker.length && !fence[2] && line.trim() === fence[1]) {
      add(open.lang, open.lines)
      open = undefined
    } else open.lines.push(line)
  }
  if (open) add(open.lang, open.lines)
  if (!found.length) {
    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    const slice = start >= 0 && end > start ? text.slice(start, end + 1) : ''
    const errors: ParseError[] = []
    if (slice) parse(slice, errors, { allowTrailingComma: true })
    const whole = slice && !errors.length ? classify('json', slice) : classify('', text)
    if (whole) found.push(whole)
  }
  const unique = found.filter((item, index) => found.findIndex(other => other.lang === item.lang && other.code === item.code) === index)
  return [...unique.filter(item => item.lang === 'json'), ...unique.filter(item => item.lang === 'css')]
}

function position(source: string, offset: number) {
  const before = source.slice(0, offset).split('\n')
  return { line: before.length, column: before[before.length - 1].length + 1 }
}

/** Reads a candidate: JSON with comments and trailing commas tolerated, or plain CSS wrapped as a css-only pack. */
export function readCandidate(candidate: Candidate): Reading {
  if (candidate.lang === 'css') return { ok: true, value: { kind: PACK_KIND, packVersion: PACK_VERSION, meta: { name: 'CSS' }, css: candidate.code } }
  const errors: ParseError[] = []
  const value: unknown = parse(candidate.code, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length) return { ok: false, problems: errors.map(error => ({ message: printParseErrorCode(error.error), ...position(candidate.code, error.offset) })) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, problems: [{ message: 'The top level must be a JSON object', line: 1, column: 1 }] }
  return { ok: true, value }
}
