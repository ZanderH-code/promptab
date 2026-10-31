/** Values are stored as strings; each set must replace one key atomically. */
export interface AsyncKeyValueBackend {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

export interface ProfileData {
  profiles: unknown
  history: unknown
}
export type ProfileSnapshot = ProfileData & { revision: number }
export type ProfileLock = <T>(task: () => Promise<T>) => Promise<T>

const INDEX = 'profiles:v2:index'
const GENERATION = 'profiles:v2:generation:'
const LOCK = 'profiles:v2:publication'

type Index = { revision: number; generation: string }

export function createLocalStorageBackend(storage: Pick<Storage, 'getItem' | 'setItem'>): AsyncKeyValueBackend {
  return {
    async get(key) { return storage.getItem(key) },
    async set(key, value) { storage.setItem(key, value) },
  }
}

export function createChromeStorageBackend(storage: {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, string>): Promise<void>
}): AsyncKeyValueBackend {
  return {
    async get(key) {
      const value = (await storage.get(key))[key]
      if (value === undefined) return null
      if (typeof value !== 'string') throw new Error(`Invalid storage value for ${key}`)
      return value
    },
    async set(key, value) { await storage.set({ [key]: value }) },
  }
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
 * Cross-context writer exclusion requires Web Locks or a shared injected lock.
 * Without one, revision checks detect stale writes but cannot prevent races.
 * Old and failed staged generations are intentionally retained.
 */
export function createProfileStorage(backend: AsyncKeyValueBackend, options: { lock?: ProfileLock } = {}) {
  const browserLock: ProfileLock | undefined = typeof navigator !== 'undefined' && navigator.locks
    ? async task => await navigator.locks.request(LOCK, task)
    : undefined
  const lock = options.lock ?? browserLock

  async function read(): Promise<ProfileSnapshot | null> {
    const index = parseIndex(await backend.get(INDEX))
    return index === null ? null : parseGeneration(await backend.get(GENERATION + index.generation), index)
  }

  async function publish(data: ProfileData, expectedRevision: number | null): Promise<ProfileSnapshot> {
    const current = await read()
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
    if ((latest?.revision ?? null) !== expectedRevision || (current !== null && latest?.revision !== current.revision)) throw new Error('Profile revision conflict')
    await backend.set(INDEX, JSON.stringify({ revision, generation: id }))
    return parseGeneration(serialized, { revision, generation: id })
  }

  return {
    read,
    write(data: ProfileData, expectedRevision: number | null) {
      return lock ? lock(() => publish(data, expectedRevision)) : publish(data, expectedRevision)
    },
  }
}
