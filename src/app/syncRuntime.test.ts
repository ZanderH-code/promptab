import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import { browserSyncBackend, readSyncStorage, toSyncPayload, writeSyncStorage, type CloudBackend, type SyncPayload } from '../core/sync'
import { DriveAuthError } from '../core/gdrive'
import type { ProfileV2 } from '../core/schema/profile'
import { createProfileStore } from '../store/profile'
import { createSyncController, syncActions, useSyncStatus } from './syncRuntime'
const syncActionsDismiss = () => syncActions.dismiss()

type Data = Record<string, unknown>
function area(data: Data, onGet?: () => void) {
  return {
    async get(keys: string | string[] | null) {
      onGet?.()
      if (keys === null) return { ...data }
      const list = Array.isArray(keys) ? keys : [keys]
      return Object.fromEntries(list.filter(key => Object.hasOwn(data, key)).map(key => [key, structuredClone(data[key])]))
    },
    async set(items: Data) { Object.assign(data, structuredClone(items)) },
    async remove(keys: string | string[]) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key] },
  }
}

async function world() {
  const profile = await migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })
  let saved: { revision: number; profiles: unknown; history: unknown } | null = { revision: 1, profiles: { activeProfileId: 'main', profiles: { main: profile } }, history: { profiles: {} } }
  let gate: Promise<void> | undefined
  const persistence = {
    async read() { return structuredClone(saved) },
    async write(data: { profiles: unknown; history: unknown }, revision: number | null) {
      await gate
      if ((saved?.revision ?? null) !== revision) throw new Error('Profile revision conflict')
      saved = structuredClone({ ...data, revision: (revision ?? 0) + 1 })
      return { revision: saved.revision }
    },
  }
  const local: Data = { 'mnt.sync.enabled': true }
  const sync: Data = {}
  let tail = Promise.resolve()
  const lock = (task: () => Promise<void>) => { const result = tail.then(task); tail = result.catch(() => {}); return result }
  const store = async () => {
    const created = createProfileStore({ persistence, initialProfile: profile })
    await created.getState().initialize()
    return created
  }
  return { profile, local, sync, lock, store, setGate: (value: Promise<void> | undefined) => { gate = value } }
}

describe('sync runtime', () => {
  it('lets one tab pull a cloud change while the other tabs adopt it without a conflict', async () => {
    const w = await world()
    const status = renderHook(() => useSyncStatus())
    const first = createSyncController(await w.store(), { local: area(w.local), cloud: browserSyncBackend(area(w.sync)) }, w.lock)
    await first.keepLocal()
    first.stop()
    const cloud = structuredClone(w.profile)
    cloud.theme.color.accent = '#123456'
    await writeSyncStorage(area(w.sync), cloud)

    const stores = [await w.store(), await w.store()]
    const controllers = stores.map(store => createSyncController(store, { local: area(w.local), cloud: browserSyncBackend(area(w.sync)) }, w.lock))
    await Promise.all(controllers.map(controller => controller.keepLocal()))
    controllers.forEach(controller => controller.stop())

    expect(status.result.current.status).toBe('pulled')
    for (const store of stores) expect(store.getState().profiles.main.theme.color.accent).toBe('#123456')
    expect((await readSyncStorage(area(w.sync)))!.profile.theme.color.accent).toBe('#123456')
    status.unmount()
  })

  it('shows the chosen switch position at once and settles on the stored one', async () => {
    const w = await world()
    w.local['mnt.sync.enabled'] = false
    const status = renderHook(() => useSyncStatus())
    let release!: () => void
    const held = new Promise<void>(resolve => { release = resolve })
    const lock = (task: () => Promise<void>) => held.then(task)
    const controller = createSyncController(await w.store(), { local: area(w.local), cloud: browserSyncBackend(area(w.sync)) }, lock)
    let done!: Promise<void>
    act(() => { done = controller.enable(true) })
    // The lock is still held by another tab, yet the switch already shows what was chosen.
    expect(status.result.current).toMatchObject({ requested: true })
    await act(async () => { release(); await done })
    expect(status.result.current).toMatchObject({ requested: null, enabled: true })
    expect(w.local['mnt.sync.enabled']).toBe(true)
    controller.stop()
  })

  it('merges a pulled profile into a local edit committed meanwhile', async () => {
    const w = await world()
    const first = createSyncController(await w.store(), { local: area(w.local), cloud: browserSyncBackend(area(w.sync)) }, w.lock)
    await first.keepLocal()
    first.stop()
    const cloud = structuredClone(w.profile)
    cloud.theme.color.accent = '#123456'
    await writeSyncStorage(area(w.sync), cloud)

    const store = await w.store()
    let edited = false
    let release!: () => void
    // The local edit starts while the cloud is being read and commits only after the pull is queued.
    const sync = area(w.sync, () => {
      if (edited) return
      edited = true
      w.setGate(new Promise(resolve => { release = resolve }))
      void store.getState().updateProfile('main', (p: ProfileV2) => ({ ...p, custom: { ...p.custom, css: '.mine{}' } }))
      setTimeout(() => { w.setGate(undefined); release() }, 10)
    })
    const controller = createSyncController(store, { local: area(w.local), cloud: browserSyncBackend(sync) }, w.lock)
    await controller.keepLocal()
    controller.stop()
    expect(store.getState().profiles.main.custom.css).toBe('.mine{}')
    expect(store.getState().profiles.main.theme.color.accent).toBe('#123456')
  })

  describe('with Google Drive', () => {
    function memoryCloud(connect: () => Promise<boolean> = async () => true) {
      const cloud = { copy: null as SyncPayload | null, fail: null as Error | null, writes: 0 }
      const backend: CloudBackend = {
        async read() { if (cloud.fail) throw cloud.fail; return structuredClone(cloud.copy) },
        async write(profile) { if (cloud.fail) throw cloud.fail; cloud.writes++; cloud.copy = toSyncPayload(profile) },
        async remove() { cloud.copy = null },
        connect: vi.fn(connect),
      }
      return { cloud, backend }
    }
    const session = () => { const data: Data = {}; return { data, get: async (key: string) => (key in data ? { [key]: data[key] } : {}), set: async (items: Data) => { Object.assign(data, items) } } }

    it('stops writing once another tab switches provider', async () => {
      const w = await world()
      const store = await w.store()
      const controller = createSyncController(store, { local: area(w.local), cloud: browserSyncBackend(area(w.sync)) }, w.lock)
      await controller.keepLocal()
      expect(await readSyncStorage(area(w.sync))).not.toBeNull()
      const before = JSON.stringify(w.sync)
      w.local['mnt.sync.provider'] = 'gdrive'
      await store.getState().updateProfile('main', (p: ProfileV2) => ({ ...p, theme: { ...p.theme, color: { ...p.theme.color, accent: '#654321' } } }))
      await new Promise(resolve => setTimeout(resolve, 2100))
      await controller.keepLocal()
      expect(JSON.stringify(w.sync)).toBe(before)
      controller.stop()
    }, 5000)

    it('leaves sync off when the person declines the Google prompt', async () => {
      const w = await world()
      w.local['mnt.sync.enabled'] = false
      const status = renderHook(() => useSyncStatus())
      const { cloud, backend } = memoryCloud(async () => false)
      const controller = createSyncController(await w.store(), { local: area(w.local), cloud: backend, provider: 'gdrive' }, w.lock)
      await act(async () => { await controller.enable(true) })
      expect(backend.connect).toHaveBeenCalledTimes(1)
      expect(status.result.current).toMatchObject({ enabled: false, requested: null })
      expect(w.local['mnt.sync.enabled']).toBe(false)
      expect(cloud.writes).toBe(0)
      controller.stop()
    })

    it('announces an expired sign-in once per browser session and asks for a choice after signing in again', async () => {
      const w = await world()
      w.local['mnt.sync.provider'] = 'gdrive'
      const shared = session()
      const status = renderHook(() => useSyncStatus())
      const { cloud, backend } = memoryCloud()
      cloud.copy = toSyncPayload(w.profile)
      w.local['mnt.sync.base.gdrive'] = { local: 'old', cloud: 'old' }
      cloud.fail = new DriveAuthError()
      const first = createSyncController(await w.store(), { local: area(w.local), cloud: backend, provider: 'gdrive', session: shared }, w.lock)
      await act(async () => { await first.keepLocal() })
      expect(status.result.current).toMatchObject({ needsSignIn: true, status: 'reauth' })
      first.stop()
      act(() => { syncActionsDismiss() })
      const second = createSyncController(await w.store(), { local: area(w.local), cloud: backend, provider: 'gdrive', session: shared }, w.lock)
      await act(async () => { await second.keepLocal() })
      // A second new tab keeps the Settings button but does not repeat the banner.
      expect(status.result.current).toMatchObject({ needsSignIn: true, status: null })

      // Signed in, possibly as another Google account whose copy differs: never pull it silently.
      cloud.fail = null
      const other = structuredClone(w.profile)
      other.theme.color.accent = '#00ff00'
      cloud.copy = toSyncPayload(other)
      await act(async () => { await second.signIn() })
      expect(w.local['mnt.sync.base.gdrive']).toBeUndefined()
      expect(status.result.current).toMatchObject({ needsSignIn: false, conflict: true })
      expect(cloud.writes).toBe(0)
      second.stop()
    })
  })
})
