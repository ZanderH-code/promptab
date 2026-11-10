import { describe, expect, it, vi } from 'vitest'
import { createProfileStore, type Committed } from './profile'
import type { ProfileV2 } from '../core/schema/profile'

const profile = (id = 'a'): ProfileV2 => ({
  schemaVersion: 2, meta: { id, name: id, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false, reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#000000', surface: '#000000', text: '#ffffff', accent: '#ffffff' }, font: { display: 'serif', ui: 'system' }, radius: 1, shadow: 1, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme', dim: 35 }, layout: { contentWidth: 1000, align: 'center-center', gap: 1, areas: ['clock'] }, widgets: [], bookmarks: { groups: [] },
  search: { engines: [{ id: 'g', name: 'Google', template: 'https://google.com/?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables: [], values: {} },
})

function setup(options: { onExternalRefresh?: () => void; onCommit?: (state: Committed, revision: number | null) => void } = {}) {
  let saved: any = null
  let fail = false
  let id = 0
  const writes: any[] = []
  const persistence = {
    async read() { return structuredClone(saved) },
    async write(data: any, revision: number | null) {
      if (fail) throw new Error('save failed')
      if ((saved?.revision ?? null) !== revision) throw new Error('Profile revision conflict')
      saved = structuredClone({ ...data, revision: (revision ?? 0) + 1 })
      writes.push(structuredClone(saved))
      return structuredClone(saved)
    },
  }
  // Simulates another tab committing a profile change without this store seeing it.
  const external = (update: (value: ProfileV2) => ProfileV2) => {
    const current = structuredClone(saved)
    const activeProfileId = current?.profiles?.activeProfileId ?? 'a'
    const profiles = current?.profiles?.profiles ?? { [activeProfileId]: profile() }
    profiles[activeProfileId] = update(structuredClone(profiles[activeProfileId]))
    saved = { revision: (current?.revision ?? 0) + 1, profiles: { activeProfileId, profiles }, history: current?.history ?? { profiles: {} } }
    writes.push(structuredClone(saved))
  }
  return { persistence, writes, external, fail: (value: boolean) => { fail = value }, store: createProfileStore({ persistence, initialProfile: profile(), now: () => 1000, createId: () => `id${++id}`, onExternalRefresh: options.onExternalRefresh, onCommit: options.onCommit }) }
}

describe('profile store', () => {
  it('coalesces history and undoes the latest committed change per profile', async () => {
    const { store } = setup()
    await store.getState().initialize()
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'one' } }))
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'two' } }))
    expect(store.getState().history.profiles.a.snapshots).toHaveLength(1)
    await store.getState().undo('a')
    expect(store.getState().profiles.a.custom.css).toBe('one')
  })

  it('keeps profile update timestamps monotonic, including undo after a cloud pull', async () => {
    const { store } = setup()
    await store.getState().initialize()
    const original = store.getState().profiles.a.meta.updatedAt
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'local edit' } }))
    const first = store.getState().profiles.a.meta.updatedAt
    expect(Date.parse(first)).toBeGreaterThan(Date.parse(original))

    await store.getState().updateProfile('a', p => ({ ...p, meta: { ...p.meta, name: 'Cloud', updatedAt: '2030-01-01T00:00:00.000Z' } }))
    expect(store.getState().profiles.a.meta.updatedAt).toBe('2030-01-01T00:00:00.000Z')
    await store.getState().undo('a')
    expect(Date.parse(store.getState().profiles.a.meta.updatedAt)).toBeGreaterThan(Date.parse('2030-01-01T00:00:00.000Z'))
  })

  it('keeps drafts and previews in memory only', async () => {
    const { store, writes } = setup()
    await store.getState().initialize()
    store.getState().setDraft('a', { ...profile(), name: 'ignored' } as ProfileV2)
    store.getState().setPreview('a', { ...profile(), custom: { ...profile().custom, css: 'preview' } })
    expect(writes).toHaveLength(0)
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'saved' } }))
    expect(JSON.stringify(writes)).not.toContain('preview')
    expect(store.getState().preview?.profile.custom.css).toBe('preview')
  })

  it('preserves committed state and revision after a failed save', async () => {
    const { store, fail } = setup()
    await store.getState().initialize()
    fail(true)
    await expect(store.getState().renameProfile('a', 'changed')).rejects.toThrow('save failed')
    expect(store.getState().profiles.a.meta.name).toBe('a')
    expect(store.getState().revision).toBeNull()
    fail(false)
    await store.getState().renameProfile('a', 'works')
    expect(store.getState().profiles.a.meta.name).toBe('works')
  })

  it('refresh is a no-op when the revision is unchanged', async () => {
    const onExternalRefresh = vi.fn()
    const { store } = setup({ onExternalRefresh })
    await store.getState().initialize()
    await store.getState().renameProfile('a', 'Alpha')
    const state = store.getState()
    await store.getState().refresh()
    expect(store.getState()).toBe(state)
    expect(onExternalRefresh).not.toHaveBeenCalled()
  })

  it('refresh adopts an externally changed revision and clears the undo stack', async () => {
    const onExternalRefresh = vi.fn()
    const { store, external } = setup({ onExternalRefresh })
    await store.getState().initialize()
    await store.getState().renameProfile('a', 'Alpha')
    external(value => ({ ...value, meta: { ...value.meta, name: 'Other tab' } }))
    await store.getState().refresh()
    expect(store.getState().profiles.a.meta.name).toBe('Other tab')
    expect(store.getState().revision).toBe(2)
    expect(onExternalRefresh).toHaveBeenCalledTimes(1)
    await expect(store.getState().undo('a')).rejects.toThrow('Nothing to undo')
  })

  it('retries a functional update once on a revision conflict', async () => {
    const { store, external } = setup()
    await store.getState().initialize()
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'one' } }))
    external(value => ({ ...value, custom: { ...value.custom, css: 'other tab' } }))
    let calls = 0
    await store.getState().updateProfile('a', p => {
      calls++
      return { ...p, custom: { ...p.custom, css: `${p.custom.css} + local` } }
    }, undefined, true)
    expect(calls).toBe(2)
    expect(store.getState().profiles.a.custom.css).toBe('other tab + local')
    expect(store.getState().revision).toBe(3)
    await store.getState().undo('a')
    expect(store.getState().profiles.a.custom.css).toBe('other tab')
  })

  it('does not retry a write built from stale state and reports the conflict', async () => {
    const { store, external } = setup()
    await store.getState().initialize()
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'one' } }))
    external(value => ({ ...value, custom: { ...value.custom, css: 'other tab' } }))
    let calls = 0
    const stale = structuredClone(store.getState().profiles.a)
    await expect(store.getState().updateProfile('a', () => {
      calls++
      return { ...stale, custom: { ...stale.custom, css: 'stale local' } }
    })).rejects.toMatchObject({ key: 'error.changedInAnotherTab' })
    expect(calls).toBe(1)
    expect(store.getState().profiles.a.custom.css).toBe('other tab')
    expect(store.getState().revision).toBe(2)
  })

  it('serializes profile lifecycle and persists the active profile', async () => {
    const { store, persistence } = setup()
    await store.getState().initialize()
    await Promise.all([store.getState().createProfile(profile('b')), store.getState().renameProfile('a', 'Alpha')])
    await store.getState().switchProfile('b')
    await store.getState().deleteProfile('a')
    expect(store.getState().activeProfileId).toBe('b')
    await expect(store.getState().deleteProfile('b')).rejects.toThrow()
    const second = createProfileStore({ persistence, initialProfile: profile() })
    await second.getState().initialize()
    expect(Object.keys(second.getState().profiles)).toEqual(['b'])
    expect(second.getState().activeProfileId).toBe('b')
  })

  it('keeps undo stacks separate across profiles', async () => {
    const { store } = setup()
    await store.getState().initialize()
    await store.getState().createProfile(profile('b'))
    await store.getState().renameProfile('a', 'Alpha')
    await store.getState().renameProfile('b', 'Beta')
    await store.getState().undo('a')
    expect(store.getState().profiles.a.meta.name).toBe('a')
    expect(store.getState().profiles.b.meta.name).toBe('Beta')
  })

  it('continues queued writes after a rejected write', async () => {
    let attempts = 0
    const persistence = {
      async read() { return null },
      async write(_data: unknown, revision: number | null) {
        if (++attempts === 1) throw new Error('save failed')
        expect(revision).toBeNull()
        return { revision: 1 }
      },
    }
    const store = createProfileStore({ persistence, initialProfile: profile() })
    await store.getState().initialize()
    const first = store.getState().renameProfile('a', 'failed')
    const second = store.getState().renameProfile('a', 'saved')
    await expect(first).rejects.toThrow('save failed')
    await second
    expect(store.getState().profiles.a.meta.name).toBe('saved')
    expect(store.getState().history.profiles.a.snapshots[0].profile.meta.name).toBe('a')
  })

  it('forces history for reset and import and supports pin and restore', async () => {
    const { store } = setup()
    await store.getState().initialize()
    await store.getState().resetProfile('a', { ...profile(), meta: { ...profile().meta, name: 'reset' } })
    await store.getState().importProfile('a', { ...profile(), meta: { ...profile().meta, name: 'import' } })
    const snapshots = store.getState().history.profiles.a.snapshots
    expect(snapshots.map(s => s.kind)).toEqual(['import', 'reset'])
    await store.getState().pinSnapshot('a', snapshots[1].id, true)
    await store.getState().restoreSnapshot('a', snapshots[1].id)
    expect(store.getState().profiles.a.meta.name).toBe('a')
    expect(store.getState().history.profiles.a.snapshots.find(s => s.id === snapshots[1].id)?.pinned).toBe(true)
  })

  it('archives deleted profiles with history and restores them without changing the active profile', async () => {
    const { store, persistence } = setup()
    await store.getState().initialize()
    await store.getState().createProfile(profile('b'))
    await store.getState().renameProfile('b', 'Beta')
    await store.getState().deleteProfile('b')
    expect(store.getState().history.profiles.b).toBeUndefined()
    expect(store.getState().archived.b.history.snapshots).toHaveLength(1)
    await expect(store.getState().createProfile(profile('b'))).rejects.toThrow()
    const second = createProfileStore({ persistence, initialProfile: profile() })
    await second.getState().initialize()
    await second.getState().restoreArchivedProfile('b')
    expect(second.getState().profiles.b.meta.name).toBe('Beta')
    expect(second.getState().history.profiles.b.snapshots).toHaveLength(1)
    expect(second.getState().archived).toEqual({})
    expect(second.getState().activeProfileId).toBe('a')
    await expect(second.getState().restoreArchivedProfile('b')).rejects.toThrow()
  })

  it('imports a collection through the queue, archiving omitted profiles and snapshotting retained ones', async () => {
    const { store, writes } = setup()
    await store.getState().initialize()
    await store.getState().createProfile(profile('b'))
    store.getState().setDraft('a', profile())
    const pending = store.getState().renameProfile('a', 'Alpha')
    await store.getState().importCollection({ activeProfileId: 'c', profiles: [profile('a'), profile('c')] })
    await pending
    const state = store.getState()
    expect(Object.keys(state.profiles).sort()).toEqual(['a', 'c'])
    expect(state.activeProfileId).toBe('c')
    expect(state.draft).toBeNull()
    expect(state.history.profiles.a.snapshots.map(x => x.kind)).toEqual(['import', 'edit'])
    expect(state.history.profiles.a.snapshots[0].profile.meta.name).toBe('Alpha')
    expect(Object.keys(state.archived)).toEqual(['b'])
    expect(state.archived.b.history.snapshots[0].kind).toBe('import')
    await expect(state.undo('a')).rejects.toThrow('Nothing to undo')
    expect(writes.at(-1).profiles.archived.b.profile.meta.id).toBe('b')
  })

  it('rejects invalid imports without changing state', async () => {
    const { store } = setup()
    await store.getState().initialize()
    await expect(store.getState().importCollection({ activeProfileId: 'x', profiles: [profile('a')] })).rejects.toThrow()
    await expect(store.getState().importCollection({ activeProfileId: 'a', profiles: [profile('a'), profile('a')] })).rejects.toThrow()
    expect(Object.keys(store.getState().profiles)).toEqual(['a'])
    expect(store.getState().revision).toBeNull()
  })

  it('reports every persisted change to the paint cache with the stored revision', async () => {
    const calls: Array<{ id: string; profile: ProfileV2; revision: number | null }> = []
    const { store, external, writes } = setup({ onCommit: (state, revision) => calls.push({ id: state.activeProfileId, profile: state.profiles[state.activeProfileId], revision }) })
    await store.getState().initialize()
    const expectFresh = () => {
      const call = calls.at(-1)!
      const stored = writes.at(-1)
      const active = stored.profiles.activeProfileId
      expect(call.id).toBe(active)
      expect(call.profile.meta.id).toBe(active)
      expect(call.revision).toBe(stored.revision)
      expect(call.profile.meta.updatedAt).toBe(stored.profiles.profiles[active].meta.updatedAt)
    }
    await store.getState().updateProfile('a', p => ({ ...p, custom: { ...p.custom, css: 'one' } }))
    expectFresh()
    await store.getState().undo('a')
    expectFresh()
    await store.getState().createProfile(profile('b'))
    await store.getState().switchProfile('b')
    expect(calls.at(-1)!.id).toBe('b')
    expectFresh()
    await store.getState().importProfile('b', { ...profile('b'), meta: { ...profile('b').meta, name: 'imported' } })
    expectFresh()
    const count = calls.length
    store.getState().setDraft('b', profile('b'))
    store.getState().setPreview('b', profile('b'))
    store.getState().clearDraft()
    store.getState().clearPreview()
    expect(calls).toHaveLength(count)
    await store.getState().deleteProfile('b')
    expect(calls.at(-1)!.id).toBe('a')
    expectFresh()
    external(value => ({ ...value, meta: { ...value.meta, name: 'Other tab' } }))
    await store.getState().refresh()
    expectFresh()
  })
})
