import { MessageError } from '../i18n'
import { validate, type Settings } from './model'
import '../i18n/lazy'

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/

export type ParsedBackup = { exportedAt: string; settings: Settings; wallpaper?: Blob }

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
    throw error instanceof MessageError ? error : new MessageError('error.settingsInvalid')
  }
  if (settings.wallpaper !== undefined) decodeWallpaper(settings.wallpaper)
  return settings
}

export function parseBackup(json: string): ParsedBackup {
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new MessageError('error.backupFile') }
  return parseBackupValue(value)
}

/** Validates an already parsed v1 backup file. */
export function parseBackupValue(value: unknown): ParsedBackup {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('kind' in value) || value.kind !== 'mnt.backup') throw new MessageError('error.backupKind')
  if (!('backupVersion' in value) || value.backupVersion !== 1) throw new MessageError('error.backupVersion')
  const record = value as Record<string, unknown>
  const settings = checkedSettings(record.settings)
  if (typeof record.exportedAt !== 'string' || !Number.isFinite(Date.parse(record.exportedAt))) throw new MessageError('error.settingsInvalid')
  const wallpaper = record.wallpaper === undefined ? undefined : decodeWallpaper(record.wallpaper)
  return { exportedAt: record.exportedAt, settings, wallpaper }
}
