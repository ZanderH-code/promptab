// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defaults } from './model'
import { migrateV1 } from './migrate/v1'
import { mergeBackupProfile, parseBackupV2, serializeBackupV2, MAX_BACKUP_ASSET_BYTES, MAX_BACKUP_TOTAL_ASSET_BYTES, MAX_BACKUP_VIDEO_BYTES } from './backup-v2'

const id = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const profile = () => migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
const fixture = async () => {
  const p = await profile()
  p.custom.css = `url(mnt-asset:${id})`
  return { activeProfileId: 'main', profiles: [p], assets: [{ id, blob: new Blob(['hello'], { type: 'image/png' }) }] }
}

describe('v2 backups', () => {
  it.each(['bookmarks', 'appearance', 'layout', 'settings'] as const)('restores only the selected %s profile fields', async part => {
    const current = await profile()
    const incoming = structuredClone(current)
    incoming.bookmarks.groups[0].name = 'Incoming bookmarks'
    incoming.theme.mode = 'light'
    incoming.background.dim = 42
    incoming.custom.css = 'body { color: red }'
    incoming.layout.gap = 33
    incoming.widgets[0].hidden = true
    incoming.prefs.language = 'en'
    incoming.search.engines[0].name = 'Incoming search'
    const selection = { bookmarks: false, appearance: false, layout: false, settings: false, [part]: true }
    const result = mergeBackupProfile(current, incoming, selection)
    for (const [key, group] of Object.entries({ bookmarks: 'bookmarks', theme: 'appearance', background: 'appearance', custom: 'appearance', layout: 'layout', widgets: 'layout', prefs: 'settings', search: 'settings' }) as [keyof typeof current, string][]) {
      expect(result[key]).toEqual(group === part ? incoming[key] : current[key])
    }
    expect(result.meta).toEqual(current.meta)
  })

  it('round trips a bounded theme library as part of the backup', async () => {
    const input = await fixture()
    const theme = { id: 'theme-1', name: 'Warm Study', savedAt: '2026-01-01T00:00:00Z', pack: { kind: 'mnt.theme-pack', packVersion: 2, meta: { name: 'Warm Study' }, theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#eeeae5', accent: '#90d5cd' } } } }
    const json = await serializeBackupV2({ ...input, themes: [theme] as never[] })
    expect((await parseBackupV2(json)).themes.map(item => item.name)).toEqual(['Warm Study'])
    await expect(serializeBackupV2({ ...input, themes: Array.from({ length: 51 }, (_, index) => ({ ...theme, id: `theme-${index}` })) as never[] })).rejects.toThrow()
  })

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

  it('round trips video wallpaper assets and enforces the larger video limit', async () => {
    const input = await fixture()
    const bytes = new TextEncoder().encode('webm sample')
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const videoId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    input.profiles[0].background = { type: 'video', dim: 20, video: { asset: `mnt-asset:${videoId}`, poster: `mnt-asset:${id}`, blur: 0, grayscale: 0 } }
    input.assets.push({ id: videoId, blob: new Blob([bytes], { type: 'video/webm' }) })
    const parsed = await parseBackupV2(await serializeBackupV2(input))
    expect(parsed.profiles[0].background.video?.asset).toBe(`mnt-asset:${videoId}`)
    expect(parsed.assets.find(asset => asset.id === videoId)?.blob.type).toBe('video/webm')
    const oversized = new Blob([new Uint8Array(MAX_BACKUP_VIDEO_BYTES + 1)], { type: 'video/mp4' })
    await expect(serializeBackupV2({ ...(await fixture()), assets: [{ id: '0'.repeat(64), blob: oversized }] })).rejects.toThrow()
  })

  it('rejects MIME types that do not match wallpaper asset references', async () => {
    const input = await fixture()
    const bytes = new TextEncoder().encode('webm sample')
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const videoId = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    input.profiles[0].background = { type: 'video', dim: 20, video: { asset: `mnt-asset:${videoId}`, poster: `mnt-asset:${id}`, blur: 0, grayscale: 0 } }
    input.assets.push({ id: videoId, blob: new Blob([bytes], { type: 'video/webm' }) })
    const value = JSON.parse(await serializeBackupV2(input))
    const wrongVideoMime = { ...value, assets: value.assets.map((item: { id: string }) => item.id === videoId ? { ...item, mime: 'image/png' } : item) }
    const wrongPosterMime = { ...value, assets: value.assets.map((item: { id: string }) => item.id === id ? { ...item, mime: 'video/webm' } : item) }
    await expect(parseBackupV2(JSON.stringify(wrongVideoMime))).rejects.toThrow()
    await expect(parseBackupV2(JSON.stringify(wrongPosterMime))).rejects.toThrow()
  })

  it('distinguishes malformed JSON from invalid backup structure', async () => {
    await expect(parseBackupV2('{')).rejects.toMatchObject({ key: 'error.backupFile' })
    await expect(parseBackupV2('{}')).rejects.toMatchObject({ key: 'error.settingsInvalid' })
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
    await expect(parseBackupV2(JSON.stringify({ ...value, assets: many }))).rejects.toMatchObject({ key: 'error.settingsInvalid' })
  })
})
