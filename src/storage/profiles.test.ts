// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createProfileStorage, createLocalStorageBackend, createChromeStorageBackend, type AsyncKeyValueBackend } from './profiles'

function memory() {
  const data = new Map<string, string>()
  let failKey = ''
  const backend: AsyncKeyValueBackend = {
    async get(key) { return data.get(key) ?? null },
    async set(key, value) { if (key.includes(failKey) && failKey) throw new Error('write failed'); data.set(key, value) },
  }
  return { data, backend, fail: (key: string) => { failKey = key } }
}
const first = { profiles: [{ name: 'one' }], history: [{ action: 'created' }] }
const second = { profiles: [{ name: 'two' }], history: [] }

describe('profile persistence', () => {
  it('bootstraps empty and publishes profiles and history together', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend)
    expect(await store.read()).toBeNull()
    const published = await store.write(first, null)
    expect(published.revision).toBe(1)
    expect(await store.read()).toEqual({ revision: 1, ...first })
    await store.write(second, published.revision)
    expect(await store.read()).toEqual({ revision: 2, ...second })
  })

  it.each(['generation:', 'index'])('preserves the published generation when %s write fails', async key => {
    const db = memory()
    const store = createProfileStorage(db.backend)
    await store.write(first, null)
    db.fail(key)
    await expect(store.write(second, 1)).rejects.toThrow('write failed')
    expect(await store.read()).toEqual({ revision: 1, ...first })
  })

  it('rejects malformed index and missing generation without overwriting them', async () => {
    const db = memory()
    const store = createProfileStorage(db.backend)
    db.data.set('profiles:v2:index', '{bad')
    await expect(store.read()).rejects.toThrow(/index/i)
    await expect(store.write(first, null)).rejects.toThrow(/index/i)
    db.data.set('profiles:v2:index', JSON.stringify({ revision: 1, generation: 'missing' }))
    await expect(store.read()).rejects.toThrow(/generation/i)
    await expect(store.write(first, 1)).rejects.toThrow(/generation/i)
  })

  it('rejects stale revisions', async () => {
    const store = createProfileStorage(memory().backend)
    await store.write(first, null)
    await expect(store.write(second, null)).rejects.toThrow(/conflict/i)
    expect(await store.read()).toEqual({ revision: 1, ...first })
  })

  it('serializes competing writers through an injected lock', async () => {
    const db = memory()
    let queue = Promise.resolve()
    const lock = async <T>(task: () => Promise<T>): Promise<T> => {
      const result = queue.then(task)
      queue = result.then(() => {}, () => {})
      return result
    }
    const a = createProfileStorage(db.backend, { lock })
    const b = createProfileStorage(db.backend, { lock })
    const outcomes = await Promise.allSettled([a.write(first, null), b.write(second, null)])
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1)
  })

  it('adapts localStorage and chrome.storage.local', async () => {
    const map = new Map<string, string>()
    const local = createLocalStorageBackend({ getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) } })
    await local.set('key', 'value')
    expect(await local.get('key')).toBe('value')
    const values: Record<string, unknown> = {}
    const chrome = createChromeStorageBackend({ get: async key => ({ [key]: values[key] }), set: async items => { Object.assign(values, items) } })
    await chrome.set('key', 'value')
    expect(await chrome.get('key')).toBe('value')
    expect(await chrome.get('missing')).toBeNull()
  })
})
