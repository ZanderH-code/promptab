import { expect, it, vi } from 'vitest'
import { defaults } from './model'
import { bootstrap } from '../storage/bootstrap'
import { createLocalStorageBackend, createProfileStorage } from '../storage/profiles'
import type { ProfileSnapshot } from '../storage/profiles'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size },
  } as Storage
}

it('starts a fresh profile without the example bookmark', async () => {
  const storage = memoryStorage()
  const backend = createLocalStorageBackend(storage)
  const lock = async <T,>(task: () => Promise<T>) => task()
  const persistence = createProfileStorage(backend, { lock })
  const snapshot = await bootstrap({
    backend, lock, profiles: persistence,
    assets: { add: vi.fn() },
    readRawSettings: async () => ({ backend: 'local', value: null } as never),
    readWallpaper: async () => undefined,
    id: () => 'fresh', now: () => new Date(0).toISOString(),
  }) as ProfileSnapshot
  const profile = (snapshot.profiles as { profiles: Record<string, { bookmarks: { groups: { items: unknown[] }[] } }> }).profiles.fresh
  expect(profile.bookmarks.groups.flatMap(group => group.items)).toEqual([])
  expect(defaults.shortcuts).toHaveLength(1)
})
