import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { EditorState } from '@codemirror/state'
import type { Diagnostic } from '@codemirror/lint'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES } from '../../core/css/api'
import { sanitizeCss, type CssIssue } from '../../core/css/sanitize'

const options = [
  ...CSS_API_CLASSES.map(name => ({ label: `.${name}`, type: 'class' })),
  ...CSS_API_ATTRIBUTES.map(label => ({ label, type: 'property' })),
  ...CSS_API_VARIABLES.map(label => ({ label, type: 'variable' })),
]

export function publicCssCompletion(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/(?:\.[\w-]*|\[[\w-]*|--[\w-]*)/)
  if (!word) return null
  return { from: word.from, options, validFor: /^(?:\.[\w-]*|\[[\w-]*|--[\w-]*)$/ }
}

export function sanitizerDiagnostics(state: EditorState, message: (issue: CssIssue) => string): Diagnostic[] {
  return sanitizeCss(state.doc.toString()).errors.map(issue => {
    const line = state.doc.line(Math.max(1, Math.min(issue.line, state.doc.lines)))
    const from = Math.min(line.to, line.from + Math.max(0, issue.column - 1))
    return { from, to: Math.min(from + 1, state.doc.length), severity: 'error', message: message(issue) }
  })
}
