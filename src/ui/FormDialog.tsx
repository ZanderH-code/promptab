import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = { title: string; cancelLabel: string; submitLabel: string; onCancel: () => void; onSubmit: () => void; children?: ReactNode; danger?: boolean; /** Focus the confirm button, for dialogs with no field to type in. */ focusSubmit?: boolean }

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A small modal form with a title and Cancel / confirm buttons, styled like the website editor.
 * Rendered on <body> so the backdrop covers the whole page, not just the area that opened it;
 * Esc and a click on the backdrop cancel. Tab stays inside, and closing returns focus to the
 * element that opened the dialog.
 */
export function FormDialog({ title, cancelLabel, submitLabel, onCancel, onSubmit, children, danger = false, focusSubmit = false }: Props) {
  const titleId = useId()
  const form = useRef<HTMLFormElement>(null)
  // Read during the first render, before autoFocus moves focus into the dialog.
  const opener = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null)
  useEffect(() => {
    const node = form.current, target = opener.current
    return () => {
      // StrictMode re-runs effects while the dialog is still mounted; only a real close restores focus.
      if (node?.isConnected) return
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
  }, [])
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); return }
    if (event.key !== 'Tab') return
    const focusable = Array.from(form.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (!focusable.includes(active as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
    else if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
  }
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
    <form ref={form} className="modal shortcut-editor mnt-form-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onSubmit={event => { event.preventDefault(); onSubmit() }}
      onKeyDown={onKeyDown}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <div className="editor-actions">
        <button type="button" className="editor-cancel" onClick={onCancel}>{cancelLabel}</button>
        <button type="submit" className={danger ? 'primary is-danger' : 'primary'} autoFocus={focusSubmit}>{submitLabel}</button>
      </div>
    </form>
  </div>, document.body)
}
