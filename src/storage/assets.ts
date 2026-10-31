import { openDB, type DBSchema } from 'idb'

interface AssetDatabase extends DBSchema {
  assets: { key: string; value: AssetRecord }
}

export const DEFAULT_MAX_ASSET_BYTES = 5 * 1024 * 1024
const prefix = 'mnt-asset:'
const idPattern = /^[a-f0-9]{64}$/

export interface AssetRecord {
  id: string
  blob: Blob
  refCount: number
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

/** An independent database avoids upgrading the existing wallpaper database. */
export const indexedDbAssetStore: AssetStore = {
  async transaction(mode, run) {
    const db = await openDB<AssetDatabase>('assets', 1, { upgrade(database) { database.createObjectStore('assets', { keyPath: 'id' }) } })
    const tx = db.transaction('assets', mode)
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
    } finally {
      db.close()
    }
  },
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

/** Reconcile only against a complete, committed view of all profiles and snapshots. */
export function createAssetLibrary(store: AssetStore = indexedDbAssetStore, options: { maxBytes?: number } = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ASSET_BYTES
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('Invalid asset size limit')
  return {
    async add(blob: Blob): Promise<string> {
      if (blob.size > maxBytes) throw new Error('Asset exceeds size limit')
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
      const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      await store.transaction('readwrite', async tx => {
        if (!await tx.get(id)) await tx.put({ id, blob, refCount: 0 })
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
    async reconcile(owners: { profiles: readonly unknown[]; snapshots: readonly unknown[] }): Promise<void> {
      const counts = new Map<string, number>()
      countReferences(owners, counts)
      await store.transaction('readwrite', async tx => {
        const records = await tx.getAll()
        const known = new Set(records.map(record => record.id))
        for (const id of counts.keys()) if (!known.has(id)) throw new Error(`Missing asset: ${id}`)
        for (const record of records) {
          const refCount = counts.get(record.id) ?? 0
          if (refCount === 0) await tx.delete(record.id)
          else if (refCount !== record.refCount) await tx.put({ ...record, refCount })
        }
      })
    },
  }
}
