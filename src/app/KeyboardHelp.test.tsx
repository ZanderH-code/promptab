import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translate } from '../i18n'
import { KeyboardHelp } from './KeyboardHelp'

afterEach(cleanup)

it('traps focus and restores it after Escape or backdrop dismissal', () => {
  const opener = document.createElement('button')
  document.body.appendChild(opener)
  opener.focus()
  const close = vi.fn()
  const view = render(<KeyboardHelp t={key => translate('en', key)} onClose={close} />)
  const button = screen.getByRole('button', { name: 'Close' })
  expect(button).toHaveFocus()
  fireEvent.keyDown(button, { key: 'Tab' })
  expect(button).toHaveFocus()
  fireEvent.keyDown(button, { key: 'Tab', shiftKey: true })
  expect(button).toHaveFocus()
  fireEvent.keyDown(button, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(opener).toHaveFocus()
  opener.remove()
})

it('closes only when clicking the backdrop and renders Chinese labels', () => {
  const close = vi.fn()
  const { container } = render(<KeyboardHelp t={key => translate('zh-CN', key)} onClose={close} />)
  const dialog = screen.getByRole('dialog')
  expect(dialog.querySelectorAll('kbd')).toHaveLength(6)
  fireEvent.click(dialog)
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(container.querySelector('.modal-backdrop')!)
  expect(close).toHaveBeenCalledTimes(1)
})
