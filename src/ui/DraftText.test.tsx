// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DraftText } from './DraftText'
import { DRAFT_DELAY } from './useDraftText'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('DraftText', () => {
  it('keeps every keystroke while an older save is still on its way back', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    // The saved value lags behind, as it does when profile saves are asynchronous.
    const view = render(<DraftText aria-label="Title" value="" onCommit={onCommit} />)
    const box = screen.getByRole('textbox', { name: 'Title' })
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'he' } })
    view.rerender(<DraftText aria-label="Title" value="h" onCommit={onCommit} />)
    fireEvent.change(box, { target: { value: 'hello' } })
    expect(box).toHaveValue('hello')
    expect(onCommit).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(DRAFT_DELAY) })
    expect(onCommit).toHaveBeenCalledOnce()
    expect(onCommit).toHaveBeenCalledWith('hello')
  })

  it('waits for IME composition to finish before saving', () => {
    vi.useFakeTimers()
    const onCommit = vi.fn()
    render(<DraftText aria-label="Note" multiline value="" onCommit={onCommit} />)
    const box = screen.getByRole('textbox', { name: 'Note' })
    fireEvent.focus(box)
    fireEvent.compositionStart(box)
    fireEvent.change(box, { target: { value: 'nihao' } })
    act(() => { vi.advanceTimersByTime(DRAFT_DELAY * 3) })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: '你好' } })
    fireEvent.compositionEnd(box)
    act(() => { vi.advanceTimersByTime(DRAFT_DELAY) })
    expect(onCommit).toHaveBeenCalledWith('你好')
  })

  it('saves at once on blur and takes outside changes when not being edited', () => {
    const onCommit = vi.fn()
    const view = render(<DraftText aria-label="Title" value="old" onCommit={onCommit} />)
    const box = screen.getByRole('textbox', { name: 'Title' })
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'new' } })
    fireEvent.blur(box)
    expect(onCommit).toHaveBeenCalledWith('new')
    view.rerender(<DraftText aria-label="Title" value="restored by undo" onCommit={onCommit} />)
    expect(box).toHaveValue('restored by undo')
  })
})
