// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createProfileStorage, createLocalStorageBackend, createChromeStorageBackend, type AsyncKeyValueBackend, type ProfileLock } from './profiles'

function memory() {
  const data = new Map<string, string>()
  let failKey = ''
  let failRemove = false
  let beforeGet: (key: string) => Promise<void> = async () => {}
  const backend: AsyncKeyValueBackend = {
    async get(key) { await beforeGet(key); return data.get(key) ?? null },
    async set(key, value) { if (key.includes(failKey) && failKey) throw new Error('write failed'); data.set(key, value) },
    async remove(key) { if (failRemove) throw new Error('remove failed'); data.delete(key) },
    async keys() { return [...data.keys()] },
  }
  const generations = () => [...data.keys()].filter(key => key.startsWith('profiles:v2:generation:'))
  return { data, backend, generations, fail: (key: string) => { failKey = key }, failRemove: (value: boolean) => { failRemove = value }, beforeGet: (hook: typeof beforeGet) => { beforeGet = hook } }
}
function queueLock(): ProfileLock {
  let queue = Promise.resolve()
  return async <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task)
    queue = result.then(() => {}, () => {})
    return result
  }
}
const first = { profiles: [{ name: 'one' }], history: [{ action: 'created' }] }
const second = { profiles: [{ name: 'two' }], history: [] }

describe('profile persistence', () => {
  it('bootstraps empty and publishes profiles and history together', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    expect(await store.read()).toBeNull()
    const published = await store.write(first, null)
    expect(published.revision).toBe(1)
    expect(await store.read()).toEqual({ revision: 1, ...first })
    await store.write(second, published.revision)
    expect(await store.read()).toEqual({ revision: 2, ...second })
  })

  it('refuses to publish or collect without a cross-context lock', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend)
    await expect(store.write(first, null)).rejects.toThrow(/lock/i)
    await expect(store.collectGenerations(async () => 'ran')).rejects.toThrow(/lock/i)
    expect(db.data.size).toBe(0)
  })

  it.each(['generation:', 'index'])('preserves the published generation when %s write fails', async key => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    await store.write(first, null)
    db.fail(key)
    await expect(store.write(second, 1)).rejects.toThrow('write failed')
    expect(await store.read()).toEqual({ revision: 1, ...first })
  })

  it('prunes the superseded generation after publishing', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    await store.write(first, null)
    await store.write(second, 1)
    await store.write(first, 2)
    expect(db.generations()).toHaveLength(1)
    expect(await store.read()).toEqual({ revision: 3, ...first })
  })

  it('keeps a staged generation whose index write failed, since the outcome is unknown', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    await store.write(first, null)
    db.fail('index')
    await expect(store.write(second, 1)).rejects.toThrow('write failed')
    expect(db.generations()).toHaveLength(2)
  })

  it('discards its staged generation when another writer published first', async () => {
    const db = memory()
    const lock = queueLock()
    const store = createProfileStorage(db.backend, { lock })
    await store.write(first, null)
    // Simulate a writer that bypassed the lock, publishing after this one staged.
    const rogue = createProfileStorage(db.backend, { lock: task => task() })
    db.beforeGet(async key => { if (key === 'profiles:v2:index' && db.generations().length === 2) { db.beforeGet(async () => {}); await rogue.write(second, 1) } })
    await expect(store.write(first, 1)).rejects.toThrow(/conflict/i)
    expect(await store.read()).toEqual({ revision: 2, ...second })
    expect(db.generations()).toHaveLength(1)
  })

  it('re-reads the index when its generation is pruned mid-read', async () => {
    const db = memory()
    const writer = createProfileStorage(db.backend, { lock: queueLock() })
    const reader = createProfileStorage(db.backend)
    await writer.write(first, null)
    let raced = false
    db.beforeGet(async key => {
      if (!raced && key.startsWith('profiles:v2:generation:')) { raced = true; await writer.write(second, 1) }
    })
    expect(await reader.read()).toEqual({ revision: 2, ...second })
    expect(raced).toBe(true)
  })

  it('rejects malformed index and missing generation without overwriting them', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    db.data.set('profiles:v2:index', '{bad')
    await expect(store.read()).rejects.toThrow(/index/i)
    await expect(store.write(first, null)).rejects.toThrow(/index/i)
    await expect(store.collectGenerations(async () => 'ran')).rejects.toThrow(/index/i)
    db.data.set('profiles:v2:index', JSON.stringify({ revision: 1, generation: 'missing' }))
    db.data.set('profiles:v2:generation:leftover', '{}')
    await expect(store.read()).rejects.toThrow(/generation/i)
    await expect(store.write(first, 1)).rejects.toThrow(/generation/i)
    await expect(store.collectGenerations(async () => 'ran')).rejects.toThrow(/generation/i)
    expect(db.data.has('profiles:v2:generation:leftover')).toBe(true)
  })

  it('rejects stale revisions', async () => {
    const store = createProfileStorage(memory().backend, { lock: queueLock() })
    await store.write(first, null)
    await expect(store.write(second, null)).rejects.toThrow(/conflict/i)
    expect(await store.read()).toEqual({ revision: 1, ...first })
  })

  it('serializes competing writers through an injected lock', async () => {
    const db = memory()
    const lock = queueLock()
    const a = createProfileStorage(db.backend, { lock })
    const b = createProfileStorage(db.backend, { lock })
    const outcomes = await Promise.allSettled([a.write(first, null), b.write(second, null)])
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1)
    expect(db.generations()).toHaveLength(1)
  })

  it('collects leftover generations and blocks publication until collection settles', async () => {
    const db = memory()
    const lock = queueLock()
    const store = createProfileStorage(db.backend, { lock })
    await store.write(first, null)
    db.data.set('profiles:v2:generation:old', JSON.stringify({ revision: 0, profiles: 'mnt-asset:old', history: {} }))
    let release!: () => void
    const collecting = store.collectGenerations(async collection => {
      await new Promise<void>(resolve => { release = resolve })
      return collection
    })
    let published = false
    const writing = store.write(second, 1).then(() => { published = true })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(published).toBe(false)
    release()
    const collection = await collecting
    await writing
    expect(collection.current).toEqual({ revision: 1, ...first })
    expect(collection.pruned).toEqual(['profiles:v2:generation:old'])
    expect(collection.roots).toEqual([{ revision: 1, ...first }])
    expect(published).toBe(true)
  })

  it('counts generations it cannot prune as roots', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    await store.write(first, null)
    const leftover = JSON.stringify({ image: `mnt-asset:${'a'.repeat(64)}` })
    db.data.set('profiles:v2:generation:old', leftover)
    db.failRemove(true)
    const collection = await store.collectGenerations(async value => value)
    expect(collection.pruned).toEqual([])
    expect(collection.roots).toEqual([{ revision: 1, ...first }, leftover])
  })

  it('reports no current generation before the first publication', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend, { lock: queueLock() })
    db.data.set('profiles:v2:generation:staged', '{}')
    const collection = await store.collectGenerations(async value => value)
    expect(collection.current).toBeNull()
    expect(collection.pruned).toEqual(['profiles:v2:generation:staged'])
  })

  it('adapts localStorage and chrome.storage.local', async () => {
    const map = new Map<string, string>()
    const local = createLocalStorageBackend({
      getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: key => { map.delete(key) },
      key: index => [...map.keys()][index] ?? null, get length() { return map.size },
    })
    await local.set('key', 'value')
    await local.set('other', 'value')
    expect(await local.get('key')).toBe('value')
    expect(await local.keys!()).toEqual(['key', 'other'])
    await local.remove!('key')
    expect(await local.get('key')).toBeNull()
    expect(createLocalStorageBackend({ getItem: () => null, setItem: () => {} }).remove).toBeUndefined()

    const values: Record<string, unknown> = {}
    const chrome = createChromeStorageBackend({
      get: async (key: string | null) => key === null ? { ...values } : { [key]: values[key] },
      set: async items => { Object.assign(values, items) },
      remove: async key => { delete values[key] },
    })
    await chrome.set('key', 'value')
    expect(await chrome.get('key')).toBe('value')
    expect(await chrome.get('missing')).toBeNull()
    expect(await chrome.keys!()).toEqual(['key'])
    await chrome.remove!('key')
    expect(await chrome.get('key')).toBeNull()
    const withGetKeys = createChromeStorageBackend({ get: async () => { throw new Error('unexpected') }, set: async () => {}, remove: async () => {}, getKeys: async () => ['a'] })
    expect(await withGetKeys.keys!()).toEqual(['a'])
  })
})
