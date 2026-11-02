import { describe, expect, it, vi } from 'vitest'
import { mergeSyncedProfile, parseSyncPayload, serializeSyncPayload, decideSyncConflict, decideSyncChanges, debounceSync, chunkSyncPayload, readSyncStorage, writeSyncStorage } from './sync'
import { defaultProfile } from '../features/settings/sectionDefaults'

const profile = async () => await defaultProfile('en')

describe('profile sync payload', () => {
  it('omits local asset references and reconstructs synced fields over local-only data', async () => {
    const local = await profile()
    const id = 'a'.repeat(64)
    local.meta.updatedAt = '2026-01-01T00:00:00.000Z'
    local.bookmarks.groups[0].items[0].image = `mnt-asset:${id}`
    local.theme.font.display = `mnt-asset:${id}`
    local.background = { type: 'image', dim: 35, image: { asset: `mnt-asset:${id}`, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } }

    const payload = parseSyncPayload(serializeSyncPayload(local))
    expect(JSON.stringify(payload)).not.toContain(id)
    expect(Object.hasOwn(payload.profile, 'background')).toBe(false)
    expect(Object.hasOwn(payload.profile.theme, 'font')).toBe(false)

    payload.profile.meta.id = 'remote-device'
    payload.profile.meta.name = 'Synced profile'
    const merged = mergeSyncedProfile(local, payload)
    expect(merged.meta.id).toBe(local.meta.id)
    expect(merged.meta.name).toBe(local.meta.name)
    expect(merged.meta.createdAt).toBe(local.meta.createdAt)
    expect(merged.background).toEqual(local.background)
    expect(merged.bookmarks.groups[0].items[0].image).toBe(`mnt-asset:${id}`)
    expect(merged.theme.font.display).toBe(`mnt-asset:${id}`)
  })

  it('splits payloads within conservative per-item and total byte limits', () => {
    const chunks = chunkSyncPayload('x'.repeat(30_000))
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every(chunk => new TextEncoder().encode(chunk).length <= 5_000)).toBe(true)
    expect(chunks.reduce((sum, chunk) => sum + new TextEncoder().encode(chunk).length, 0)).toBeLessThan(75_000)
    expect(() => chunkSyncPayload('x'.repeat(100_000))).toThrow(/quota/i)
  })
})

describe('browser sync storage', () => {
  it('debounces repeated updates for two seconds', () => {
    vi.useFakeTimers()
    try {
      const callback = vi.fn()
      const timer = debounceSync(callback)
      timer.schedule()
      vi.advanceTimersByTime(1500)
      timer.schedule()
      vi.advanceTimersByTime(1999)
      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.cancel()
    } finally { vi.useRealTimers() }
  })
  it('roundtrips a payload and rejects total quota overflow before writing', async () => {
    const values: Record<string, unknown> = {}
    let writes = 0
    const storage = {
      async get() { return { ...values } },
      async set(items: Record<string, string>) { writes++; Object.assign(values, items) },
      async remove(keys: string[]) { keys.forEach(key => { delete values[key] }) },
    }
    const local = await profile()
    await writeSyncStorage(storage, local)
    expect((await readSyncStorage(storage))?.profile.meta.id).toBe(local.meta.id)

    const baselineWrites = writes
    values['other.large-value'] = 'x'.repeat(99_500)
    local.meta.name = 'Changed'
    await expect(writeSyncStorage(storage, local)).rejects.toThrow(/quota/i)
    expect(writes).toBe(baselineWrites)
  })

  it('writes only changed chunks and skips unchanged snapshots', async () => {
    const values: Record<string, unknown> = {}
    const writes: Record<string, string>[] = []
    const storage = {
      async get() { return { ...values } },
      async set(items: Record<string, string>) { writes.push(items); Object.assign(values, items) },
      async remove(keys: string[]) { keys.forEach(key => { delete values[key] }) },
    }
    const local = await profile()
    await writeSyncStorage(storage, local)
    writes.length = 0
    await writeSyncStorage(storage, local)
    expect(writes).toHaveLength(0)
    local.meta.name += ' edited'
    await writeSyncStorage(storage, local)
    expect(writes).toHaveLength(1)
    expect(Object.keys(writes[0])).toContain('mnt.sync.manifest')
    expect((await readSyncStorage(storage))?.profile.meta.name).toBe(local.meta.name)
  })

  it('counts stale chunks while checking the temporary write size', async () => {
    const values: Record<string, unknown> = {
      'other.large-value': 'x'.repeat(95_000),
      'mnt.sync.chunk.19': 'x'.repeat(3_500),
      'mnt.sync.chunk.18': 'x'.repeat(3_500),
    }
    let writes = 0
    const storage = {
      async get() { return { ...values } },
      async set(items: Record<string, string>) { writes++; Object.assign(values, items) },
      async remove(keys: string[]) { keys.forEach(key => { delete values[key] }) },
    }
    await expect(writeSyncStorage(storage, await profile())).rejects.toThrow(/quota/i)
    expect(writes).toBe(0)
  })
})

describe('sync conflicts', () => {
  it('distinguishes independent edits against the base', () => {
    const base = { local: 'before-local', cloud: 'before-cloud' }
    expect(decideSyncChanges(base, 'before-local', 'new-cloud')).toBe('pull')
    expect(decideSyncChanges(base, 'new-local', 'before-cloud')).toBe('push')
    expect(decideSyncChanges(base, 'new-local', 'new-cloud')).toBe('conflict')
    expect(decideSyncChanges(null, 'local', 'cloud')).toBe('conflict')
    expect(decideSyncChanges(base, 'same', 'same')).toBe('unchanged')
  })
  it('compares update timestamps and keeps local on ties or invalid input', () => {
    expect(decideSyncConflict('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toBe('keep-local')
    expect(decideSyncConflict('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')).toBe('pull-cloud')
    expect(decideSyncConflict('bad', '2026-01-02T00:00:00Z')).toBe('keep-local')
    expect(decideSyncConflict('2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')).toBe('keep-local')
  })
})
