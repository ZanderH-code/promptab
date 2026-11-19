import { describe, expect, it } from 'vitest'
import { defaults } from './model'
import { parseBackup } from './backup'

const limit = 5 * 1024 * 1024
const data = (wallpaper?: unknown) => JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', settings: defaults, ...(wallpaper === undefined ? {} : { wallpaper }) })
const key = (fn: () => unknown, expected: string) => expect(fn).toThrow(expect.objectContaining({ key: expected }))

describe('backup core', () => {
  it('reads settings and an optional wallpaper', () => {
    const parsed = parseBackup(data('data:image/webp;base64,aGVsbG8='))
    expect(parsed.settings).toEqual(defaults)
    expect(parsed.exportedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(parsed.wallpaper?.type).toBe('image/webp')
    expect(parsed.wallpaper?.size).toBe(5)
    expect(parseBackup(data()).wallpaper).toBeUndefined()
  })

  it('rejects malformed JSON, incorrect kind and unsupported version', () => {
    key(() => parseBackup('{'), 'error.backupFile')
    key(() => parseBackup(JSON.stringify({ kind: 'other', backupVersion: 1 })), 'error.backupKind')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 2 })), 'error.backupVersion')
  })

  it('keeps validation details localizable', () => {
    try {
      parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: { ...defaults, columns: 99 } }))
      throw new Error('expected validation failure')
    } catch (error) {
      expect(error).toMatchObject({ key: 'error.settingsInvalid' })
    }
  })

  it('rejects invalid settings', () => {
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: { ...defaults, columns: 99 } })), 'error.settingsInvalid')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: null })), 'error.settingsInvalid')
  })

  it('rejects invalid wallpaper MIME, malformed base64 and oversized data', () => {
    for (const image of ['data:image/gif;base64,YQ==', 'data:image/png;base64,YQ=', 'data:image/png;base64,YQ==junk', 'data:image/png;base64,YR==', 'data:image/png;base64,']) {
      key(() => parseBackup(data(image)), 'error.backupWallpaper')
    }
    key(() => parseBackup(data(`data:image/png;base64,${'A'.repeat(Math.ceil((limit + 1) / 3) * 4)}`)), 'error.backupWallpaper')
    key(() => parseBackup(JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, settings: { ...defaults, wallpaper: 'data:image/png;base64,%%%%' } })), 'error.backupWallpaper')
  })
})
