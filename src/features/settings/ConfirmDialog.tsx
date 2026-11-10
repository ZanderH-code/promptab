import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel: string; cancelLabel: string; danger?: boolean }

/** One accessible confirmation dialog for every settings action; Cancel takes focus and Esc closes it. */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // jsdom (unit tests) has no showModal; the open attribute still renders an accessible dialog there.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    cancelRef.current?.focus()
    return () => { if (dialog.open) { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open') } }
  }, [])
  return (
    <dialog
      ref={ref} className="sd-confirm" role="alertdialog" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined}
      onCancel={event => { event.preventDefault(); onCancel() }}
      onKeyDown={event => event.stopPropagation()}
      onClick={event => { if (event.target === ref.current) onCancel() }}
    >
      <h2 id={titleId}>{title}</h2>
      {body && <div className="sd-confirm-body" id={bodyId}>{body}</div>}
      <div className="sd-confirm-actions">
        <button ref={cancelRef} type="button" className="sd-button" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={danger ? 'sd-button sd-danger' : 'sd-button sd-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}

/** Promise-based confirmation; render `dialog` next to the controls that call `confirm`. */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolve = useRef<(value: boolean) => void>(() => {})
  const opener = useRef<HTMLElement | null>(null)
  const confirm = useCallback((next: ConfirmOptions) => new Promise<boolean>(result => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    resolve.current = result
    setOptions(next)
  }), [])
  const settle = (value: boolean) => {
    resolve.current(value)
    setOptions(null)
    const target = opener.current
    opener.current = null
    if (target?.isConnected) target.focus()
  }
  const dialog = options ? <ConfirmDialog {...options} onConfirm={() => settle(true)} onCancel={() => settle(false)} /> : null
  return { confirm, dialog }
}
