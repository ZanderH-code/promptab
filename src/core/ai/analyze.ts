import type { z } from 'zod'
import { CSS_API_CLASSES } from '../css/api'
import { sanitizeCss, type CssIssue } from '../css/sanitize'
import { isAssetFont, isFontKey } from '../font'
import { profileIssues, type ProfileIssue, type ProfileV2 } from '../schema/profile'
import { themeColorsFor, type ThemeMode } from '../tokens/derive'
import { checkTheme, type CheckId } from '../tokens/quality'
import { applyPack } from './apply'
import { autoFix, type Fix } from './fix'
import { aiPackSchema, partsOf, unknownKeys, type AiPack, type PackPart } from './pack'
import { readCandidate, type Candidate } from './parse'

/** Something that stops the pack from being applied. */
export type Problem =
  | { kind: 'syntax'; message: string; line: number; column: number }
  | { kind: 'field'; path: string; expected: string; value: string }
  | { kind: 'css'; issue: CssIssue }
  | { kind: 'empty' }

/** Something worth a look that does not stop the pack. */
export type Warning =
  | { kind: 'unknown-key'; path: string }
  | { kind: 'contrast'; mode: 'dark' | 'light'; id: CheckId; ratio: number; required: number }
  | { kind: 'font'; path: string; value: string }
  | { kind: 'css-lines'; lines: number }
  | { kind: 'css-important' }
  | { kind: 'css-foreign'; name: string }
  | { kind: 'css-animation' }
  | { kind: 'css-literal-color' }

export type Analysis = {
  fixes: Fix[]
  problems: Problem[]
  warnings: Warning[]
  /** Present only when there are no problems. */
  pack?: AiPack
  /** The parts the pack carries (all false when it is unusable). */
  parts: Record<PackPart, boolean>
}

export const MAX_CSS_LINES = 200
const NO_PARTS = { theme: false, background: false, css: false }

function describe(value: unknown, issue: z.core.$ZodIssue): ProfileIssue {
  const actual = issue.path.reduce<unknown>((current, key) => (current != null && typeof current === 'object' ? (current as Record<PropertyKey, unknown>)[key] : undefined), value)
  let shown: string
  try { shown = typeof actual === 'string' ? actual : JSON.stringify(actual) ?? String(actual) } catch { shown = String(actual) }
  return { path: issue.path.map(String).join('.') || '$', expected: issue.message, value: shown }
}

const fieldProblem = (issue: ProfileIssue): Problem => ({ kind: 'field', path: issue.path, expected: issue.expected, value: issue.value })

function cssWarnings(pack: AiPack): Warning[] {
  const css = pack.css?.trim()
  if (!css) return []
  const result = sanitizeCss(css)
  const warnings: Warning[] = []
  const lines = css.split('\n').length
  if (lines > MAX_CSS_LINES) warnings.push({ kind: 'css-lines', lines })
  if (result.usesImportant) warnings.push({ kind: 'css-important' })
  const api = new Set<string>(CSS_API_CLASSES)
  for (const name of result.classNames) if (!api.has(name)) warnings.push({ kind: 'css-foreign', name })
  if (/\banimation(?:-name)?\s*:/i.test(css) && !/prefers-reduced-motion/i.test(css)) warnings.push({ kind: 'css-animation' })
  if (/\b(?:rgb|hsl|hwb|oklch|oklab|lab|lch)a?\(/i.test(result.css)) warnings.push({ kind: 'css-literal-color' })
  return warnings
}

function themeWarnings(merged: ProfileV2, pack: AiPack): Warning[] {
  if (!pack.theme) return []
  const warnings: Warning[] = []
  const recolored = !!(pack.theme.color || pack.theme.colorLight || pack.theme.mode)
  const modes: ThemeMode[] = merged.theme.mode === 'system' ? ['dark', 'light'] : [merged.theme.mode]
  for (const mode of recolored ? modes : []) {
    for (const failure of checkTheme(themeColorsFor(merged.theme, mode), mode).failures) warnings.push({ kind: 'contrast', mode: mode === 'light' ? 'light' : 'dark', id: failure.id, ratio: failure.ratio, required: failure.required })
  }
  for (const which of ['display', 'ui'] as const) {
    const value = pack.theme.font?.[which]
    if (value && !isFontKey(value) && !isAssetFont(value)) warnings.push({ kind: 'font', path: `theme.font.${which}`, value })
  }
  return warnings
}

/**
 * Reads one candidate from an AI reply and judges it against the current profile: repairs small slips,
 * validates field by field, checks the stylesheet, then adds quality warnings. Pure, so it can re-run on every edit.
 */
export function analyzeCandidate(candidate: Candidate, profile: ProfileV2): Analysis {
  const reading = readCandidate(candidate)
  if (!reading.ok) return { fixes: [], problems: reading.problems.map(problem => ({ kind: 'syntax', ...problem })), warnings: [], parts: NO_PARTS }

  const { value, fixes } = autoFix(reading.value)
  const warnings: Warning[] = unknownKeys(value).map(path => ({ kind: 'unknown-key', path }))
  const parsed = aiPackSchema.safeParse(value)
  if (!parsed.success) return { fixes, problems: parsed.error.issues.map(issue => fieldProblem(describe(value, issue))), warnings, parts: NO_PARTS }

  const pack = parsed.data
  const parts = partsOf(pack)
  const problems: Problem[] = []
  if (!parts.theme && !parts.background && !parts.css) problems.push({ kind: 'empty' })
  if (parts.css) {
    const result = sanitizeCss(pack.css!)
    for (const issue of result.errors) problems.push({ kind: 'css', issue })
  }
  const merged = applyPack(profile, pack)
  if (!problems.length) for (const issue of profileIssues(merged)) problems.push(fieldProblem(issue))
  if (problems.length) return { fixes, problems, warnings, parts }
  return { fixes, problems, warnings: [...warnings, ...themeWarnings(merged, pack), ...cssWarnings(pack)], pack, parts }
}
