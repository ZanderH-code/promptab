import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FormDialog } from './FormDialog'

afterEach(cleanup)

function renderDialog() {
  const onCancel = vi.fn(), onSubmit = vi.fn()
  const view = render(<FormDialog title="Move" cancelLabel="Cancel" submitLabel="Save" onCancel={onCancel} onSubmit={onSubmit}>
    <label>Name<input /></label>
  </FormDialog>)
  const form = document.querySelector<HTMLFormElement>('.mnt-form-dialog')!
  return { ...view, onCancel, onSubmit, form }
}

describe('FormDialog', () => {
  it('traps Tab and Shift+Tab between the first and last control', () => {
    const { form } = renderDialog()
    const focusable = Array.from(form.querySelectorAll<HTMLElement>('input, button'))
    const first = focusable[0], last = focusable[focusable.length - 1]

    last.focus()
    fireEvent.keyDown(form, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(form, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('pulls focus back in when Tab is pressed from outside the dialog', () => {
    const { form } = renderDialog()
    const first = form.querySelector<HTMLElement>('input')!
    ;(document.activeElement as HTMLElement | null)?.blur()
    fireEvent.keyDown(form, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('returns focus to the opener when it closes', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = renderDialog()
    document.querySelector<HTMLElement>('.mnt-form-dialog .editor-cancel')!.focus()
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('cancels on Escape and keeps the key from the page behind', () => {
    const { form, onCancel } = renderDialog()
    const page = vi.fn()
    window.addEventListener('keydown', page)
    fireEvent.keyDown(form, { key: 'Escape' })
    window.removeEventListener('keydown', page)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(page).not.toHaveBeenCalled()
  })
})
