import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel: string; cancelLabel: string; danger?: boolean }

const SELECTED_TAB = '.drawer.sd [role="tab"][aria-selected="true"]'

/** True when a control can still receive focus and is not a removed/disabled opener. */
export function canFocus(element: HTMLElement | null): element is HTMLElement {
  return Boolean(element?.isConnected && element !== document.body && !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true')
}

/** Native close restores focus itself; only unusable openers need the drawer's selected tab instead. */
export function restoreFocus(target: HTMLElement | null) {
  if (canFocus(target)) target.focus()
  else document.querySelector<HTMLElement>(SELECTED_TAB)?.focus()
}

function close(dialog: HTMLDialogElement) {
  if (!dialog.open) return
  // jsdom (unit tests) has no close; the open attribute still renders an accessible dialog there.
  if (typeof dialog.close === 'function') dialog.close()
  else dialog.removeAttribute('open')
}

/** One accessible confirmation dialog for every settings action; Cancel takes focus and Esc closes it. */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const settled = useRef(false)
  const titleId = useId()
  const bodyId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // jsdom (unit tests) has no showModal; the open attribute still renders an accessible dialog there.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    cancelRef.current?.focus()
    return () => close(dialog)
  }, [])
  // Close first so the browser restores focus to the opener before the command changes anything.
  const finish = (value: boolean) => {
    if (settled.current) return
    settled.current = true
    close(ref.current!)
    if (value) onConfirm()
    else onCancel()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    event.stopPropagation()
    if (event.key !== 'Tab') return
    const buttons = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLButtonElement[]
    if (buttons.length === 0) return
    event.preventDefault()
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = index === -1 ? 0 : (index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length
    buttons[next].focus()
  }
  return (
    <dialog
      ref={ref} className="sd-confirm" role="alertdialog" aria-labelledby={titleId} aria-describedby={body ? bodyId : undefined}
      onCancel={event => { event.preventDefault(); finish(false) }}
      onKeyDown={onKeyDown}
      onClick={event => { if (event.target === ref.current) finish(false) }}
    >
      <h2 id={titleId}>{title}</h2>
      {body && <div className="sd-confirm-body" id={bodyId}>{body}</div>}
      <div className="sd-confirm-actions">
        <button ref={cancelRef} type="button" className="sd-button" onClick={() => finish(false)}>{cancelLabel}</button>
        <button ref={confirmRef} type="button" className={danger ? 'sd-button sd-danger' : 'sd-button sd-primary'} onClick={() => finish(true)}>{confirmLabel}</button>
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
    const target = opener.current
    opener.current = null
    resolve.current(value)
    setOptions(null)
    restoreFocus(target)
    // A confirmed command can disable its opener after running; move focus off body to the selected tab.
    setTimeout(() => { if (!canFocus(target)) restoreFocus(null) }, 0)
  }
  const dialog = options ? <ConfirmDialog {...options} onConfirm={() => settle(true)} onCancel={() => settle(false)} /> : null
  return { confirm, dialog }
}
