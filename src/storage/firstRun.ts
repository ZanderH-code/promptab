import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'
import { createAssetLibrary } from './assets'
import type { BootstrapOptions } from './bootstrap'
import type { AsyncKeyValueBackend } from './profiles'
import { readRawSettings } from './settings'
import { readWallpaper } from './wallpaper'

/**
 * First run only, so it is loaded on demand and stays out of the startup bundle: backs up the legacy
 * settings and migrates them (or the defaults) into the first profile.
 */
export async function migrateFirstRun(backend: AsyncKeyValueBackend, options: BootstrapOptions): Promise<{ profile: ProfileV2; fresh: boolean }> {
  const raw = await (options.readRawSettings ?? readRawSettings)()
  // Store the envelope, including absence and the exact localStorage string.
  if (await backend.get('backup:v1-original') === null) await backend.set('backup:v1-original', JSON.stringify(raw))
  const initial = options.defaultSettings ?? defaults
  const fresh = raw.backend === 'local' ? raw.value === null : !raw.present
  // Starter sites are only needed for a fresh install; fetch them while the migration runs.
  const starter = fresh ? import('../core/starter-sites') : null
  // Awaited below; this only keeps a failed load from being reported as unhandled if the migration fails first.
  starter?.catch(() => {})
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
  if (starter) profile.bookmarks.groups[0].items = structuredClone((await starter).STARTER_SITES)
  return { profile, fresh }
}
