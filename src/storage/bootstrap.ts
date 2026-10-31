import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import { parseProfileV2, type ProfileV2 } from '../core/schema/profile'
import { createHistory, type History } from '../store/history'
import { createAssetLibrary } from './assets'
import { createChromeStorageBackend, createLocalStorageBackend, createProfileStorage, type AsyncKeyValueBackend, type ProfileSnapshot } from './profiles'
import { readRawSettings, type RawSettings } from './settings'
import { readWallpaper } from './wallpaper'

export type BootstrapSnapshot = { revision: number; profiles: ProfileV2[]; history: History<ProfileV2> }
export type BootstrapOptions = {
  backend?: AsyncKeyValueBackend
  profiles?: Pick<ReturnType<typeof createProfileStorage>, 'read' | 'write'>
  assets?: Pick<ReturnType<typeof createAssetLibrary>, 'add'>
  readRawSettings?: () => Promise<RawSettings>
  readWallpaper?: () => Promise<Blob | undefined>
  id?: () => string
  now?: () => string
}

function validateSnapshot(snapshot: ProfileSnapshot): BootstrapSnapshot {
  if (!Array.isArray(snapshot.profiles) || !snapshot.history || typeof snapshot.history !== 'object' || Array.isArray(snapshot.history)) throw new Error('Invalid profile data')
  const history = snapshot.history as History<ProfileV2>
  if (!history.profiles || typeof history.profiles !== 'object' || Array.isArray(history.profiles)) throw new Error('Invalid profile history')
  for (const entry of Object.values(history.profiles)) {
    if (!entry || !Array.isArray(entry.snapshots) || !(entry.lastEditAt === null || typeof entry.lastEditAt === 'number' && Number.isFinite(entry.lastEditAt))) throw new Error('Invalid profile history')
    for (const item of entry.snapshots) {
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt) || !['edit', 'reset', 'import', 'restore', 'theme', 'preset'].includes(item.kind) || typeof item.pinned !== 'boolean') throw new Error('Invalid profile history')
      parseProfileV2(item.profile)
    }
  }
  snapshot.profiles.forEach(parseProfileV2)
  return snapshot as BootstrapSnapshot
}

/** Initialize profiles from legacy settings, or validate the already published generation. */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapSnapshot> {
  const backend = options.backend ?? (window.chrome?.storage
    ? createChromeStorageBackend(window.chrome.storage.local)
    : createLocalStorageBackend(localStorage))
  const profiles = options.profiles ?? createProfileStorage(backend)
  const current = await profiles.read()
  if (current) return validateSnapshot(current)

  const raw = await (options.readRawSettings ?? readRawSettings)()
  // Store the envelope, including absence and the exact localStorage string.
  if (await backend.get('backup:v1-original') === null) await backend.set('backup:v1-original', JSON.stringify(raw))
  const input = raw.backend === 'local'
    ? raw.value === null ? defaults : JSON.parse(raw.value)
    : raw.present ? raw.value : defaults
  const wallpaper = await (options.readWallpaper ?? readWallpaper)()
  const assets = options.assets ?? createAssetLibrary()
  const profile = await migrateV1(input, {
    id: options.id ?? (() => crypto.randomUUID()),
    now: options.now ?? (() => new Date().toISOString()),
    add: blob => assets.add(blob),
    wallpaper,
  })
  return validateSnapshot(await profiles.write({ profiles: [profile], history: createHistory<ProfileV2>() }, null))
}
