import { describe, expect, it } from 'vitest'
import { createProfileStore } from './profile'
import type { ProfileV2 } from '../core/schema/profile'

const profile = (id = 'a'): ProfileV2 => ({
  schemaVersion: 2, meta: { id, name: id, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#000000', surface: '#000000', text: '#ffffff', accent: '#ffffff' }, font: { display: 'serif', ui: 'system' }, radius: 1, shadow: 1, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme', dim: 35 }, layout: { contentWidth: 1000, align: 'center-center', gap: 1, areas: ['clock'] }, widgets: [], bookmarks: { groups: [] },
  search: { engines: [{ id: 'g', name: 'Google', template: 'https://google.com/?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables: [], values: {} },
})

function setup() {
  let saved: any = null
  let fail = false
  let id = 0
  const writes: any[] = []
  const persistence = {
    async read() { return structuredClone(saved) },
    async write(data: any, revision: number | null) {
      if (fail) throw new Error('save failed')
      if ((saved?.revision ?? null) !== revision) throw new Error('conflict')
      saved = structuredClone({ ...data, revision: (revision ?? 0) + 1 })
      writes.push(structuredClone(saved))
      return structuredClone(saved)
    },
  }
  return { persistence, writes, fail: (value: boolean) => { fail = value }, store: createProfileStore({ persistence, initialProfile: profile(), now: () => 1000, createId: () => `id${++id}` }) }
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
})
