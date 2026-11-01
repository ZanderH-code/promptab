import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { publicCssCompletion, sanitizerDiagnostics } from './cssEditorExtensions'

describe('CSS editor extensions', () => {
  it('completes public selectors and variables', () => {
    for (const [text, expected] of [['.mnt-cl', '.mnt-clock'], ['var(--mnt-acc', '--mnt-accent'], ['[data-wid', '[data-widget="clock"]']]) {
      const state = EditorState.create({ doc: text })
      const result = publicCssCompletion(new CompletionContext(state, text.length, false))
      expect(result?.options.some(option => option.label === expected)).toBe(true)
    }
  })

  it('maps sanitizer errors to document positions', () => {
    const state = EditorState.create({ doc: '.mnt-clock {\n  behavior: none;\n}' })
    const diagnostics = sanitizerDiagnostics(state, issue => issue.code)
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ from: 15, message: 'property', severity: 'error' })]))
  })
})
