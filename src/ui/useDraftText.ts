import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'

/** Wait this long after the last keystroke before saving, so one word is one save and one undo step. */
export const DRAFT_DELAY = 400

type Field = HTMLInputElement | HTMLTextAreaElement

/**
 * Keeps what the person is typing in local state and saves it after a short pause, on blur and on unmount.
 *
 * Profile saves are asynchronous; binding a text field straight to the saved value lets an older save
 * overwrite newer keystrokes (typing "hello" fast could leave "hlo"), and breaks IME composition.
 */
export function useDraftText(value: string, commit: (value: string) => void, delay = DRAFT_DELAY) {
  const [draft, setDraft] = useState(value)
  const pending = useRef<string | null>(null)
  const focused = useRef(false)
  const composing = useRef(false)
  const timer = useRef(0)
  const save = useRef(commit)
  save.current = commit

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (pending.current === null) return
    const next = pending.current
    pending.current = null
    save.current(next)
  }, [])

  // Outside edits (undo, import, another tab) replace the draft unless the person is typing in this field.
  useEffect(() => { if (!focused.current && pending.current === null) setDraft(value) }, [value])
  useEffect(() => flush, [flush])

  const schedule = () => {
    window.clearTimeout(timer.current)
    if (!composing.current) timer.current = window.setTimeout(flush, delay)
  }

  return {
    value: draft,
    onChange: (event: ChangeEvent<Field>) => {
      setDraft(event.target.value)
      pending.current = event.target.value
      schedule()
    },
    onCompositionStart: () => { composing.current = true; window.clearTimeout(timer.current) },
    onCompositionEnd: (event: CompositionEvent<Field>) => {
      composing.current = false
      pending.current = event.currentTarget.value
      schedule()
    },
    onFocus: () => { focused.current = true },
    onBlur: () => { focused.current = false; composing.current = false; flush() },
    /** Saves the current draft now, e.g. before Enter submits a form. */
    flush,
  }
}
