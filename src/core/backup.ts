import { MessageError, translate } from '../i18n'
import { loadSettings, saveSettings, readRawSettings, restoreRawSettings, type RawSettings } from '../storage/settings'
import { readWallpaper, writeWallpaper } from '../storage/wallpaper'
import { validate, type Settings } from './model'

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/

export type ParsedBackup = { exportedAt: string; settings: Settings; wallpaper?: Blob }
export type BackupStorage = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<void>
  readRawSettings?: () => Promise<RawSettings>
  restoreRawSettings?: (settings: RawSettings) => Promise<void>
  readWallpaper: () => Promise<Blob | undefined>
  writeWallpaper: (wallpaper: Blob | null) => Promise<void>
}

const defaultStorage: BackupStorage = { loadSettings, saveSettings, readRawSettings, restoreRawSettings, readWallpaper, writeWallpaper }

function decodeWallpaper(value: unknown): Blob {
  const invalid = () => new MessageError('error.backupWallpaper')
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_WALLPAPER_BYTES / 3) * 4 + 32) throw invalid()
  const match = DATA_URL.exec(value)
  if (!match) throw invalid()
  const [, type, encoded] = match
  if (!encoded || encoded.length % 4 !== 0) throw invalid()
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
  if (encoded.length / 4 * 3 - padding > MAX_WALLPAPER_BYTES) throw invalid()
  try {
    const binary = atob(encoded)
    if (btoa(binary) !== encoded) throw invalid()
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
    return new Blob([bytes], { type })
  } catch {
    throw invalid()
  }
}

function checkedSettings(value: unknown): Settings {
  let settings: Settings
  try {
    settings = validate(value)
  } catch (error) {
    const detail = error instanceof MessageError ? translate('en', error.key, error.params) : translate('en', 'error.settingsInvalid')
    throw new MessageError('error.backupSettings', { detail })
  }
  if (settings.wallpaper !== undefined) decodeWallpaper(settings.wallpaper)
  return settings
}

export function parseBackup(json: string): ParsedBackup {
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new MessageError('error.backupFile') }
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('kind' in value) || value.kind !== 'mnt.backup') throw new MessageError('error.backupKind')
  if (!('backupVersion' in value) || value.backupVersion !== 1) throw new MessageError('error.backupVersion')
  const record = value as Record<string, unknown>
  const settings = checkedSettings(record.settings)
  if (typeof record.exportedAt !== 'string' || !Number.isFinite(Date.parse(record.exportedAt))) throw new MessageError('error.backupFile')
  const wallpaper = record.wallpaper === undefined ? undefined : decodeWallpaper(record.wallpaper)
  return { exportedAt: record.exportedAt, settings, wallpaper }
}

export async function serializeBackup(settings: Settings, wallpaper?: Blob): Promise<string> {
  const checked = checkedSettings(settings)
  let encoded: string | undefined
  if (wallpaper !== undefined) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(wallpaper.type) || wallpaper.size === 0 || wallpaper.size > MAX_WALLPAPER_BYTES) throw new MessageError('error.backupWallpaper')
    encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new MessageError('error.backupWallpaper'))
      reader.onerror = () => reject(new MessageError('error.backupWallpaper'))
      reader.onabort = () => reject(new MessageError('error.backupWallpaper'))
      reader.readAsDataURL(wallpaper)
    })
  }
  return JSON.stringify({ kind: 'mnt.backup', backupVersion: 1, exportedAt: new Date().toISOString(), settings: checked, ...(encoded === undefined ? {} : { wallpaper: encoded }) })
}

export async function restoreBackup(backup: ParsedBackup, storage: BackupStorage = defaultStorage): Promise<void> {
  const rawStorage = storage.readRawSettings && storage.restoreRawSettings
    ? { read: storage.readRawSettings, restore: storage.restoreRawSettings }
    : undefined
  const [oldSettings, oldWallpaper] = await Promise.all([
    rawStorage ? rawStorage.read() : storage.loadSettings(), storage.readWallpaper(),
  ])
  try {
    await storage.saveSettings(backup.settings)
    await storage.writeWallpaper(backup.wallpaper ?? null)
  } catch {
    const rollback = await Promise.allSettled([
      Promise.resolve().then(() => rawStorage ? rawStorage.restore(oldSettings as RawSettings) : storage.saveSettings(oldSettings as Settings)),
      Promise.resolve().then(() => storage.writeWallpaper(oldWallpaper ?? null)),
    ])
    if (rollback.some(result => result.status === 'rejected')) throw new MessageError('error.backupRollback')
    throw new MessageError('error.backupWrite')
  }
}
