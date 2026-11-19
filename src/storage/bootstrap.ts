import type { Settings } from '../core/model'
import type { ProfileV2 } from '../core/schema/profile'
import { createHistory, type History } from '../store/history'
import { validateStored, type ProfileCollection } from '../store/profile'
import type { createAssetLibrary } from './assets'
import { createChromeStorageBackend, createLocalStorageBackend, createProfileStorage, type AsyncKeyValueBackend, type ProfileLock, type ProfileSnapshot } from './profiles'
import type { RawSettings } from './settings'
import { extensionApi } from '../platform/extension'

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

/** Validates a published generation once; the result is what the profile store keeps, so it need not check it again. */
function validateSnapshot(snapshot: ProfileSnapshot): BootstrapSnapshot {
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) throw new Error('Invalid revision')
  const committed = validateStored(snapshot.profiles, snapshot.history)
  const archived = Object.keys(committed.archived).length ? { archived: committed.archived } : {}
  return { revision: snapshot.revision, profiles: { activeProfileId: committed.activeProfileId, profiles: committed.profiles, ...archived }, history: committed.history }
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

  // First run only: the legacy backup and migration stay out of the startup bundle.
  const { migrateFirstRun } = await import('./firstRun')
  const { profile, fresh } = await migrateFirstRun(backend, options)
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
