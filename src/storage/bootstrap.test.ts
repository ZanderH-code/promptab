// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bootstrap } from './bootstrap'
import { createProfileStorage, type AsyncKeyValueBackend } from './profiles'
import { createAssetLibrary, type AssetRecord, type AssetStore } from './assets'
import { defaults } from '../core/model'
import { createProfileStore } from '../store/profile'
import type { RawSettings } from './settings'

function setup(raw: RawSettings = { backend: 'local', value: JSON.stringify(defaults) }) {
  const data = new Map<string, string>()
  let fail = ''
  const backend: AsyncKeyValueBackend = {
    async get(key) { return data.get(key) ?? null },
    async set(key, value) { if (fail && key.includes(fail)) throw new Error('write failed'); data.set(key, value) },
  }
  const records = new Map<string, AssetRecord>()
  const store: AssetStore = { async transaction(_mode, run) { return run({ get: async id => records.get(id), getAll: async () => [...records.values()], put: async record => { records.set(record.id, record) }, delete: async id => { records.delete(id) } }) } }
  const profiles = createProfileStorage(backend)
  const assets = createAssetLibrary(store)
  const wallpaper = new Blob(['wallpaper'], { type: 'image/png' })
  let queue = Promise.resolve()
  const lock = async <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task)
    queue = result.then(() => {}, () => {})
    return result
  }
  const options = { backend, profiles, assets, lock, readRawSettings: async () => raw, readWallpaper: async () => wallpaper, id: () => 'profile-id', now: () => '2026-01-01T00:00:00.000Z' }
  return { data, records, profiles, options, fail: (key: string) => { fail = key } }
}

describe('bootstrap', () => {
  it('backs up the exact raw settings before publishing a migrated profile and wallpaper', async () => {
    const raw: RawSettings = { backend: 'local', value: ' { "language": "en" } ' }
    const db = setup(raw)
    const snapshot = await bootstrap(db.options)
    expect(JSON.parse(db.data.get('backup:v1-original')!)).toEqual(raw)
    expect(snapshot.revision).toBe(1)
    expect(snapshot.profiles.activeProfileId).toBe('profile-id')
    expect(snapshot.profiles.profiles['profile-id'].prefs.language).toBe('en')
    expect(snapshot.profiles.profiles['profile-id'].background.image?.asset).toMatch(/^mnt-asset:/)
    const store = createProfileStore({ persistence: db.profiles, initialProfile: snapshot.profiles.profiles['profile-id'] })
    await store.getState().initialize()
    expect(store.getState().activeProfileId).toBe('profile-id')
    expect(store.getState().profiles['profile-id']).toEqual(snapshot.profiles.profiles['profile-id'])
    expect(store.getState().revision).toBe(1)
    expect(db.records.size).toBe(1)
    expect(snapshot.history).toEqual({ profiles: {} })
    expect(await db.profiles.read()).toEqual(snapshot)
  })

  it.each(['backup:v1-original', 'generation:', 'index'])('retries safely after %s fails', async key => {
    const db = setup()
    db.fail(key)
    await expect(bootstrap(db.options)).rejects.toThrow('write failed')
    expect(await db.profiles.read()).toBeNull()
    db.fail('')
    const snapshot = await bootstrap(db.options)
    expect((await bootstrap(db.options))).toEqual(snapshot)
    expect(db.records.size).toBe(1)
  })

  it('retries after wallpaper and asset boundary failures without publishing', async () => {
    const db = setup()
    await expect(bootstrap({ ...db.options, readWallpaper: async () => { throw new Error('wallpaper failed') } })).rejects.toThrow('wallpaper failed')
    await expect(bootstrap({ ...db.options, assets: { add: async () => { throw new Error('asset failed') } } })).rejects.toThrow('asset failed')
    expect(await db.profiles.read()).toBeNull()
    expect((await bootstrap(db.options)).revision).toBe(1)
  })

  it('serializes concurrent bootstrap calls using the shared lock', async () => {
    const db = setup()
    let reads = 0
    const options = { ...db.options, readRawSettings: async () => { reads++; await Promise.resolve(); return { backend: 'local' as const, value: JSON.stringify(defaults) } } }
    const [first, second] = await Promise.all([bootstrap(options), bootstrap(options)])
    expect(first).toEqual(second)
    expect(reads).toBe(1)
    expect(first.revision).toBe(1)
  })

  it('rejects without a cross-context lock before reading or writing', async () => {
    const db = setup()
    await expect(bootstrap({ ...db.options, lock: undefined })).rejects.toThrow(/lock/i)
    expect(db.data.size).toBe(0)
  })

  it('does not replace an existing backup', async () => {
    const db = setup()
    db.data.set('backup:v1-original', 'original backup')
    await bootstrap(db.options)
    expect(db.data.get('backup:v1-original')).toBe('original backup')
  })

  it.each(['{', 'null', '[]', '{"schemaVersion":3}', '{"columns":1}'])('rejects invalid legacy data %s without publishing', async value => {
    const db = setup({ backend: 'local', value })
    await expect(bootstrap(db.options)).rejects.toThrow()
    expect(await db.profiles.read()).toBeNull()
    expect(db.records.size).toBe(0)
  })

  it('validates existing v2 data without reading or writing legacy settings', async () => {
    const db = setup()
    const first = await bootstrap(db.options)
    const again = await bootstrap({ ...db.options, readRawSettings: async () => { throw new Error('unexpected legacy read') } })
    expect(again).toEqual(first)
    const broken = setup()
    await broken.profiles.write({ profiles: [{ schemaVersion: 3 }], history: { profiles: {} } }, null)
    await expect(bootstrap(broken.options)).rejects.toThrow()
    expect((await broken.profiles.read())?.revision).toBe(1)
  })

  it('uses defaults for absent settings and preserves the absent marker', async () => {
    const raw: RawSettings = { backend: 'chrome', present: false }
    const db = setup(raw)
    expect((await bootstrap(db.options)).profiles.profiles['profile-id'].schemaVersion).toBe(2)
    expect(JSON.parse(db.data.get('backup:v1-original')!)).toEqual(raw)
  })
})
