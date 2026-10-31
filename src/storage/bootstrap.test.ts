// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bootstrap } from './bootstrap'
import { createProfileStorage, type AsyncKeyValueBackend } from './profiles'
import { createAssetLibrary, type AssetRecord, type AssetStore } from './assets'
import { defaults } from '../core/model'
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
  const options = { backend, profiles, assets, readRawSettings: async () => raw, readWallpaper: async () => wallpaper, id: () => 'profile-id', now: () => '2026-01-01T00:00:00.000Z' }
  return { data, records, profiles, options, fail: (key: string) => { fail = key } }
}

describe('bootstrap', () => {
  it('backs up the exact raw settings before publishing a migrated profile and wallpaper', async () => {
    const raw: RawSettings = { backend: 'local', value: ' { "language": "en" } ' }
    const db = setup(raw)
    const snapshot = await bootstrap(db.options)
    expect(JSON.parse(db.data.get('backup:v1-original')!)).toEqual(raw)
    expect(snapshot.revision).toBe(1)
    expect(snapshot.profiles[0].prefs.language).toBe('en')
    expect(snapshot.profiles[0].background.image?.asset).toMatch(/^mnt-asset:/)
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
    expect((await bootstrap(db.options)).profiles[0].schemaVersion).toBe(2)
    expect(JSON.parse(db.data.get('backup:v1-original')!)).toEqual(raw)
  })
})
