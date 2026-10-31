/** Values are stored as strings; each set must replace one key atomically. */
export interface AsyncKeyValueBackend {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  /** Needed to prune superseded generations; without it they are retained. */
  remove?(key: string): Promise<void>
  /** Needed to find generations left behind by crashes or earlier versions. */
  keys?(): Promise<string[]>
}

export interface ProfileData {
  profiles: unknown
  history: unknown
}
export type ProfileSnapshot = ProfileData & { revision: number }
export type ProfileLock = <T>(task: () => Promise<T>) => Promise<T>
/** Everything that may still reference assets, gathered while publication is locked. */
export type GenerationCollection = {
  /** The published generation, or null when nothing has been published yet. */
  current: ProfileSnapshot | null
  /** The current snapshot plus the raw text of every stored generation that could not be pruned. */
  roots: unknown[]
  /** Storage keys of superseded generations removed by this collection. */
  pruned: string[]
}

const INDEX = 'profiles:v2:index'
const GENERATION = 'profiles:v2:generation:'
const LOCK = 'profiles:v2:publication'
const READ_ATTEMPTS = 5

type Index = { revision: number; generation: string }

export function createLocalStorageBackend(storage: Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem' | 'key' | 'length'>>): AsyncKeyValueBackend {
  const backend: AsyncKeyValueBackend = {
    async get(key) { return storage.getItem(key) },
    async set(key, value) { storage.setItem(key, value) },
  }
  if (typeof storage.removeItem === 'function') backend.remove = async key => { storage.removeItem!(key) }
  if (typeof storage.key === 'function' && typeof storage.length === 'number') {
    backend.keys = async () => {
      const keys: string[] = []
      for (let i = 0; i < storage.length!; i++) {
        const key = storage.key!(i)
        if (key !== null) keys.push(key)
      }
      return keys
    }
  }
  return backend
}

export function createChromeStorageBackend(storage: {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, string>): Promise<void>
  remove?(key: string): Promise<void>
  getKeys?(): Promise<string[]>
}): AsyncKeyValueBackend {
  const backend: AsyncKeyValueBackend = {
    async get(key) {
      const value = (await storage.get(key))[key]
      if (value === undefined) return null
      if (typeof value !== 'string') throw new Error(`Invalid storage value for ${key}`)
      return value
    },
    async set(key, value) { await storage.set({ [key]: value }) },
  }
  if (typeof storage.remove === 'function') {
    backend.remove = async key => { await storage.remove!(key) }
    // chrome.storage.local.get(null) returns every item; getKeys avoids reading values where supported.
    backend.keys = async () => typeof storage.getKeys === 'function'
      ? storage.getKeys()
      : Object.keys(await (storage.get as unknown as (keys: null) => Promise<Record<string, unknown>>).call(storage, null))
  }
  return backend
}

function parseIndex(raw: string | null): Index | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) throw new Error()
    const index = value as Index
    if (!Number.isSafeInteger(index.revision) || index.revision < 1 || typeof index.generation !== 'string' || !index.generation) throw new Error()
    return index
  } catch { throw new Error('Malformed profile index') }
}

function parseGeneration(raw: string | null, index: Index): ProfileSnapshot {
  if (raw === null) throw new Error('Missing profile generation')
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error()
    const snapshot = value as ProfileSnapshot
    if (snapshot.revision !== index.revision || !Object.hasOwn(snapshot, 'profiles') || !Object.hasOwn(snapshot, 'history')) throw new Error()
    return snapshot
  } catch { throw new Error('Malformed profile generation') }
}

/**
 * Publication is atomic when backend.set atomically replaces a single key.
 * Writes and collection require Web Locks or a shared injected lock; there is no unlocked fallback.
 * Reads take no lock: a reader that loses a race with pruning re-reads the index.
 * A staged generation is kept when the index write fails, because the write may still have landed.
 */
export function createProfileStorage(backend: AsyncKeyValueBackend, options: { lock?: ProfileLock } = {}) {
  const browserLock: ProfileLock | undefined = typeof navigator !== 'undefined' && navigator.locks
    ? async task => await navigator.locks.request(LOCK, task)
    : undefined
  const lock = options.lock ?? browserLock
  const locked = <T>(task: () => Promise<T>) => {
    if (!lock) return Promise.reject(new Error('Profile storage requires a cross-context lock'))
    return lock(task)
  }

  async function discard(key: string): Promise<boolean> {
    if (!backend.remove) return false
    try { await backend.remove(key); return true } catch { return false }
  }

  async function readCurrent(): Promise<{ index: Index; snapshot: ProfileSnapshot } | null> {
    let index = parseIndex(await backend.get(INDEX))
    for (let attempt = 1; index !== null; attempt++) {
      const raw = await backend.get(GENERATION + index.generation)
      if (raw !== null) return { index, snapshot: parseGeneration(raw, index) }
      // A publication may have replaced and pruned this generation since the index was read.
      const latest = parseIndex(await backend.get(INDEX))
      if (attempt >= READ_ATTEMPTS || latest === null || latest.generation === index.generation) return { index, snapshot: parseGeneration(raw, index) }
      index = latest
    }
    return null
  }

  async function publish(data: ProfileData, expectedRevision: number | null): Promise<ProfileSnapshot> {
    const found = await readCurrent()
    const current = found?.snapshot ?? null
    if ((current?.revision ?? null) !== expectedRevision) throw new Error('Profile revision conflict')
    const revision = (current?.revision ?? 0) + 1
    if (!Number.isSafeInteger(revision)) throw new Error('Profile revision overflow')
    const snapshot: ProfileSnapshot = { revision, profiles: data.profiles, history: data.history }
    const serialized = JSON.stringify(snapshot)
    // Validate the serialized form before staging, including omitted undefined values.
    parseGeneration(serialized, { revision, generation: 'pending' })
    const id = crypto.randomUUID()
    await backend.set(GENERATION + id, serialized)
    const latest = parseIndex(await backend.get(INDEX))
    if ((latest?.revision ?? null) !== expectedRevision || (found !== null && latest?.generation !== found.index.generation)) {
      await discard(GENERATION + id)
      throw new Error('Profile revision conflict')
    }
    await backend.set(INDEX, JSON.stringify({ revision, generation: id }))
    if (found) await discard(GENERATION + found.index.generation)
    return parseGeneration(serialized, { revision, generation: id })
  }

  /**
   * Prune every generation except the published one, then run `use` while still holding the
   * publication lock so no generation can be published until it settles. Aborts without pruning
   * when the index or published generation is unreadable.
   */
  async function collectGenerations<T>(use: (collection: GenerationCollection) => Promise<T>): Promise<T> {
    return locked(async () => {
      const found = await readCurrent()
      const keep = found ? GENERATION + found.index.generation : null
      const roots: unknown[] = found ? [found.snapshot] : []
      const pruned: string[] = []
      for (const key of backend.keys ? await backend.keys() : []) {
        if (!key.startsWith(GENERATION) || key === keep) continue
        if (await discard(key)) pruned.push(key)
        else roots.push(await backend.get(key))
      }
      return use({ current: found?.snapshot ?? null, roots, pruned })
    })
  }

  return {
    async read() { return (await readCurrent())?.snapshot ?? null },
    write(data: ProfileData, expectedRevision: number | null) {
      return locked(() => publish(data, expectedRevision))
    },
    collectGenerations,
  }
}
