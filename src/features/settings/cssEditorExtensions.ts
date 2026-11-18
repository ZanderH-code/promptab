import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { EditorState } from '@codemirror/state'
import type { Diagnostic } from '@codemirror/lint'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES } from '../../core/css/api'
import { CLASS_NOTES } from '../../core/css/notes'
import { findCssPitfalls, type CssPitfall } from '../../core/css/pitfalls'
import { sanitizeCss, type CssIssue } from '../../core/css/sanitize'
import type { Language } from '../../i18n'

/** Public selectors and variables; each class says what element it is, so a name is not read literally. */
const optionsFor = (language: Language) => [
  ...CSS_API_CLASSES.map(name => ({ label: `.${name}`, type: 'class', info: CLASS_NOTES[name][language === 'zh-CN' ? 'zh' : 'en'] })),
  ...CSS_API_ATTRIBUTES.map(label => ({ label, type: 'property' })),
  ...CSS_API_VARIABLES.map(label => ({ label, type: 'variable' })),
]

export function cssCompletion(language: Language) {
  const options = optionsFor(language)
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/(?:\.[\w-]*|\[[\w-]*|--[\w-]*)/)
    if (!word) return null
    return { from: word.from, options, validFor: /^(?:\.[\w-]*|\[[\w-]*|--[\w-]*)$/ }
  }
}

export const publicCssCompletion = cssCompletion('en')

/** Valid CSS that will look wrong on the page, as warnings at the rule that causes it. */
export function pitfallDiagnostics(state: EditorState, message: (pitfall: CssPitfall) => string, cjk: boolean): Diagnostic[] {
  return findCssPitfalls(state.doc.toString(), { cjk }).map(pitfall => {
    const line = state.doc.line(Math.max(1, Math.min(pitfall.line, state.doc.lines)))
    const from = Math.min(line.to, line.from + Math.max(0, pitfall.column - 1))
    return { from, to: Math.min(line.to, Math.max(from + 1, line.to)), severity: 'warning', message: message(pitfall) }
  })
}

export function sanitizerDiagnostics(state: EditorState, message: (issue: CssIssue) => string): Diagnostic[] {
  return sanitizeCss(state.doc.toString()).errors.map(issue => {
    const line = state.doc.line(Math.max(1, Math.min(issue.line, state.doc.lines)))
    const from = Math.min(line.to, line.from + Math.max(0, issue.column - 1))
    return { from, to: Math.min(from + 1, state.doc.length), severity: 'error', message: message(issue) }
  })
}
