import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSafeMode } from './safeMode'

const escape = () => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); history.replaceState(null, '', '/') })
afterEach(() => { vi.useRealTimers(); history.replaceState(null, '', '/') })

describe('useSafeMode', () => {
  it('starts in safe mode when the page opens with #safe', () => {
    history.replaceState(null, '', '/#safe')
    expect(renderHook(() => useSafeMode()).result.current.safe).toBe(true)
  })

  it('stays off by default and ignores a single Esc', () => {
    const { result } = renderHook(() => useSafeMode())
    escape()
    expect(result.current.safe).toBe(false)
  })

  it('enters on three quick Esc presses and writes #safe', () => {
    const { result } = renderHook(() => useSafeMode())
    escape(); vi.advanceTimersByTime(200); escape(); vi.advanceTimersByTime(200); escape()
    expect(result.current.safe).toBe(true)
    expect(location.hash).toBe('#safe')
  })

  it('does not count presses spread over too long a time', () => {
    const { result } = renderHook(() => useSafeMode())
    escape(); vi.advanceTimersByTime(1000); escape(); vi.advanceTimersByTime(1000); escape()
    expect(result.current.safe).toBe(false)
  })

  it('leaves only through exit, which clears the hash', () => {
    history.replaceState(null, '', '/#safe')
    const { result } = renderHook(() => useSafeMode())
    act(() => result.current.exit())
    expect(result.current.safe).toBe(false)
    expect(location.hash).toBe('')
  })

  it('follows a #safe typed into an open page', () => {
    const { result } = renderHook(() => useSafeMode())
    act(() => { history.replaceState(null, '', '/#safe'); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(result.current.safe).toBe(true)
  })
})
