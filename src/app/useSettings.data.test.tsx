import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'

type Saved = { revision: number; profiles: { activeProfileId: string; profiles: Record<string, ProfileV2> }; history: { profiles: Record<string, unknown> } }
const mocks = vi.hoisted(() => ({
  saved: null as unknown as Saved,
  assets: { add: vi.fn(), get: vi.fn(), openSession: vi.fn(async () => ({ collection: { status: 'skipped', reason: 'busy' } })) },
}))
vi.mock('../storage/bootstrap', () => ({ bootstrap: async () => structuredClone(mocks.saved) }))
vi.mock('../storage/assets', () => ({ createAssetLibrary: () => mocks.assets }))
vi.mock('../storage/profiles', () => ({
  createLocalStorageBackend: vi.fn(), createChromeStorageBackend: vi.fn(), PROFILE_INDEX_KEY: 'profiles:v2:index',
  createProfileStorage: () => ({
    read: async () => structuredClone(mocks.saved),
    write: async (data: Omit<Saved, 'revision'>, revision: number | null) => {
      if (revision !== mocks.saved.revision) throw new Error('Profile revision conflict')
      mocks.saved = structuredClone({ ...data, revision: revision + 1 }) as Saved
      return { revision: mocks.saved.revision }
    },
  }),
}))
import { clearImageUrls } from './imageUrls'
import { useSettings } from './useSettings'

const reference = `mnt-asset:${'b'.repeat(64)}`
afterEach(() => { cleanup(); vi.clearAllMocks(); clearImageUrls() })

async function setup(edit: (profile: ProfileV2) => void = () => {}) {
  const profile = await migrateV1({ ...defaults, language: 'en' }, { id: () => 'main', now: () => '2026-10-31T00:00:00Z', add: vi.fn() })
  edit(profile)
  mocks.saved = { revision: 1, profiles: { activeProfileId: 'main', profiles: { main: profile } }, history: { profiles: {} } }
  const hook = renderHook(() => useSettings())
  await waitFor(() => expect(hook.result.current.settings).not.toBeNull())
  return hook
}

/** Another tab publishes a change; this page has not re-rendered since. */
function externalEdit(edit: (profile: ProfileV2) => void) {
  const next = structuredClone(mocks.saved)
  edit(next.profiles.profiles.main)
  mocks.saved = { ...next, revision: next.revision + 1 }
}

describe('settings data path', () => {
  it('applies a patch to a profile adopted from another tab while its image was being stored', async () => {
    const hook = await setup()
    const { patch, store, settings } = hook.result.current
    let stored!: (reference: string) => void
    mocks.assets.add.mockImplementation(() => new Promise(resolve => { stored = resolve }))
    act(() => patch({ shortcuts: settings!.shortcuts.map(item => ({ ...item, image: 'data:image/png;base64,cG5n' })) }))
    await waitFor(() => expect(mocks.assets.add).toHaveBeenCalled())
    externalEdit(profile => { profile.custom.css = '.other{}' })
    await act(async () => { await store!.getState().refresh() })
    await act(async () => { stored(reference) })
    await waitFor(() => expect(mocks.saved.profiles.profiles.main.bookmarks.groups[0].items[0].image).toBe(reference))
    expect(mocks.saved.profiles.profiles.main.custom.css).toBe('.other{}')
    expect(hook.result.current.error).toBeNull()
  })

  it('refuses a shortcut list built before another tab changed the bookmarks', async () => {
    const hook = await setup()
    const { patch, store, settings } = hook.result.current
    externalEdit(profile => { profile.bookmarks.groups[0].items[0].name = 'Renamed elsewhere' })
    await act(async () => {
      await store!.getState().refresh()
      patch({ shortcuts: settings!.shortcuts.map(item => ({ ...item, url: 'https://changed.example' })) })
    })
    await waitFor(() => expect(hook.result.current.error?.key).toBe('error.changedInAnotherTab'))
    expect(mocks.saved.profiles.profiles.main.bookmarks.groups[0].items[0]).toMatchObject({ name: 'Renamed elsewhere', url: defaults.shortcuts[0].url })
  })

  it('reads each image asset once, then patches accents and renames without asset reads or writes', async () => {
    mocks.assets.get.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }))
    const hook = await setup(profile => { profile.bookmarks.groups[0].items[0].image = reference })
    expect(hook.result.current.settings!.shortcuts[0].image).toMatch(/^data:image\/png;base64,/)
    expect(mocks.assets.get).toHaveBeenCalledTimes(1)
    mocks.assets.get.mockClear()

    act(() => hook.result.current.patch({ accent: '#112233' }))
    await waitFor(() => expect(hook.result.current.settings!.accent).toBe('#112233'))
    act(() => hook.result.current.patch({ shortcuts: hook.result.current.settings!.shortcuts.map(item => ({ ...item, name: 'Renamed' })) }))
    await waitFor(() => expect(hook.result.current.settings!.shortcuts[0].name).toBe('Renamed'))

    expect(mocks.assets.get).not.toHaveBeenCalled()
    expect(mocks.assets.add).not.toHaveBeenCalled()
    expect(mocks.saved.profiles.profiles.main.bookmarks.groups[0].items[0].image).toBe(reference)
  })

  it('keeps the chosen language when everything is reset', async () => {
    const hook = await setup(profile => { profile.prefs.language = 'en'; profile.theme.color.accent = '#445566' })
    act(() => hook.result.current.reset())
    await waitFor(() => expect(hook.result.current.profile!.theme.color.accent).toBe(defaults.accent))
    expect(hook.result.current.profile!.prefs.language).toBe('en')
    expect(hook.result.current.settings!.language).toBe('en')
  })
})
