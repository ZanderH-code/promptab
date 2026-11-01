import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { autocompletion } from '@codemirror/autocomplete'
import { linter, lintGutter } from '@codemirror/lint'
import { cssIssueText } from '../../core/css/messages'
import type { Translate } from '../../i18n'
import { publicCssCompletion, sanitizerDiagnostics } from './cssEditorExtensions'

export default function CssCodeMirror({ value, onChange, label, t }: { value: string; onChange: (value: string) => void; label: string; t: Translate }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({ doc: value, extensions: [
        css(), syntaxHighlighting(defaultHighlightStyle), history(), keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
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
