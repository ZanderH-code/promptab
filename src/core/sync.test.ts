import { describe, expect, it } from 'vitest'
import { mergeSyncedProfile, parseSyncPayload, serializeSyncPayload, decideSyncConflict, chunkSyncPayload, readSyncStorage, writeSyncStorage } from './sync'
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

    payload.profile.meta.name = 'Synced profile'
    const merged = mergeSyncedProfile(local, payload)
    expect(merged.meta.name).toBe('Synced profile')
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
    await expect(writeSyncStorage(storage, local)).rejects.toThrow(/quota/i)
    expect(writes).toBe(baselineWrites)
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
  it('compares update timestamps and keeps local on ties or invalid input', () => {
    expect(decideSyncConflict('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toBe('keep-local')
    expect(decideSyncConflict('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')).toBe('pull-cloud')
    expect(decideSyncConflict('bad', '2026-01-02T00:00:00Z')).toBe('keep-local')
    expect(decideSyncConflict('2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')).toBe('keep-local')
  })
})
