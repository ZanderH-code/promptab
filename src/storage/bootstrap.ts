import { defaults, type Settings } from '../core/model'
import { STARTER_SITES } from '../core/starter-sites'
import { migrateV1 } from '../core/migrate/v1'
import { parseProfileV2, type ProfileV2 } from '../core/schema/profile'
import { createHistory, type History } from '../store/history'
import type { ProfileCollection } from '../store/profile'
import { createAssetLibrary } from './assets'
import { createChromeStorageBackend, createLocalStorageBackend, createProfileStorage, type AsyncKeyValueBackend, type ProfileLock, type ProfileSnapshot } from './profiles'
import { readRawSettings, type RawSettings } from './settings'
import { extensionApi } from '../platform/extension'
import { readWallpaper } from './wallpaper'

export type BootstrapSnapshot = { revision: number; profiles: ProfileCollection; history: History<ProfileV2> }
export type BootstrapOptions = {
  backend?: AsyncKeyValueBackend
  /** Must serialize bootstrap calls across every context sharing this storage. */
  lock?: ProfileLock
  profiles?: Pick<ReturnType<typeof createProfileStorage>, 'read' | 'write'>
  assets?: Pick<ReturnType<typeof createAssetLibrary>, 'add'>
  readRawSettings?: () => Promise<RawSettings>
  defaultSettings?: Settings
  readWallpaper?: () => Promise<Blob | undefined>
  id?: () => string
  now?: () => string
}

function validateSnapshot(snapshot: ProfileSnapshot): BootstrapSnapshot {
  if (!snapshot.profiles || typeof snapshot.profiles !== 'object' || Array.isArray(snapshot.profiles) || !snapshot.history || typeof snapshot.history !== 'object' || Array.isArray(snapshot.history)) throw new Error('Invalid profile data')
  const collection = snapshot.profiles as ProfileCollection
  if (!collection.profiles || typeof collection.profiles !== 'object' || Array.isArray(collection.profiles) || typeof collection.activeProfileId !== 'string' || !Object.hasOwn(collection.profiles, collection.activeProfileId)) throw new Error('Invalid profiles')
  for (const [id, value] of Object.entries(collection.profiles)) {
    if (parseProfileV2(value).meta.id !== id) throw new Error('Invalid profile id')
  }
  const history = snapshot.history as History<ProfileV2>
  if (!history.profiles || typeof history.profiles !== 'object' || Array.isArray(history.profiles)) throw new Error('Invalid profile history')
  for (const [id, entry] of Object.entries(history.profiles)) {
    if (!Object.hasOwn(collection.profiles, id) || !entry || !Array.isArray(entry.snapshots) || !(entry.lastEditAt === null || typeof entry.lastEditAt === 'number' && Number.isFinite(entry.lastEditAt))) throw new Error('Invalid profile history')
    for (const item of entry.snapshots) {
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt) || !['edit', 'reset', 'import', 'restore', 'theme', 'preset'].includes(item.kind) || typeof item.pinned !== 'boolean') throw new Error('Invalid profile history')
      if (parseProfileV2(item.profile).meta.id !== id) throw new Error('Invalid history profile id')
    }
  }
  return snapshot as BootstrapSnapshot
}

/** Initialize profiles from legacy settings, or validate the already published generation. */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapSnapshot> {
  const lock: ProfileLock | undefined = options.lock ?? (typeof navigator !== 'undefined' && navigator.locks
    ? async task => await navigator.locks.request('profiles:v2:bootstrap', task)
    : undefined)
  if (!lock) throw new Error('Bootstrap requires a cross-context lock')
  return lock(() => bootstrapLocked(options))
}

async function bootstrapLocked(options: BootstrapOptions): Promise<BootstrapSnapshot> {
  const local = extensionApi()?.storage?.local
  const backend = options.backend ?? (local ? createChromeStorageBackend(local) : createLocalStorageBackend(localStorage))
  const profiles = options.profiles ?? createProfileStorage(backend)
  const current = await profiles.read()
  if (current) return validateSnapshot(current)

  const raw = await (options.readRawSettings ?? readRawSettings)()
  // Store the envelope, including absence and the exact localStorage string.
  if (await backend.get('backup:v1-original') === null) await backend.set('backup:v1-original', JSON.stringify(raw))
  const initial = options.defaultSettings ?? defaults
  const fresh = raw.backend === 'local' ? raw.value === null : !raw.present
  const input = raw.backend === 'local'
    ? raw.value === null ? { ...initial, shortcuts: [] } : JSON.parse(raw.value)
    : raw.present ? raw.value : { ...initial, shortcuts: [] }
  const wallpaper = await (options.readWallpaper ?? readWallpaper)()
  const assets = options.assets ?? createAssetLibrary()
  const profile = await migrateV1(input, {
    id: options.id ?? (() => crypto.randomUUID()),
    now: options.now ?? (() => new Date().toISOString()),
    add: blob => assets.add(blob),
    wallpaper,
  })
  if (fresh) profile.bookmarks.groups[0].items = structuredClone(STARTER_SITES)
  const snapshot = validateSnapshot(await profiles.write({ profiles: { activeProfileId: profile.meta.id, profiles: { [profile.meta.id]: profile } }, history: createHistory<ProfileV2>() }, null))
  if (fresh && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('mnt:onboarding:eligible', 'true')
      localStorage.removeItem('mnt:onboarding:dismissed')
      window.dispatchEvent(new Event('mnt:onboarding-ready'))
    } catch { /* Storage can be unavailable. */ }
  }
  return snapshot
}
