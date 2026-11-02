// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ASSET_LIFECYCLE_LOCK, createAssetLibrary, type AssetLocks, type AssetRecord, type AssetStore } from './assets'
import { createProfileStorage, type AsyncKeyValueBackend, type ProfileLock } from './profiles'

/** Serialized copy-on-write transactions, like IndexedDB readwrite transactions on one store. */
function memoryStore() {
  let records = new Map<string, AssetRecord>()
  let fail = false
  let gate: Promise<void> | null = null
  let entered = () => {}
  let queue = Promise.resolve()
  const store: AssetStore = {
    transaction(mode, run) {
      const result = queue.then(async () => {
        const copy = new Map(records)
        const value = await run({
          get: async id => copy.get(id),
          getAll: async () => { if (gate && mode === 'readwrite') { entered(); await gate } return [...copy.values()] },
          put: async record => { copy.set(record.id, record) },
          delete: async id => { copy.delete(id) },
        })
        if (fail && mode === 'readwrite') throw new Error('commit failed')
        if (mode === 'readwrite') records = copy
        return value
      })
      queue = result.then(() => {}, () => {})
      return result
    },
  }
  return {
    store,
    records: () => records,
    fail: (value: boolean) => { fail = value },
    /** Pause the next collection inside its transaction; resolves once it is paused. */
    pause() {
      let release!: () => void
      gate = new Promise(resolve => { release = () => { gate = null; resolve() } })
      const paused = new Promise<void>(resolve => { entered = resolve })
      return { paused, release: () => release() }
    },
  }
}

/** Shared/exclusive locks with ifAvailable and FIFO queuing, matching the Web Locks API. */
function fakeLocks() {
  const held = new Map<string, ('shared' | 'exclusive')[]>()
  const waiting: { name: string; mode: 'shared' | 'exclusive'; start: () => void }[] = []
  const grantable = (name: string, mode: 'shared' | 'exclusive') => {
    const current = held.get(name) ?? []
    return mode === 'shared' ? current.every(m => m === 'shared') : current.length === 0
  }
  const pump = () => {
    while (waiting.length && grantable(waiting[0].name, waiting[0].mode)) waiting.shift()!.start()
  }
  const locks = {
    request(name: string, options: { mode?: 'shared' | 'exclusive'; ifAvailable?: boolean }, callback: (lock: unknown) => unknown) {
      const mode = options.mode ?? 'exclusive'
      const run = async () => {
        held.set(name, [...held.get(name) ?? [], mode])
        try { return await callback({ name, mode }) } finally {
          const list = held.get(name)!
          list.splice(list.indexOf(mode), 1)
          pump()
        }
      }
      const free = grantable(name, mode) && !waiting.some(w => w.name === name)
      if (free) return run()
      if (options.ifAvailable) return Promise.resolve().then(() => callback(null))
      return new Promise((resolve, reject) => waiting.push({ name, mode, start: () => { run().then(resolve, reject) } }))
    },
  } as unknown as AssetLocks
  return { locks, held: (name: string) => held.get(name) ?? [] }
}

function profileBackend() {
  const data = new Map<string, string>()
  const backend: AsyncKeyValueBackend = {
    async get(key) { return data.get(key) ?? null },
    async set(key, value) { data.set(key, value) },
    async remove(key) { data.delete(key) },
    async keys() { return [...data.keys()] },
  }
  return { data, backend }
}

const HOUR = 60 * 60 * 1000
const blob = (s: string) => new Blob([s], { type: 'image/png' })
const tick = () => new Promise(resolve => setTimeout(resolve, 5))

/** One shared origin: asset database, profile storage, Web Locks and a clock. Each tab gets its own library. */
function origin() {
  const db = memoryStore()
  const { data, backend } = profileBackend()
  const { locks, held } = fakeLocks()
  let time = 1_000_000
  const publication: ProfileLock = task => locks.request('profiles:v2:publication', {}, task) as ReturnType<typeof task>
  const tab = () => {
    const library = createAssetLibrary(db.store, { now: () => time })
    const profiles = createProfileStorage(backend, { lock: publication })
    return { library, profiles, open: () => library.openSession({ profiles, locks }) }
  }
  return { db, data, held, tab, advance: (ms: number) => { time += ms } }
}
const ids = (records: Map<string, AssetRecord>) => [...records.keys()].map(id => `mnt-asset:${id}`).sort()

describe('asset library', () => {
  it('uses SHA-256 references and deduplicates identical content', async () => {
    const db = memoryStore()
    const library = createAssetLibrary(db.store)
    const ref = await library.add(blob('abc'))
    expect(ref).toBe('mnt-asset:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await library.add(blob('abc'))).toBe(ref)
    expect((await library.list())).toHaveLength(1)
    expect(await (await library.get(ref))?.text()).toBe('abc')
  })

  it('rejects oversized assets before writing and accepts an explicit per-asset limit', async () => {
    const library = createAssetLibrary(memoryStore().store, { maxBytes: 2 })
    await expect(library.add(blob('abc'))).rejects.toThrow(/size/i)
    expect(await library.add(blob('abc'), 3)).toMatch(/^mnt-asset:/)
    await expect(library.add(blob('abcd'), 3)).rejects.toThrow(/size/i)
    expect(await library.list()).toHaveLength(1)
  })

  it('rejects malformed references', async () => {
    const library = createAssetLibrary(memoryStore().store)
    await expect(library.get('mnt-asset:bad')).rejects.toThrow(/reference/i)
  })

  it('requires Web Locks to open a session', async () => {
    const o = origin()
    const { library, profiles } = o.tab()
    await expect(library.openSession({ profiles })).rejects.toThrow(/Web Locks/)
  })
})

describe('asset collection', () => {
  it('keeps assets referenced by current profiles and history, deleting only aged orphans', async () => {
    const o = origin()
    const a = o.tab()
    const profile = await a.library.add(blob('profile'))
    const history = await a.library.add(blob('history'))
    const orphan = await a.library.add(blob('orphan'))
    await a.profiles.write({ profiles: { a: { image: profile, css: `url(${profile})` } }, history: { a: [{ image: history }] } }, null)
    o.advance(25 * HOUR)
    const fresh = await a.library.add(blob('fresh'))
    const session = await a.open()
    expect(session.collection).toMatchObject({ status: 'collected', deleted: [orphan.slice(10)], missing: [] })
    expect(ids(o.db.records())).toEqual([profile, history, fresh].sort())
    expect(o.db.records().get(profile.slice(10))!.refCount).toBe(2)
    expect(o.db.records().get(fresh.slice(10))!.refCount).toBe(0)
  })

  it('does not collect while another tab holds a session, protecting its live and staged state', async () => {
    const o = origin()
    const a = o.tab(), b = o.tab()
    await a.profiles.write({ profiles: {}, history: {} }, null)
    const sessionA = await a.open()
    // Tab A stages an asset and keeps it unpublished well past the grace period.
    const staged = await a.library.add(blob('staged'))
    o.advance(48 * HOUR)
    const sessionB = await b.open()
    expect(sessionB.collection).toEqual({ status: 'skipped', reason: 'busy' })
    expect(ids(o.db.records())).toEqual([staged])
    await a.profiles.write({ profiles: { a: staged }, history: {} }, 1)
    sessionA.close(); sessionB.close()
    await tick()
    const c = await o.tab().open()
    expect(c.collection).toMatchObject({ status: 'collected', deleted: [] })
    expect(ids(o.db.records())).toEqual([staged])
  })

  it('makes new tabs wait while a collection runs, so their adds are not swept', async () => {
    const o = origin()
    const a = o.tab(), b = o.tab()
    const orphan = await a.library.add(blob('orphan'))
    await a.profiles.write({ profiles: {}, history: {} }, null)
    o.advance(25 * HOUR)
    const pause = o.db.pause()
    const opening = a.open()
    await pause.paused
    let bOpen = false
    const openingB = b.open().then(session => { bOpen = true; return session })
    await tick()
    expect(bOpen).toBe(false)
    expect(o.held(ASSET_LIFECYCLE_LOCK)).toEqual(['exclusive'])
    pause.release()
    const sessionA = await opening
    const sessionB = await openingB
    expect(sessionA.collection).toMatchObject({ status: 'collected', deleted: [orphan.slice(10)] })
    expect(sessionB.collection).toEqual({ status: 'skipped', reason: 'busy' })
    // The re-added asset survives even though the earlier copy was just collected.
    expect(await b.library.add(blob('orphan'))).toBe(orphan)
    expect(ids(o.db.records())).toEqual([orphan])
  })

  it('holds publication until the sweep commits, so a racing publish cannot lose its asset', async () => {
    const o = origin()
    const a = o.tab()
    const writer = o.tab()
    const orphan = await writer.library.add(blob('orphan'))
    await a.profiles.write({ profiles: {}, history: {} }, null)
    o.advance(25 * HOUR)
    // A context outside the lifecycle stages an asset, then publishes it while the sweep runs.
    const asset = await writer.library.add(blob('racing'))
    const pause = o.db.pause()
    const opening = a.open()
    await pause.paused
    let published = false
    const publishing = writer.profiles.write({ profiles: { a: asset }, history: {} }, 1).then(() => { published = true })
    await tick()
    expect(published).toBe(false)
    pause.release()
    expect((await opening).collection).toMatchObject({ status: 'collected', deleted: [orphan.slice(10)] })
    await publishing
    expect(await (await writer.library.get(asset))?.text()).toBe('racing')
  })

  it('protects recent adds made outside any session, and re-adding restarts the grace period', async () => {
    const o = origin()
    const a = o.tab()
    await a.profiles.write({ profiles: {}, history: {} }, null)
    const staged = await a.library.add(blob('staged'))
    o.advance(23 * HOUR)
    const first = await a.open()
    expect(first.collection).toMatchObject({ status: 'collected', deleted: [] })
    first.close(); await tick()
    await a.library.add(blob('staged'))
    o.advance(23 * HOUR)
    const second = await a.open()
    expect(second.collection).toMatchObject({ status: 'collected', deleted: [] })
    second.close(); await tick()
    o.advance(2 * HOUR)
    const third = await a.open()
    expect(third.collection).toMatchObject({ status: 'collected', deleted: [staged.slice(10)] })
  })

  it('starts a grace period for legacy records instead of deleting them', async () => {
    const o = origin()
    const a = o.tab()
    const legacy = await a.library.add(blob('legacy'))
    const record = o.db.records().get(legacy.slice(10))!
    delete record.addedAt
    await a.profiles.write({ profiles: {}, history: {} }, null)
    const first = await a.open()
    expect(first.collection).toMatchObject({ status: 'collected', deleted: [] })
    expect(o.db.records().get(legacy.slice(10))!.addedAt).toBe(1_000_000)
    first.close(); await tick()
    o.advance(25 * HOUR)
    expect((await a.open()).collection).toMatchObject({ status: 'collected', deleted: [legacy.slice(10)] })
  })

  it('counts references in leftover generations and prunes them before sweeping', async () => {
    const o = origin()
    const a = o.tab()
    const old = await a.library.add(blob('old'))
    await a.profiles.write({ profiles: {}, history: {} }, null)
    o.data.set('profiles:v2:generation:crashed', JSON.stringify({ revision: 2, profiles: { a: old }, history: {} }))
    o.advance(25 * HOUR)
    const session = await a.open()
    expect(session.collection).toMatchObject({ status: 'collected', prunedGenerations: 1, deleted: [old.slice(10)] })
    expect(o.data.has('profiles:v2:generation:crashed')).toBe(false)
  })

  it('skips collection before anything is published', async () => {
    const o = origin()
    const a = o.tab()
    const staged = await a.library.add(blob('migration'))
    o.advance(25 * HOUR)
    expect((await a.open()).collection).toEqual({ status: 'skipped', reason: 'uncommitted' })
    expect(ids(o.db.records())).toEqual([staged])
  })

  it('reports missing referenced assets without blocking other collection', async () => {
    const o = origin()
    const a = o.tab()
    const orphan = await a.library.add(blob('orphan'))
    await a.profiles.write({ profiles: { a: `mnt-asset:${'a'.repeat(64)}` }, history: {} }, null)
    o.advance(25 * HOUR)
    expect((await a.open()).collection).toMatchObject({ status: 'collected', deleted: [orphan.slice(10)], missing: ['a'.repeat(64)] })
  })

  it('leaves data unchanged and still opens the session when collection fails', async () => {
    const o = origin()
    const a = o.tab()
    const orphan = await a.library.add(blob('orphan'))
    await a.profiles.write({ profiles: {}, history: {} }, null)
    o.advance(25 * HOUR)
    o.db.fail(true)
    const session = await a.open()
    expect(session.collection).toMatchObject({ status: 'failed' })
    expect(ids(o.db.records())).toEqual([orphan])
    expect(o.held(ASSET_LIFECYCLE_LOCK)).toEqual(['shared'])
    session.close()
  })

  it('aborts collection when the profile index is unreadable', async () => {
    const o = origin()
    const a = o.tab()
    const orphan = await a.library.add(blob('orphan'))
    o.data.set('profiles:v2:index', '{bad')
    o.advance(25 * HOUR)
    const session = await a.open()
    expect(session.collection).toMatchObject({ status: 'failed' })
    expect(ids(o.db.records())).toEqual([orphan])
  })

  it('releases the shared lifecycle lock on close', async () => {
    const o = origin()
    const session = await o.tab().open()
    expect(o.held(ASSET_LIFECYCLE_LOCK)).toEqual(['shared'])
    session.close()
    await tick()
    expect(o.held(ASSET_LIFECYCLE_LOCK)).toEqual([])
  })
})
