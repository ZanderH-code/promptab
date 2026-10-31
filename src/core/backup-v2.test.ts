// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defaults } from './model'
import { migrateV1 } from './migrate/v1'
import { parseBackupV2, serializeBackupV2, MAX_BACKUP_ASSET_BYTES, MAX_BACKUP_TOTAL_ASSET_BYTES } from './backup-v2'

const id = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const profile = () => migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
const fixture = async () => {
  const p = await profile()
  p.custom.css = `url(mnt-asset:${id})`
  return { activeProfileId: 'main', profiles: [p], assets: [{ id, blob: new Blob(['hello'], { type: 'image/png' }) }] }
}

describe('v2 backups', () => {
  it('round trips profiles and assets without history', async () => {
    const input = await fixture()
    const json = await serializeBackupV2(input)
    expect(JSON.parse(json)).toMatchObject({ kind: 'mnt.backup', backupVersion: 2, activeProfileId: 'main', assets: [{ id, mime: 'image/png', base64: 'aGVsbG8=' }] })
    expect(JSON.parse(json)).not.toHaveProperty('history')
    const result = await parseBackupV2(json)
    expect(result.profiles).toEqual(input.profiles)
    expect(result.assets[0].blob.type).toBe('image/png')
    expect(await result.assets[0].blob.arrayBuffer()).toEqual(await input.assets[0].blob.arrayBuffer())
  })

  it('rejects corrupted files, unknown fields and versions', async () => {
    const value = JSON.parse(await serializeBackupV2(await fixture()))
    for (const bad of ['{', JSON.stringify({ ...value, backupVersion: 3 }), JSON.stringify({ ...value, history: [] }), JSON.stringify({ ...value, kind: 'other' }), JSON.stringify({ ...value, exportedAt: 'no' })]) await expect(parseBackupV2(bad)).rejects.toThrow()
  })

  it('rejects malformed base64, unsupported mime, and wrong hashes', async () => {
    const value = JSON.parse(await serializeBackupV2(await fixture()))
    for (const asset of [{ ...value.assets[0], base64: 'YR==' }, { ...value.assets[0], base64: '%%%%' }, { ...value.assets[0], mime: 'image/gif' }, { ...value.assets[0], base64: 'd29ybGQ=' }, { ...value.assets[0], extra: 1 }]) await expect(parseBackupV2(JSON.stringify({ ...value, assets: [asset] }))).rejects.toThrow()
  })

  it('rejects missing and duplicate references', async () => {
    const value = JSON.parse(await serializeBackupV2(await fixture()))
    for (const bad of [{ ...value, assets: [] }, { ...value, activeProfileId: 'missing' }, { ...value, profiles: [...value.profiles, value.profiles[0]] }, { ...value, assets: [...value.assets, value.assets[0]] }]) await expect(parseBackupV2(JSON.stringify(bad))).rejects.toThrow()
  })

  it('rejects oversized individual and aggregate assets before decoding', async () => {
    const value = JSON.parse(await serializeBackupV2(await fixture()))
    const big = { ...value.assets[0], base64: 'A'.repeat(Math.ceil((MAX_BACKUP_ASSET_BYTES + 1) / 3) * 4) }
    await expect(parseBackupV2(JSON.stringify({ ...value, assets: [big] }))).rejects.toThrow()
    await expect(serializeBackupV2({ ...(await fixture()), assets: [{ id, blob: new Blob([new Uint8Array(MAX_BACKUP_ASSET_BYTES + 1)], { type: 'image/png' }) }] })).rejects.toThrow()
    const full = 'A'.repeat(MAX_BACKUP_ASSET_BYTES / 3 * 4 + 4 - (MAX_BACKUP_ASSET_BYTES / 3 * 4 + 4) % 4)
    const many = Array.from({ length: Math.floor(MAX_BACKUP_TOTAL_ASSET_BYTES / MAX_BACKUP_ASSET_BYTES) + 1 }, (_, i) => ({ id: i.toString(16).padStart(64, '0'), mime: 'image/png', base64: full }))
    await expect(parseBackupV2(JSON.stringify({ ...value, assets: many }))).rejects.toThrow(/total size/)
  })
})
