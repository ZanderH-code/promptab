import { describe, expect, it, vi } from 'vitest'
import { defaults } from './model'
import { parseBackup, restoreBackup, serializeBackup, type BackupStorage } from './backup'

const limit = 5 * 1024 * 1024
const data = (wallpaper?: unknown) => JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', settings: defaults, ...(wallpaper === undefined ? {} : { wallpaper }) })
const key = (fn: () => unknown, expected: string) => expect(fn).toThrow(expect.objectContaining({ key: expected }))

function storage(): BackupStorage {
  return {
    loadSettings: vi.fn().mockResolvedValue(defaults),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    readWallpaper: vi.fn().mockResolvedValue(new Blob(['old'], { type: 'image/png' })),
    writeWallpaper: vi.fn().mockResolvedValue(undefined),
  }
}

describe('backup core', () => {
  it('round trips settings and optional wallpaper', async () => {
    const image = new Blob(['hello'], { type: 'image/webp' })
    const parsed = parseBackup(await serializeBackup(defaults, image))
    expect(parsed.settings).toEqual(defaults)
    expect(parsed.exportedAt).toEqual(expect.any(String))
    expect(parsed.wallpaper?.type).toBe('image/webp')
    expect(JSON.parse(await serializeBackup(parsed.settings, parsed.wallpaper)).wallpaper).toBe('data:image/webp;base64,aGVsbG8=')
    expect(parseBackup(await serializeBackup(defaults)).wallpaper).toBeUndefined()
  })

  it('rejects malformed JSON, incorrect kind and unsupported version', () => {
    key(() => parseBackup('{'), 'error.backupFile')
    key(() => parseBackup(JSON.stringify({ kind: 'other', backupVersion: 1 })), 'error.backupKind')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 2 })), 'error.backupVersion')
  })

  it('rejects invalid settings', () => {
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: { ...defaults, columns: 99 } })), 'error.backupSettings')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: null })), 'error.backupSettings')
  })

  it('rejects invalid wallpaper MIME, malformed base64 and oversized data', async () => {
    for (const image of ['data:image/gif;base64,YQ==', 'data:image/png;base64,YQ=', 'data:image/png;base64,YQ==junk', 'data:image/png;base64,YR==', 'data:image/png;base64,']) {
      key(() => parseBackup(data(image)), 'error.backupWallpaper')
    }
    key(() => parseBackup(data(`data:image/png;base64,${'A'.repeat(Math.ceil((limit + 1) / 3) * 4)}`)), 'error.backupWallpaper')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: { ...defaults, wallpaper: 'data:image/png;base64,%%%%' } })), 'error.backupWallpaper')
    await expect(serializeBackup(defaults, new Blob(['x'], { type: 'image/gif' }))).rejects.toMatchObject({ key: 'error.backupWallpaper' })
    await expect(serializeBackup(defaults, new Blob([new Uint8Array(limit + 1)], { type: 'image/png' }))).rejects.toMatchObject({ key: 'error.backupWallpaper' })
  })

  it.each(['settings', 'wallpaper'])('restores both old values when %s write fails', async failed => {
    const boundary = storage()
    const oldWallpaper = await boundary.readWallpaper()
    const write = failed === 'settings' ? vi.mocked(boundary.saveSettings) : vi.mocked(boundary.writeWallpaper)
    write.mockRejectedValueOnce(new Error('write failed'))
    const backup = parseBackup(data('data:image/png;base64,bmV3'))
    backup.settings = { ...backup.settings, accent: '#abcdef', shortcuts: [] }
    await expect(restoreBackup(backup, boundary)).rejects.toMatchObject({ key: 'error.backupWrite' })
    expect(boundary.saveSettings).toHaveBeenLastCalledWith(defaults)
    expect(boundary.writeWallpaper).toHaveBeenLastCalledWith(oldWallpaper)
  })

  it('attempts both rollback writes even when one rollback fails', async () => {
    const boundary = storage()
    vi.mocked(boundary.saveSettings).mockRejectedValueOnce(new Error('write')).mockRejectedValueOnce(new Error('rollback'))
    await expect(restoreBackup(parseBackup(data()), boundary)).rejects.toMatchObject({ key: 'error.backupRollback' })
    expect(boundary.writeWallpaper).toHaveBeenCalledTimes(1)
  })

  it('removes old wallpaper when the backup omits it', async () => {
    const boundary = storage()
    await restoreBackup(parseBackup(data()), boundary)
    expect(boundary.writeWallpaper).toHaveBeenCalledWith(null)
  })
})
