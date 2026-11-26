import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaults, type Settings } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'

// Mutable so one file can cover both the loading page and the loaded page.
const app = vi.hoisted(() => ({ settings: null as Settings | null, profile: null as ProfileV2 | null, undo: vi.fn(), patch: vi.fn() }))
vi.mock('./useSettings', () => ({ useSettings: () => ({ settings: app.settings, profile: app.profile, store: null, error: null, setError: vi.fn(), patch: app.patch, reset: vi.fn(), undo: app.undo, undoNotice: false, run: vi.fn() }) }))
vi.mock('./useWallpaper', () => ({ useWallpaper: () => ({ url: '', videoUrl: '', posterUrl: '' }) }))
// The key handler is the subject; widgets only add unrelated work here.
vi.mock('../widgets/ProfileWidgets', () => ({ ProfileWidgets: () => null }))
const { default: App } = await import('./App')

const profile = await migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })
profile.prefs.keyboardShortcuts = true

function renderLoaded() {
  app.settings = defaults
  app.profile = profile
  return render(<App />)
}

function press(init: KeyboardEventInit) {
  act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init })) })
}

const toolbar = () => document.querySelector('.edit-toolbar')
const safeBanner = () => document.querySelector('.mnt-banner[data-kind="safe"]')

afterEach(() => {
  cleanup()
  app.settings = null
  app.profile = null
  vi.clearAllMocks()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
})

describe('App while settings load', () => {
  it.each(['a', ',', 'd', 'e', '/'])('ignores the %s shortcut instead of throwing', key => {
    render(<App />)
    const errors: unknown[] = []
    const onError = (event: ErrorEvent) => { errors.push(event.error); event.preventDefault() }
    window.addEventListener('error', onError)
    press({ key })
    window.removeEventListener('error', onError)
    expect(errors).toEqual([])
  })
})

describe('App undo guard', () => {
  it('still undoes while the settings drawer is open, because the drawer edits the page', () => {
    renderLoaded()
    document.body.insertAdjacentHTML('beforeend', '<div class="drawer sd"></div>')
    press({ key: 'z', ctrlKey: true })
    expect(app.undo).toHaveBeenCalledTimes(1)
  })

  it('undoes with Ctrl/Cmd+Z on the page itself', () => {
    renderLoaded()
    press({ key: 'z', ctrlKey: true })
    expect(app.undo).toHaveBeenCalledTimes(1)
    press({ key: 'z', metaKey: true })
    expect(app.undo).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['a modal dialog', '<div class="modal-backdrop"></div>'],
    ['a folder dialog', '<div class="mnt-folder-dialog" role="dialog"></div>'],
  ])('does not undo the page behind %s', (_name, html) => {
    renderLoaded()
    document.body.insertAdjacentHTML('beforeend', html)
    press({ key: 'z', ctrlKey: true })
    expect(app.undo).not.toHaveBeenCalled()
  })
})

describe('App edit mode', () => {
  it('leaves edit mode on a single Escape', () => {
    renderLoaded()
    press({ key: 'e' })
    expect(toolbar()).not.toBeNull()
    press({ key: 'Escape' })
    expect(toolbar()).toBeNull()
  })

  it('keeps edit mode when a dialog or drawer is open, and leaves once it closes', () => {
    renderLoaded()
    press({ key: 'e' })
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop"></div>')
    press({ key: 'Escape' })
    expect(toolbar()).not.toBeNull()
    document.body.querySelector('.modal-backdrop')!.remove()
    press({ key: 'Escape' })
    expect(toolbar()).toBeNull()
  })

  it('lets the context menu close on Escape without leaving edit mode at the same time', () => {
    renderLoaded()
    press({ key: 'e' })
    document.body.insertAdjacentHTML('beforeend', '<div class="context-menu"></div>')
    press({ key: 'Escape' })
    expect(toolbar()).not.toBeNull()
    document.body.querySelector('.context-menu')!.remove()
    press({ key: 'Escape' })
    expect(toolbar()).toBeNull()
  })

  it('still counts the Esc presses that leave edit mode towards 3×Esc safe mode', () => {
    renderLoaded()
    press({ key: 'e' })
    expect(toolbar()).not.toBeNull()
    press({ key: 'Escape' })
    press({ key: 'Escape' })
    press({ key: 'Escape' })
    expect(toolbar()).toBeNull()
    expect(safeBanner()).not.toBeNull()
    expect(location.hash).toBe('#safe')
  })
})
