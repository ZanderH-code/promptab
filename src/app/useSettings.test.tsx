import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'

const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), read: vi.fn(), write: vi.fn() }))
vi.mock('../storage/bootstrap', () => ({ bootstrap: mocks.bootstrap }))
vi.mock('../storage/profiles', () => ({ createLocalStorageBackend: vi.fn(), createChromeStorageBackend: vi.fn(), createProfileStorage: () => ({ read: mocks.read, write: mocks.write }), PROFILE_INDEX_KEY: 'profiles:v2:index' }))
import { useSettings } from './useSettings'

afterEach(() => { cleanup(); vi.clearAllMocks() })

async function setup(split = false) {
  const profile = await migrateV1({ ...defaults, layout: split ? 'split' : 'stacked' }, { id: () => 'main', now: () => '2026-10-31T00:00:00Z', add: vi.fn() })
  const snapshot = { revision: 1, profiles: { activeProfileId: 'main', profiles: { main: profile } }, history: { profiles: {} } }
  mocks.bootstrap.mockResolvedValue(snapshot)
  mocks.read.mockResolvedValue(snapshot)
  let revision = 1
  mocks.write.mockImplementation(async () => ({ revision: ++revision }))
  const hook = renderHook(() => useSettings())
  await waitFor(() => expect(hook.result.current.settings).not.toBeNull())
  return { ...hook, profile }
}

describe('v2 settings integration', () => {
  it('adds a bookmark to its chosen group in one undoable update', async () => {
    const hook = await setup()
    act(() => hook.result.current.run((store, id) => store.getState().updateProfile(id, p => ({ ...p, bookmarks: { groups: [...p.bookmarks.groups, { id: 'other', name: 'Other', collapsed: false, items: [] }] } }))))
    await waitFor(() => expect(hook.result.current.profile!.bookmarks.groups).toHaveLength(2))
    const item = { id: 'new', name: 'New', url: 'https://example.org', color: '#123456', icon: 'N' }
    act(() => hook.result.current.patch({ shortcuts: [...hook.result.current.settings!.shortcuts, item] }, 'other'))
    await waitFor(() => expect(hook.result.current.profile!.bookmarks.groups[1].items).toHaveLength(1))
    act(() => hook.result.current.undo())
    await waitFor(() => expect(hook.result.current.profile!.bookmarks.groups[1].items).toHaveLength(0))
    expect(hook.result.current.profile!.bookmarks.groups).toHaveLength(2)
  })

  it('projects a history preview without saving it and restores the live view', async () => {
    const hook = await setup()
    const preview = structuredClone(hook.profile)
    preview.theme.color.accent = '#abcdef'
    act(() => hook.result.current.store!.getState().setPreview('main', preview))
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe('#abcdef'))
    expect(mocks.write).not.toHaveBeenCalled()
    act(() => hook.result.current.store!.getState().clearPreview())
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe(defaults.accent))
  })

  it('compares a preview with the saved profile without losing the candidate', async () => {
    const hook = await setup()
    const preview = structuredClone(hook.profile)
    preview.theme.color.accent = '#abcdef'
    act(() => hook.result.current.store!.getState().setPreview('main', preview, 'Imported'))
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe('#abcdef'))
    act(() => hook.result.current.store!.getState().setPreviewOriginal(true))
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe(defaults.accent))
    expect(hook.result.current.store!.getState().preview!.profile.theme.color.accent).toBe('#abcdef')
    expect(mocks.write).not.toHaveBeenCalled()
    act(() => hook.result.current.store!.getState().setPreviewOriginal(false))
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe('#abcdef'))
    act(() => hook.result.current.store!.getState().clearPreview())
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe(defaults.accent))
  })

  it('edits the light palette without changing the dark colors', async () => {
    const hook = await setup()
    act(() => hook.result.current.patch({ theme: 'light' }))
    await waitFor(() => expect(hook.result.current.settings!.theme).toBe('light'))
    act(() => hook.result.current.patch({ background: '#faf4e8', accent: '#884422' }))
    await waitFor(() => expect(hook.result.current.settings!.background).toBe('#faf4e8'))
    expect(hook.result.current.profile!.theme.colorLight).toMatchObject({ bg: '#faf4e8', accent: '#884422' })
    expect(hook.result.current.profile!.theme.color.bg).toBe(defaults.background)
    expect(hook.result.current.profile!.theme.color.accent).toBe(defaults.accent)
  })

  it('clears the migrated custom engine label when its template is edited', async () => {
    const hook = await setup()
    act(() => hook.result.current.patch({ searchTemplate: 'https://another.example/?q={query}' }))
    await waitFor(() => expect(hook.result.current.profile!.search.engines[0].template).toBe('https://another.example/?q={query}'))
    expect(hook.result.current.profile!.search.engines[0].builtinName).toBeUndefined()
  })

  it('keeps migrated split order and changes reverse consistently', async () => {
    const hook = await setup(true)
    expect(hook.result.current.settings!.reverse).toBe(defaults.reverse)
    act(() => hook.result.current.patch({ reverse: !defaults.reverse }))
    await waitFor(() => expect(hook.result.current.settings!.reverse).toBe(!defaults.reverse))
    expect(hook.result.current.profile!.layout.areas).toEqual(defaults.reverse ? ['bookmarks overview'] : ['overview bookmarks'])
  })

  it('resets the full active profile, including wallpaper, with an undoable reset snapshot', async () => {
    const hook = await setup()
    act(() => hook.result.current.run((store, id) => store.getState().updateProfile(id, p => ({ ...p, background: { type: 'image', dim: 35, image: { asset: `mnt-asset:${'a'.repeat(64)}`, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } }))))
    await waitFor(() => expect(hook.result.current.profile!.background.type).toBe('image'))
    act(() => hook.result.current.reset())
    await waitFor(() => expect(hook.result.current.profile!.background.type).toBe('theme'))
    expect(hook.result.current.store!.getState().history.profiles.main.snapshots[0].kind).toBe('reset')
    act(() => hook.result.current.undo())
    await waitFor(() => expect(hook.result.current.profile!.background.type).toBe('image'))
  })
})
