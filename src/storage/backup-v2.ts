import { parseBackupV2, serializeBackupV2, MAX_BACKUP_ASSET_BYTES, MAX_BACKUP_VIDEO_BYTES } from '../core/backup-v2'
import { parseBackup } from '../core/backup'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'
import { planImport, validateStored, type Committed, type ImportCollection, type ProfileCollection } from '../store/profile'
import type { HistoryOptions } from '../store/history'
import type { createAssetLibrary } from './assets'
import type { createProfileStorage } from './profiles'

export type ImportAnalysis = {
  format: 1 | 2
  activeProfileId: string
  /** Profiles live after the import. For a v1 backup this is the whole current set with the active profile replaced. */
  incoming: { id: string; name: string }[]
  /** Live profiles that gain a pre-import snapshot. */
  retained: string[]
  /** Live profiles absent from the backup; moved to the archive with their history. */
  archived: string[]
  /** Archived profiles the backup brings back to life. */
  restored: string[]
  assetCount: number
}

const empty = (): Committed => ({ profiles: {}, activeProfileId: '', history: { profiles: {} }, archived: {} })

function backupFormat(json: string): 1 | 2 {
  try {
    const value: unknown = JSON.parse(json)
    if (value && typeof value === 'object' && (value as { backupVersion?: unknown }).backupVersion === 1) return 1
  } catch { /* parseBackupV2 reports the error */ }
  return 2
}

/** Dependencies must refer to the same persistent profile and asset stores used by the application. */
export function createBackupV2Service(deps: {
  profiles: Pick<ReturnType<typeof createProfileStorage>, 'read' | 'write'>
  assets: Pick<ReturnType<typeof createAssetLibrary>, 'add' | 'get'>
  now?: () => number
  createId?: () => string
}) {
  const options: HistoryOptions = { now: deps.now ?? Date.now, createId: deps.createId ?? (() => crypto.randomUUID()) }

  async function readCommitted(expectedRevision: number | null): Promise<Committed> {
    const current = await deps.profiles.read()
    if ((current?.revision ?? null) !== expectedRevision) throw new Error('Profile revision conflict')
    return current ? validateStored(current.profiles, current.history) : empty()
  }

  /** A v1 backup replaces only the active profile, keeping its ID, name and creation time. */
  function v1Collection(committed: Committed, replacement: ProfileV2): ImportCollection {
    const old = committed.profiles[committed.activeProfileId]
    if (!old) return { activeProfileId: replacement.meta.id, profiles: [replacement] }
    const merged: ProfileV2 = { ...replacement, meta: { ...replacement.meta, id: old.meta.id, name: old.meta.name, createdAt: old.meta.createdAt } }
    return { activeProfileId: old.meta.id, profiles: Object.values(committed.profiles).map(profile => profile.meta.id === old.meta.id ? merged : profile) }
  }

  return {
    /** Read-only preview of what importing `json` would do; touches neither profiles nor assets. */
    async analyzeBackup(json: string, expectedRevision: number | null, recovery = false): Promise<ImportAnalysis> {
      const committed = recovery ? empty() : await readCommitted(expectedRevision)
      const format = backupFormat(json)
      let collection: ImportCollection
      let assetCount = 0
      if (format === 1) {
        const parsed = parseBackup(json)
        assetCount = parsed.wallpaper ? 1 : 0
        const active = committed.profiles[committed.activeProfileId]
        collection = active ? { activeProfileId: active.meta.id, profiles: Object.values(committed.profiles) } : { activeProfileId: 'new', profiles: [] }
      } else {
        const backup = await parseBackupV2(json)
        assetCount = backup.assets.length
        collection = backup
      }
      const ids = new Set(collection.profiles.map(profile => profile.meta.id))
      const live = Object.keys(committed.profiles)
      return {
        format,
        activeProfileId: collection.activeProfileId,
        incoming: format === 1 && !live.length ? [] : collection.profiles.map(profile => ({ id: profile.meta.id, name: profile.meta.name })),
        retained: live.filter(id => ids.has(id)),
        archived: live.filter(id => !ids.has(id)),
        restored: [...ids].filter(id => Object.hasOwn(committed.archived, id)),
        assetCount,
      }
    },

    /**
     * Replace the committed collection (v1 or v2 backup). Profiles missing from the backup are archived
     * with their history rather than rejected; retained ones get a pre-import snapshot.
     * Callers holding a profile store should reload it afterwards, or use store.importCollection instead.
     */
    async importBackup(json: string, expectedRevision: number | null) {
      const committed = await readCommitted(expectedRevision)
      let next: Committed
      if (backupFormat(json) === 1) {
        const parsed = parseBackup(json)
        const profile = await migrateV1(parsed.settings, { id: options.createId, now: () => new Date(options.now()).toISOString(), add: blob => deps.assets.add(blob), wallpaper: parsed.wallpaper })
        next = planImport(committed, v1Collection(committed, profile), options)
      } else {
        const backup = await parseBackupV2(json)
        next = planImport(committed, backup, options)
        for (const asset of backup.assets) {
          const reference = `mnt-asset:${asset.id}`
          const limit = asset.blob.type.startsWith('video/') ? MAX_BACKUP_VIDEO_BYTES : MAX_BACKUP_ASSET_BYTES
          if (await deps.assets.add(asset.blob, limit) !== reference) throw new Error('Asset ID mismatch')
          const stored = await deps.assets.get(reference)
          if (!stored) throw new Error(`Missing asset: ${asset.id}`)
          const digest = await crypto.subtle.digest('SHA-256', await stored.arrayBuffer())
          const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
          if (id !== asset.id) throw new Error('Stored asset hash mismatch')
        }
      }
      const profiles: ProfileCollection = { activeProfileId: next.activeProfileId, profiles: next.profiles, ...(Object.keys(next.archived).length ? { archived: next.archived } : {}) }
      return deps.profiles.write({ profiles, history: next.history }, expectedRevision)
    },

    /** Export committed profiles and their referenced assets, excluding history. */
    async exportBackup(): Promise<string> {
      const snapshot = await deps.profiles.read()
      if (!snapshot) throw new Error('No committed profiles')
      const collection = snapshot.profiles as ProfileCollection
      if (!collection || typeof collection !== 'object' || !collection.profiles || typeof collection.profiles !== 'object' || Array.isArray(collection.profiles)) throw new Error('Invalid profile collection')
      const profiles: ProfileV2[] = Object.values(collection.profiles)
      if (Object.entries(collection.profiles).some(([id, profile]) => !profile || profile.meta?.id !== id)) throw new Error('Invalid profile IDs')
      const ids = new Set<string>()
      const visit = (value: unknown): void => {
        if (typeof value === 'string') {
          for (const match of value.matchAll(/mnt-asset:([a-f0-9]{64})(?![a-zA-Z0-9])/gi)) ids.add(match[1])
        } else if (value && typeof value === 'object') {
          for (const child of Object.values(value)) visit(child)
        }
      }
      profiles.forEach(visit)
      const assets = await Promise.all([...ids].map(async id => {
        const blob = await deps.assets.get(`mnt-asset:${id}`)
        if (!blob) throw new Error(`Missing asset: ${id}`)
        return { id, blob }
      }))
      return serializeBackupV2({ activeProfileId: collection.activeProfileId, profiles, assets })
    },
  }
}
