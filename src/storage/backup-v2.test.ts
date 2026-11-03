// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import { parseBackupV2, serializeBackupV2 } from '../core/backup-v2'
import { exportThemePack } from '../core/ai/apply'
import type { SavedTheme } from '../core/themes/library'
import { createAssetLibrary, type AssetRecord, type AssetStore } from './assets'
import { createProfileStorage, type AsyncKeyValueBackend } from './profiles'
import { createBackupV2Service } from './backup-v2'
import { createProfileStore, type ProfileCollection } from '../store/profile'

async function setup() {
  const values = new Map<string, string>()
  let failKey = ''
  const backend: AsyncKeyValueBackend = {
    async get(key) { return values.get(key) ?? null },
    async set(key, value) { if (failKey && key.includes(failKey)) throw new Error('write failed'); values.set(key, value) },
  }
  const records = new Map<string, AssetRecord>()
  let failAsset = false
  const assetStore: AssetStore = { async transaction(_mode, run) {
    const copy = new Map(records)
    const result = await run({ get: async id => copy.get(id), getAll: async () => [...copy.values()], put: async record => { copy.set(record.id, record) }, delete: async id => { copy.delete(id) } })
    if (failAsset) throw new Error('asset write failed')
    records.clear(); for (const [id, record] of copy) records.set(id, record)
    return result
  } }
  const assets = createAssetLibrary(assetStore)
  let publication = Promise.resolve()
  const publish = async <T>(task: () => Promise<T>): Promise<T> => { const r = publication.then(task); publication = r.then(() => {}, () => {}); return r }
  const profiles = createProfileStorage(backend, { lock: publish })
  const old = await migrateV1(defaults, { id: () => 'old', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
  const incoming = await migrateV1(defaults, { id: () => 'old', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
  const oldRef = await assets.add(new Blob(['old'], { type: 'image/png' }))
  old.custom.css = `url(${oldRef})`
  const id = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  incoming.custom.css = `url(mnt-asset:${id})`
  const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [incoming], assets: [{ id, blob: new Blob(['hello'], { type: 'image/png' }) }] })
  const initial = await profiles.write({ profiles: { activeProfileId: 'old', profiles: { old } }, history: { profiles: {} } }, null)
  return { profiles, assets, oldRef, json, initial, service: createBackupV2Service({ profiles, assets }), fail: (key: string) => { failKey = key }, failAsset: () => { failAsset = true } }
}

describe('backup storage service', () => {
  it.each(['bookmarks', 'appearance', 'layout', 'settings'] as const)('restores and undoes only %s from the backup active profile', async part => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const incoming = structuredClone(original)
    incoming.meta.id = 'active'
    incoming.bookmarks.groups[0].name = 'Incoming bookmarks'
    incoming.theme.mode = 'light'
    incoming.layout.gap = 33
    incoming.prefs.language = 'en'
    const json = await serializeBackupV2({ activeProfileId: 'active', profiles: [original, incoming], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }] })
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    await s.service.importPartial(json, 1, { bookmarks: false, appearance: false, layout: false, settings: false, savedThemes: false, [part]: true }, store)
    const restored = store.getState().profiles.old
    for (const [key, group] of Object.entries({ bookmarks: 'bookmarks', theme: 'appearance', background: 'appearance', custom: 'appearance', layout: 'layout', widgets: 'layout', prefs: 'settings', search: 'settings' }) as [keyof typeof original, string][]) {
      expect(restored[key]).toEqual(group === part ? incoming[key] : original[key])
    }
    expect(store.getState().activeProfileId).toBe('old')
    await store.getState().undo('old')
    const { meta: _meta, ...undone } = store.getState().profiles.old
    const { meta: _originalMeta, ...before } = original
    expect(undone).toEqual(before)
  })

  it('restores and undoes the complete collection and saved themes together', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const incoming = structuredClone(original)
    incoming.meta.id = 'new'
    const theme: SavedTheme = { id: 'new-theme', name: 'New', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(incoming) }
    const json = await serializeBackupV2({ activeProfileId: 'new', profiles: [incoming], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }], themes: [theme] })
    let themes: SavedTheme[] = []
    const library = { read: async () => structuredClone(themes), write: async (value: SavedTheme[]) => { themes = structuredClone(value) } }
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library })
    await service.importFullIntoStore(json, 1, store)
    expect(store.getState().activeProfileId).toBe('new')
    expect(store.getState().archived.old.profile).toEqual(original)
    expect(themes).toHaveLength(1)
    await store.getState().undo('new')
    expect(store.getState().activeProfileId).toBe('old')
    expect(store.getState().profiles.old).toEqual(original)
    expect(store.getState().archived).toEqual({})
    expect(themes).toEqual([])
  })

  it('restores and undoes only saved themes', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const theme: SavedTheme = { id: 'saved', name: 'Saved', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(original) }
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [original], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }], themes: [theme] })
    let themes: SavedTheme[] = []
    const library = { read: async () => structuredClone(themes), write: async (value: SavedTheme[]) => { themes = structuredClone(value) } }
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    await createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library }).importPartial(json, 1, { bookmarks: false, appearance: false, layout: false, savedThemes: true, settings: false }, store)
    expect(themes).toHaveLength(1)
    expect(store.getState().profiles.old.bookmarks).toEqual(original.bookmarks)
    await store.getState().undo('old')
    expect(themes).toEqual([])
    expect(store.getState().profiles.old.bookmarks).toEqual(original.bookmarks)
  })

  it('restores appearance without touching bookmarks and undoes saved themes with the profile', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const incoming = structuredClone(original)
    incoming.theme.mode = 'light'
    incoming.bookmarks.groups[0].name = 'Backup bookmarks'
    const theme: SavedTheme = { id: 'new', name: 'New', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(incoming) }
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [incoming], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }], themes: [theme] })
    let themes: SavedTheme[] = []
    const library = { read: async () => structuredClone(themes), write: async (value: SavedTheme[]) => { themes = structuredClone(value) } }
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library })
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    await service.importPartial(json, 1, { bookmarks: false, appearance: true, layout: false, savedThemes: true, settings: false }, store)
    expect(store.getState().profiles.old.theme.mode).toBe('light')
    expect(store.getState().profiles.old.bookmarks).toEqual(original.bookmarks)
    expect(themes.map(t => t.id)).toEqual(['new'])
    await store.getState().undo('old')
    expect(store.getState().profiles.old.theme).toEqual(original.theme)
    expect(themes).toEqual([])
  })

  it('rolls themes back if profile publication fails', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    let themes: SavedTheme[] = []
    const theme: SavedTheme = { id: 'new', name: 'New', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(original) }
    const library = { read: async () => structuredClone(themes), write: async (value: SavedTheme[]) => { themes = structuredClone(value) } }
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [original], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }], themes: [theme] })
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library })
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    s.fail('generation:')
    await expect(service.importPartial(json, 1, { bookmarks: false, appearance: true, layout: false, savedThemes: true, settings: false }, store)).rejects.toThrow('write failed')
    expect(themes).toEqual([])
    expect(await s.profiles.read()).toEqual(s.initial)
  })

  it('does not publish a profile when the theme write fails', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    const library = { read: async (): Promise<SavedTheme[]> => [], write: async () => { throw new Error('theme write failed') } }
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library })
    await expect(service.importPartial(s.json, 1, { bookmarks: false, appearance: true, layout: false, savedThemes: true, settings: false }, store)).rejects.toThrow()
    expect(await s.profiles.read()).toEqual(s.initial)
  })

  it('refuses to undo over a later saved theme library change', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const theme: SavedTheme = { id: 'later', name: 'Later', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(original) }
    let themes: SavedTheme[] = [theme]
    const library = { read: async () => structuredClone(themes), write: async (value: SavedTheme[]) => { themes = structuredClone(value) } }
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: library })
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    await service.importPartial(s.json, 1, { bookmarks: false, appearance: true, layout: false, savedThemes: true, settings: false }, store)
    const revision = store.getState().revision
    themes = [theme]
    await expect(store.getState().undo('old')).rejects.toThrow('Theme library changed')
    expect(themes).toEqual([theme])
    expect(store.getState().revision).toBe(revision)
  })

  it('validates unselected backup contents before partial restore', async () => {
    const s = await setup()
    const original = (s.initial.profiles as ProfileCollection).profiles.old
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: original })
    await store.getState().initialize()
    const invalid = JSON.parse(s.json)
    invalid.assets[0].base64 = '%%%%'
    await expect(s.service.importPartial(JSON.stringify(invalid), 1, { bookmarks: false, appearance: true, layout: false, savedThemes: false, settings: false }, store)).rejects.toThrow()
    expect(await s.profiles.read()).toEqual(s.initial)
  })
  it('imports a verified backup and exports the published collection', async () => {
    const s = await setup()
    const saved = await s.service.importBackup(s.json, 1)
    expect(saved.revision).toBe(2)
    expect((await s.profiles.read())?.profiles).toMatchObject({ activeProfileId: 'old', profiles: { old: {} } })
    expect((await s.profiles.read())?.history).toMatchObject({ profiles: { old: { snapshots: [{ kind: 'import' }] } } })
    expect(await s.assets.get(s.oldRef)).toBeDefined()
    expect((await parseBackupV2(await s.service.exportBackup())).activeProfileId).toBe('old')
  })

  it('exports and restores the local theme library with a full backup', async () => {
    const s = await setup()
    const profile = ((s.initial.profiles as ProfileCollection).profiles.old)
    const saved: SavedTheme[] = [{ id: 'saved-1', name: 'Saved palette', savedAt: '2026-01-01T00:00:00Z', pack: exportThemePack(profile) }]
    let themes = saved
    const service = createBackupV2Service({ profiles: s.profiles, assets: s.assets, themes: { read: async () => themes, write: async value => { themes = value } } })
    const backup = await service.exportBackup()
    expect((await parseBackupV2(backup)).themes.map(theme => theme.name)).toEqual(['Saved palette'])
    themes = []
    await service.importBackup(backup, 1)
    expect(themes.map(theme => theme.name)).toEqual(['Saved palette'])
  })

  it('imports and exports video assets larger than the image limit', async () => {
    const s = await setup()
    const videoBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'video/webm' })
    const digest = await crypto.subtle.digest('SHA-256', await videoBlob.arrayBuffer())
    const videoId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    const profile = (s.initial.profiles as ProfileCollection).profiles.old
    profile.background = { type: 'video', dim: 20, video: { asset: `mnt-asset:${videoId}`, poster: s.oldRef, blur: 0, grayscale: 0 } }
    expect((await import('../core/schema/profile')).profileIssues(profile)).toEqual([])
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [profile], assets: [
      { id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }, { id: videoId, blob: videoBlob },
    ] })
    await s.service.importBackup(json, 1)
    const exported = await parseBackupV2(await s.service.exportBackup())
    expect(exported.assets.find(asset => asset.id === videoId)?.blob.size).toBe(videoBlob.size)
  })

  it.each(['generation:', 'index'])('preserves old profiles and assets when %s fails', async key => {
    const s = await setup()
    s.fail(key)
    await expect(s.service.importBackup(s.json, 1)).rejects.toThrow('write failed')
    expect(await s.profiles.read()).toEqual(s.initial)
    expect(await s.assets.get(s.oldRef)).toBeDefined()
  })

  it('preserves the published collection if an asset write fails', async () => {
    const s = await setup()
    s.failAsset()
    await expect(s.service.importBackup(s.json, 1)).rejects.toThrow('asset write failed')
    expect(await s.profiles.read()).toEqual(s.initial)
  })

  it('preserves history and records a pre-import snapshot for retained profiles', async () => {
    const s = await setup()
    const previous = s.initial.profiles as { activeProfileId: string; profiles: Record<string, import('../core/schema/profile').ProfileV2> }
    const old = previous.profiles.old
    await s.profiles.write({ profiles: previous, history: { profiles: { old: { lastEditAt: null, snapshots: [{ id: 'earlier', createdAt: 1, kind: 'edit', pinned: true, profile: old }] } } } }, 1)
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [old], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }] })
    await s.service.importBackup(json, 2)
    const history = (await s.profiles.read())?.history as { profiles: Record<string, { snapshots: { id: string; kind: string; profile: unknown }[] }> }
    expect(history.profiles.old.snapshots.map(snapshot => snapshot.kind)).toEqual(['import', 'edit'])
    expect(history.profiles.old.snapshots[0].profile).toEqual(old)
    expect(history.profiles.old.snapshots[1].id).toBe('earlier')
  })

  it('archives profiles absent from the backup with their history and leaves them restorable', async () => {
    const s = await setup()
    const old = (s.initial.profiles as { profiles: Record<string, import('../core/schema/profile').ProfileV2> }).profiles.old
    await s.profiles.write({ profiles: s.initial.profiles, history: { profiles: { old: { lastEditAt: null, snapshots: [{ id: 'prior', createdAt: 1, kind: 'edit', pinned: true, profile: old }] } } } }, 1)
    const backup = await parseBackupV2(s.json)
    backup.profiles[0].meta.id = 'new'
    backup.activeProfileId = 'new'
    const analysis = await s.service.analyzeBackup(await serializeBackupV2(backup), 2)
    expect(analysis).toMatchObject({ format: 2, archived: ['old'], retained: [], restored: [] })
    expect((await s.profiles.read())?.revision).toBe(2)
    await s.service.importBackup(await serializeBackupV2(backup), 2)
    const saved = await s.profiles.read()
    const collection = saved?.profiles as ProfileCollection
    expect(Object.keys(collection.profiles)).toEqual(['new'])
    expect(collection.archived?.old.history.snapshots.map(x => x.id)).toContain('prior')
    expect(collection.archived?.old.history.snapshots[0].kind).toBe('import')
    expect(Object.keys((saved?.history as { profiles: object }).profiles)).not.toContain('old')
    const store = createProfileStore({ persistence: s.profiles as never, initialProfile: old })
    await store.getState().initialize()
    await store.getState().restoreArchivedProfile('old')
    expect(store.getState().activeProfileId).toBe('new')
    expect(store.getState().history.profiles.old.snapshots.map(x => x.id)).toContain('prior')
    expect(Object.keys(store.getState().archived)).toEqual([])
  })

  it('analyzes recovery imports without trying to read corrupt persisted profiles', async () => {
    const s = await setup()
    s.fail('index')
    await expect(s.service.analyzeBackup(s.json, null, true)).resolves.toMatchObject({ format: 2, incoming: [{ id: 'old' }], retained: [], archived: [] })
  })

  it('replaces only the active profile for a v1 backup, keeping its ID and other profiles', async () => {
    const s = await setup()
    const previous = s.initial.profiles as ProfileCollection
    const other = { ...structuredClone(previous.profiles.old), meta: { ...previous.profiles.old.meta, id: 'other' } }
    await s.profiles.write({ profiles: { activeProfileId: 'old', profiles: { ...previous.profiles, other } }, history: { profiles: {} } }, 1)
    const v1 = JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: '2026-01-01T00:00:00Z', settings: { ...defaults, searchTemplate: 'https://example.com/?q={query}' } })
    expect(await s.service.analyzeBackup(v1, 2)).toMatchObject({ format: 1, activeProfileId: 'old', archived: [], retained: ['old', 'other'] })
    await s.service.importBackup(v1, 2)
    const saved = await s.profiles.read()
    const collection = saved?.profiles as ProfileCollection
    expect(collection.activeProfileId).toBe('old')
    expect(collection.profiles.old.search.engines[0].template).toBe('https://example.com/?q={query}')
    expect(collection.profiles.old.meta.id).toBe('old')
    expect(collection.profiles.other).toEqual(other)
    expect((saved?.history as { profiles: Record<string, { snapshots: unknown[] }> }).profiles.old.snapshots).toHaveLength(1)
  })

  it('bounds unpinned pre-import snapshots with the history limit', async () => {
    const s = await setup()
    const old = (s.initial.profiles as ProfileCollection).profiles.old
    const snapshots = Array.from({ length: 35 }, (_, n) => ({ id: `s${n}`, createdAt: n, kind: 'edit' as const, pinned: n === 34, profile: old }))
    await s.profiles.write({ profiles: s.initial.profiles, history: { profiles: { old: { lastEditAt: null, snapshots } } } }, 1)
    const json = await serializeBackupV2({ activeProfileId: 'old', profiles: [old], assets: [{ id: s.oldRef.slice(10), blob: (await s.assets.get(s.oldRef))! }] })
    await s.service.importBackup(json, 2)
    const saved = (await s.profiles.read())?.history as { profiles: { old: { snapshots: { pinned: boolean }[] } } }
    expect(saved.profiles.old.snapshots.filter(x => !x.pinned)).toHaveLength(30)
    expect(saved.profiles.old.snapshots.filter(x => x.pinned)).toHaveLength(1)
  })

  it('rejects an asset library returning corrupted stored content before publication', async () => {
    const s = await setup()
    const service = createBackupV2Service({ profiles: s.profiles, assets: { add: s.assets.add, get: async () => new Blob(['corrupt'], { type: 'image/png' }) } })
    await expect(service.importBackup(s.json, 1)).rejects.toThrow(/hash mismatch/i)
    expect(await s.profiles.read()).toEqual(s.initial)
    expect(await s.assets.get(s.oldRef)).toBeDefined()
  })

  it('rejects an export when a referenced asset is missing', async () => {
    const s = await setup()
    const service = createBackupV2Service({ profiles: s.profiles, assets: { add: s.assets.add, get: async () => undefined } })
    await expect(service.exportBackup()).rejects.toThrow(/missing asset/i)
  })

  it('rejects invalid input and stale revisions without changing visible profiles', async () => {
    const s = await setup()
    await expect(s.service.importBackup('{', 1)).rejects.toThrow()
    await expect(s.service.importBackup(s.json, 0)).rejects.toThrow(/conflict/i)
    expect(await s.profiles.read()).toEqual(s.initial)
    expect(await s.assets.get(s.oldRef)).toBeDefined()
  })
})
