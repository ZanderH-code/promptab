import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion, type MediaPreference } from './useReducedMotion'

function Probe({ preference }: { preference: MediaPreference }) {
  return <span>{useReducedMotion(preference) ? 'reduced' : 'full'}</span>
}

describe('useReducedMotion', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('follows the preference prop and live system changes', () => {
    const listeners = new Set<() => void>()
    const list = { matches: false, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) }
    vi.stubGlobal('matchMedia', vi.fn(() => list))
    const { container, rerender } = render(<Probe preference="system" />)
    expect(container.textContent).toBe('full')
    rerender(<Probe preference="on" />)
    expect(container.textContent).toBe('reduced')
    rerender(<Probe preference="system" />)
    expect(container.textContent).toBe('full')
    act(() => { list.matches = true; listeners.forEach(listener => listener()) })
    expect(container.textContent).toBe('reduced')
    rerender(<Probe preference="off" />)
    expect(container.textContent).toBe('full')
  })
})
