import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import { cssCompletion, pitfallDiagnostics, publicCssCompletion, sanitizerDiagnostics } from './cssEditorExtensions'

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

  it('explains each class in the completion list, in the interface language', () => {
    const text = '.mnt-search-in'
    const state = EditorState.create({ doc: text })
    const option = cssCompletion('zh-CN')(new CompletionContext(state, text.length, false))?.options.find(item => item.label === '.mnt-search-input')
    expect(option?.info).toContain('搜索栏')
  })

  it('maps pitfalls to warnings at the rule that causes them', () => {
    const state = EditorState.create({ doc: '.mnt-clock { color: red; }\n.mnt-date { letter-spacing: 0.3em; }' })
    expect(pitfallDiagnostics(state, pitfall => pitfall.kind, false)).toEqual([])
    const [warning] = pitfallDiagnostics(state, pitfall => pitfall.kind, true)
    expect(warning).toMatchObject({ from: 27, severity: 'warning', message: 'cjk-tracking' })
  })
})
