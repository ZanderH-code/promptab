import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { autocompletion } from '@codemirror/autocomplete'
import { linter, lintGutter } from '@codemirror/lint'
import { cssIssueText } from '../../core/css/messages'
import type { Translate } from '../../i18n'
import { publicCssCompletion, sanitizerDiagnostics } from './cssEditorExtensions'

/**
 * The editor chrome follows the design tokens instead of CodeMirror's light defaults. The editor,
 * the gutter and the active line are painted from the same tokens the drawer uses, so every theme
 * (light, dark, high contrast, custom) keeps the gutter and the code readable.
 */
const editorTheme = EditorView.theme({
  '&': { height: '100%', color: 'var(--mnt-text)', backgroundColor: 'var(--mnt-surface)' },
  '.cm-content': { caretColor: 'var(--mnt-accent-text)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--mnt-accent-text)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--mnt-accent-soft)' },
  '.cm-gutters': { backgroundColor: 'var(--mnt-surface)', color: 'var(--mnt-text-muted)', border: 'none', borderRight: '1px solid var(--mnt-border)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 14px' },
  '.cm-activeLine': { backgroundColor: 'var(--mnt-surface-hover)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--mnt-surface-hover)', color: 'var(--mnt-text)' },
  '.cm-tooltip': { backgroundColor: 'var(--mnt-bg-elevated)', color: 'var(--mnt-text)', border: '1px solid var(--mnt-border)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--mnt-surface-active)', color: 'var(--mnt-text)' },
  '.cm-panels': { backgroundColor: 'var(--mnt-surface)', color: 'var(--mnt-text)' },
})

/** Syntax colours from the same readable tokens: muted text and accent-text are contrast-checked on surfaces. */
const tokenHighlight = HighlightStyle.define([
  { tag: [tags.comment], color: 'var(--mnt-text-muted)', fontStyle: 'italic' },
  { tag: [tags.propertyName, tags.variableName, tags.atom, tags.keyword], color: 'var(--mnt-accent-text)' },
  { tag: [tags.string, tags.number, tags.unit], color: 'var(--mnt-text)' },
  { tag: [tags.punctuation, tags.operator, tags.bracket], color: 'var(--mnt-text)' },
  { tag: [tags.invalid], color: 'var(--mnt-danger)', textDecoration: 'underline' },
])

export default function CssCodeMirror({ value, onChange, label, t }: { value: string; onChange: (value: string) => void; label: string; t: Translate }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({ doc: value, extensions: [
        css(), syntaxHighlighting(tokenHighlight), editorTheme, history(), keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        autocompletion({ override: [publicCssCompletion] }),
        linter(state => sanitizerDiagnostics(state.state, issue => cssIssueText(t, issue))), lintGutter(),
        placeholder('.mnt-clock {\n  letter-spacing: -0.05em;\n}'),
        EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
        EditorView.updateListener.of(update => { if (update.docChanged) onChangeRef.current(update.state.doc.toString()) }),
      ] }),
    })
    view.current = editor
    return () => { view.current = null; editor.destroy() }
    // Text changes are synchronized separately to preserve the editor and its selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, t])
  useEffect(() => {
    const editor = view.current
    if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
  }, [value])
  return <div className="sd-code sd-codemirror" ref={host} />
}
