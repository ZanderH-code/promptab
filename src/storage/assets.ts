import { openDB, type DBSchema } from 'idb'
import type { GenerationCollection } from './profiles'

interface AssetDatabase extends DBSchema {
  assets: { key: string; value: AssetRecord }
}

export const DEFAULT_MAX_ASSET_BYTES = 5 * 1024 * 1024
/** Unreferenced assets younger than this survive collection, covering adds made outside a session. */
export const DEFAULT_ASSET_GRACE_MS = 24 * 60 * 60 * 1000
export const ASSET_LIFECYCLE_LOCK = 'assets:v1:lifecycle'
const prefix = 'mnt-asset:'
const idPattern = /^[a-f0-9]{64}$/

export interface AssetRecord {
  id: string
  blob: Blob
  /** References from stored profile generations, as of the last collection. */
  refCount: number
  /** Last time the asset was added; absent on records written before collection existed. */
  addedAt?: number
}

export interface AssetTransaction {
  get(id: string): Promise<AssetRecord | undefined>
  getAll(): Promise<AssetRecord[]>
  put(record: AssetRecord): Promise<unknown>
  delete(id: string): Promise<unknown>
}

export interface AssetStore {
  transaction<T>(mode: 'readonly' | 'readwrite', run: (tx: AssetTransaction) => Promise<T>): Promise<T>
}

export type AssetLocks = Pick<LockManager, 'request'>
export type GenerationCollector = { collectGenerations<T>(use: (collection: GenerationCollection) => Promise<T>): Promise<T> }
export type AssetCollection =
  | { status: 'collected'; deleted: string[]; retained: number; missing: string[]; prunedGenerations: number }
  | { status: 'skipped'; reason: 'busy' | 'uncommitted' }
  | { status: 'failed'; error: unknown }
export type AssetSession = { collection: AssetCollection; close(): void }

type AssetDb = Awaited<ReturnType<typeof openDB<AssetDatabase>>>
let connection: Promise<AssetDb> | null = null

/** One connection per page; it is dropped when another context upgrades the database or the browser closes it. */
function database(): Promise<AssetDb> {
  if (connection) return connection
  const opened: Promise<AssetDb> = openDB<AssetDatabase>('assets', 1, {
    upgrade(db) { db.createObjectStore('assets', { keyPath: 'id' }) },
    // A newer version elsewhere waits for this connection; closing lets it upgrade and the next call reopens.
    blocking() { if (connection === opened) connection = null; void opened.then(db => db.close()) },
    terminated() { if (connection === opened) connection = null },
  })
  connection = opened
  opened.catch(() => { if (connection === opened) connection = null })
  return opened
}

async function begin(mode: 'readonly' | 'readwrite') {
  const pending = database()
  try { return (await pending).transaction('assets', mode) } catch (error) {
    if (connection !== pending || !(error instanceof DOMException && error.name === 'InvalidStateError')) throw error
    // The cached connection was closed without an event reaching this page; reopen once.
    connection = null
    return (await database()).transaction('assets', mode)
  }
}

/** An independent database avoids upgrading the existing wallpaper database. */
export const indexedDbAssetStore: AssetStore = {
  async transaction(mode, run) {
    const tx = await begin(mode)
    try {
      const result = await run({
        get: id => tx.store.get(id),
        getAll: () => tx.store.getAll(),
        put: record => tx.store.put!(record),
        delete: id => tx.store.delete!(id),
      })
      await tx.done
      return result
    } catch (error) {
      try { tx.abort() } catch { /* The transaction may already have aborted. */ }
      await tx.done.catch(() => undefined)
      throw error
    }
  },
}

/** Test hook: closes and forgets the shared connection. */
export async function closeAssetDatabase(): Promise<void> {
  const current = connection
  connection = null
  if (current) (await current.catch(() => null))?.close()
}

function parseReference(reference: string): string {
  const id = reference.startsWith(prefix) ? reference.slice(prefix.length) : ''
  if (!idPattern.test(id)) throw new Error('Invalid asset reference')
  return id
}

function countReferences(value: unknown, counts: Map<string, number>, ancestors = new Set<object>()): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/mnt-asset:([a-f0-9]{64})(?![a-zA-Z0-9])/g)) {
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1)
    }
  } else if (value && typeof value === 'object') {
    if (ancestors.has(value)) throw new Error('Circular reference in asset owners')
    ancestors.add(value)
    for (const item of Object.values(value)) countReferences(item, counts, ancestors)
    ancestors.delete(value)
  }
}

/**
 * Deletes assets that no stored generation references and that were not added recently.
 * Only reachable through openSession, which holds the exclusive lifecycle lock and the
 * publication lock, so no other context can hold live state or staged adds meanwhile.
 */
async function sweep(store: AssetStore, roots: unknown[], now: number, graceMs: number) {
  const counts = new Map<string, number>()
  countReferences(roots, counts)
  return store.transaction('readwrite', async tx => {
    const records = await tx.getAll()
    const known = new Set(records.map(record => record.id))
    const deleted: string[] = []
    for (const record of records) {
      const refCount = counts.get(record.id) ?? 0
      if (refCount > 0) {
        if (refCount !== record.refCount) await tx.put({ ...record, refCount })
      } else if (record.addedAt === undefined) {
        // The age of legacy records is unknown; start their grace period now.
        await tx.put({ ...record, refCount, addedAt: now })
      } else if (now - record.addedAt >= graceMs) {
        await tx.delete(record.id)
        deleted.push(record.id)
      } else if (record.refCount !== 0) await tx.put({ ...record, refCount })
    }
    return { deleted, retained: records.length - deleted.length, missing: [...counts.keys()].filter(id => !known.has(id)) }
  })
}

export function createAssetLibrary(store: AssetStore = indexedDbAssetStore, options: { maxBytes?: number; now?: () => number } = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ASSET_BYTES
  const now = options.now ?? Date.now
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('Invalid asset size limit')
  return {
    /** Adding an existing asset restarts its grace period, protecting it while it is staged again. */
    async add(blob: Blob, limit = maxBytes): Promise<string> {
      if (!Number.isSafeInteger(limit) || limit < 0 || blob.size > limit) throw new Error('Asset exceeds size limit')
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
      const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      const addedAt = now()
      await store.transaction('readwrite', async tx => {
        const existing = await tx.get(id)
        await tx.put(existing ? { ...existing, addedAt } : { id, blob, refCount: 0, addedAt })
      })
      return prefix + id
    },
    async get(reference: string): Promise<Blob | undefined> {
      const id = parseReference(reference)
      return store.transaction('readonly', async tx => (await tx.get(id))?.blob)
    },
    async list(): Promise<AssetRecord[]> {
      return store.transaction('readonly', tx => tx.getAll())
    },
    /**
     * Join the asset lifecycle for this context. Collection runs first, only when no other
     * session exists; then a shared lifecycle lock is held until close() or the context ends,
     * which blocks collection elsewhere. Open the session before reading profiles or adding
     * assets, and keep it open while any profile, history, undo, draft or preview state is live.
     */
    async openSession(deps: { profiles: GenerationCollector; locks?: AssetLocks; graceMs?: number }): Promise<AssetSession> {
      const locks = deps.locks ?? (typeof navigator !== 'undefined' ? navigator.locks : undefined)
      if (!locks) throw new Error('Asset sessions require Web Locks')
      const graceMs = deps.graceMs ?? DEFAULT_ASSET_GRACE_MS
      if (!(graceMs >= 0)) throw new Error('Invalid asset grace period')
      let collection: AssetCollection
      try {
        collection = await locks.request(ASSET_LIFECYCLE_LOCK, { mode: 'exclusive', ifAvailable: true }, async lock => {
          if (!lock) return { status: 'skipped', reason: 'busy' } as const
          return deps.profiles.collectGenerations<AssetCollection>(async ({ current, roots, pruned }) => {
            if (!current) return { status: 'skipped', reason: 'uncommitted' }
            return { status: 'collected', prunedGenerations: pruned.length, ...await sweep(store, roots, now(), graceMs) }
          })
        })
      } catch (error) {
        collection = { status: 'failed', error }
      }
      let close!: () => void
      const held = new Promise<void>(resolve => { close = resolve })
      await new Promise<void>((resolve, reject) => {
        locks.request(ASSET_LIFECYCLE_LOCK, { mode: 'shared' }, () => { resolve(); return held }).catch(reject)
      })
      return { collection, close }
    },
  }
}
