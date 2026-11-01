import type { MessageKey, Translate } from '../../i18n'
import { cssIssueText } from '../css/messages'
import type { Problem, Warning } from './analyze'
import type { Fix } from './fix'

const SHOWN_VALUE = 60
const short = (value: string) => (value.length > SHOWN_VALUE ? value.slice(0, SHOWN_VALUE - 1) + '…' : value)

export function problemText(t: Translate, problem: Problem): string {
  switch (problem.kind) {
    case 'syntax': return t('ai.problem.syntax', { line: problem.line, column: problem.column, message: problem.message })
    case 'field': return t('ai.problem.field', { path: problem.path, expected: problem.expected, value: short(problem.value) })
    case 'css': return t('ai.problem.css', { line: problem.issue.line, column: problem.issue.column, message: cssIssueText(t, problem.issue) })
    case 'empty': return t('ai.problem.empty')
  }
}

export function warningText(t: Translate, warning: Warning): string {
  switch (warning.kind) {
    case 'unknown-key': return t('ai.warning.unknown-key', { path: warning.path })
    case 'contrast': return t('ai.warning.contrast', {
      mode: t(warning.mode === 'light' ? 'ai.mode.light' : 'ai.mode.dark'),
      pair: t(`ai.contrast.${warning.id}` as MessageKey),
      ratio: warning.ratio.toFixed(1),
      required: warning.required,
    })
    case 'font': return t('ai.warning.font', { path: warning.path, value: short(warning.value) })
    case 'css-lines': return t('ai.warning.css-lines', { lines: warning.lines })
    case 'css-foreign': return t('ai.warning.css-foreign', { name: warning.name })
    case 'css-important': return t('ai.warning.css-important')
    case 'css-animation': return t('ai.warning.css-animation')
    case 'css-literal-color': return t('ai.warning.css-literal-color')
  }
}

export function fixText(t: Translate, fix: Fix): string {
  return t(`ai.fix.${fix.kind}` as MessageKey, { path: fix.path, before: short(String(fix.before)), after: short(String(fix.after)) })
}

/** The message a person pastes back to the AI so it can repair its own reply: every problem, numbered, then the ask. */
export function buildErrorFeedback(t: Translate, problems: readonly Problem[]): string {
  const lines = problems.map((problem, index) => `${index + 1}. ${problemText(t, problem)}`)
  return [t('ai.feedback.intro'), '', ...lines, '', t('ai.feedback.outro')].join('\n') + '\n'
}
