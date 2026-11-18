import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = { title: string; cancelLabel: string; submitLabel: string; onCancel: () => void; onSubmit: () => void; children?: ReactNode; danger?: boolean; /** Focus the confirm button, for dialogs with no field to type in. */ focusSubmit?: boolean }

/**
 * A small modal form with a title and Cancel / confirm buttons, styled like the website editor.
 * Rendered on <body> so the backdrop covers the whole page, not just the area that opened it;
 * Esc and a click on the backdrop cancel.
 */
export function FormDialog({ title, cancelLabel, submitLabel, onCancel, onSubmit, children, danger = false, focusSubmit = false }: Props) {
  const titleId = useId()
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
    <form className="modal shortcut-editor mnt-form-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onSubmit={event => { event.preventDefault(); onSubmit() }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel() } }}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <div className="editor-actions">
        <button type="button" className="editor-cancel" onClick={onCancel}>{cancelLabel}</button>
        <button type="submit" className={danger ? 'primary is-danger' : 'primary'} autoFocus={focusSubmit}>{submitLabel}</button>
      </div>
    </form>
  </div>, document.body)
}
