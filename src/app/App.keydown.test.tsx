import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'

const profile = await migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })
profile.prefs.keyboardShortcuts = true
// The page has a cached profile but its settings are still loading.
vi.mock('./useSettings', () => ({ useSettings: () => ({ settings: null, profile, store: null, error: null, setError: vi.fn(), patch: vi.fn(), reset: vi.fn(), undo: vi.fn(), undoNotice: false, run: vi.fn() }) }))
vi.mock('./useWallpaper', () => ({ useWallpaper: () => ({ url: '', videoUrl: '', posterUrl: '' }) }))
const { default: App } = await import('./App')

afterEach(cleanup)

describe('App while settings load', () => {
  it.each(['a', ',', 'd', 'e', '/'])('ignores the %s shortcut instead of throwing', key => {
    render(<App />)
    const errors: unknown[] = []
    const onError = (event: ErrorEvent) => { errors.push(event.error); event.preventDefault() }
    window.addEventListener('error', onError)
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    window.removeEventListener('error', onError)
    expect(errors).toEqual([])
  })
})
