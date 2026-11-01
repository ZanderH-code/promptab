import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translate } from '../../i18n'
import { PreviewBanner } from './Banners'

afterEach(cleanup)

it('exposes comparison state and keeps apply and discard available', () => {
  const onCompare = vi.fn(), onApply = vi.fn(), onDiscard = vi.fn()
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)
  const props = { t, name: 'Imported', onCompare, onApply, onDiscard }
  const { rerender } = render(<PreviewBanner {...props} />)
  const compare = screen.getByRole('button', { name: 'Compare original' })
  expect(compare.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(compare)
  expect(onCompare).toHaveBeenCalledOnce()
  rerender(<PreviewBanner {...props} showingOriginal />)
  expect(compare.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
  expect(onApply).toHaveBeenCalledOnce()
  expect(onDiscard).toHaveBeenCalledOnce()
})
