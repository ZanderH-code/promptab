import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import { readSyncStorage, writeSyncStorage } from '../core/sync'
import type { ProfileV2 } from '../core/schema/profile'
import { createProfileStore } from '../store/profile'
import { createSyncController, useSyncStatus } from './syncRuntime'

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
    const first = createSyncController(await w.store(), { local: area(w.local), sync: area(w.sync) }, w.lock)
    await first.keepLocal()
    first.stop()
    const cloud = structuredClone(w.profile)
    cloud.theme.color.accent = '#123456'
    await writeSyncStorage(area(w.sync), cloud)

    const stores = [await w.store(), await w.store()]
    const controllers = stores.map(store => createSyncController(store, { local: area(w.local), sync: area(w.sync) }, w.lock))
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
    const controller = createSyncController(await w.store(), { local: area(w.local), sync: area(w.sync) }, lock)
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
    const first = createSyncController(await w.store(), { local: area(w.local), sync: area(w.sync) }, w.lock)
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
    const controller = createSyncController(store, { local: area(w.local), sync }, w.lock)
    await controller.keepLocal()
    controller.stop()
    expect(store.getState().profiles.main.custom.css).toBe('.mine{}')
    expect(store.getState().profiles.main.theme.color.accent).toBe('#123456')
  })
})
