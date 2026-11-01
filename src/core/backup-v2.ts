import { MessageError } from '../i18n'
import { DEFAULT_MAX_ASSET_BYTES } from '../storage/assets'
import { parseProfileV2, type ProfileV2 } from './schema/profile'

export const MAX_BACKUP_ASSET_BYTES = DEFAULT_MAX_ASSET_BYTES
export const MAX_BACKUP_TOTAL_ASSET_BYTES = 50 * 1024 * 1024
const MAX_BACKUP_JSON_CHARS = 80 * 1024 * 1024
const mimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const assetId = /^[a-f0-9]{64}$/

export type BackupV2Asset = { id: string; blob: Blob }
export type BackupV2Input = { activeProfileId: string; profiles: ProfileV2[]; assets: BackupV2Asset[] }
export type ParsedBackupV2 = BackupV2Input & { exportedAt: string }
type EncodedAsset = { id: string; mime: string; base64: string }

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup object')
  const result = value as Record<string, unknown>
  if (Object.keys(result).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(result, key))) throw new Error('Invalid backup fields')
  return result
}

function checkProfiles(value: unknown, active: unknown): ProfileV2[] {
  if (!Array.isArray(value) || !value.length || typeof active !== 'string') throw new Error('Invalid profiles')
  const profiles = value.map(item => {
    const parsed = parseProfileV2(item)
    const rejectUnknown = (original: unknown, checked: unknown): void => {
      if (!original || typeof original !== 'object' || !checked || typeof checked !== 'object') return
      for (const [key, child] of Object.entries(original)) {
        if (!Object.hasOwn(checked, key)) throw new Error('Unknown profile field')
        rejectUnknown(child, (checked as Record<string, unknown>)[key])
      }
    }
    rejectUnknown(item, parsed)
    return parsed
  })
  const ids = new Set(profiles.map(profile => profile.meta.id))
  if (ids.size !== profiles.length || !ids.has(active)) throw new Error('Invalid profile IDs')
  return profiles
}

function checkReferences(profiles: ProfileV2[], ids: Set<string>): void {
  function visit(value: unknown): void {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/mnt-asset:([a-f0-9]{64})(?![a-zA-Z0-9])/g)) {
        if (!ids.has(match[1])) throw new Error(`Missing asset: ${match[1]}`)
      }
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) visit(child)
    }
  }
  profiles.forEach(visit)
}

async function hash(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}

function decode(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !value || value.length % 4 !== 0 || value.length > Math.ceil(MAX_BACKUP_ASSET_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid base64 asset')
  const binary = atob(value)
  if (binary.length > MAX_BACKUP_ASSET_BYTES || btoa(binary) !== value) throw new Error('Invalid base64 asset')
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

/** Validate a complete backup without modifying storage. */
export async function parseBackupV2(json: string): Promise<ParsedBackupV2> {
  if (typeof json !== 'string' || json.length > MAX_BACKUP_JSON_CHARS) throw new MessageError('error.settingsInvalid')
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new MessageError('error.backupFile') }
  try {
  return await parseBackupV2Value(value)
  } catch {
    throw new MessageError('error.settingsInvalid')
  }
}

async function parseBackupV2Value(value: unknown): Promise<ParsedBackupV2> {
  const raw = record(value, ['kind', 'backupVersion', 'exportedAt', 'activeProfileId', 'profiles', 'assets'])
  if (raw.kind !== 'mnt.backup' || raw.backupVersion !== 2 || typeof raw.exportedAt !== 'string' || !Number.isFinite(Date.parse(raw.exportedAt))) throw new Error('Invalid backup header')
  const profiles = checkProfiles(raw.profiles, raw.activeProfileId)
  if (!Array.isArray(raw.assets)) throw new Error('Invalid assets')
  const ids = new Set<string>()
  let total = 0
  const encoded = raw.assets.map(value => {
    const item = record(value, ['id', 'mime', 'base64'])
    if (typeof item.id !== 'string' || !assetId.test(item.id) || ids.has(item.id) || typeof item.mime !== 'string' || !mimeTypes.has(item.mime) || typeof item.base64 !== 'string') throw new Error('Invalid asset')
    ids.add(item.id)
    if (!item.base64 || item.base64.length > Math.ceil(MAX_BACKUP_ASSET_BYTES / 3) * 4) throw new Error('Asset exceeds size limit')
    const padding = item.base64.endsWith('==') ? 2 : item.base64.endsWith('=') ? 1 : 0
    total += Math.floor(item.base64.length * 3 / 4) - padding
    if (total > MAX_BACKUP_TOTAL_ASSET_BYTES) throw new Error('Assets exceed total size limit')
    return item as EncodedAsset
  })
  checkReferences(profiles, ids)
  total = 0
  const assets: BackupV2Asset[] = []
  for (const item of encoded) {
    const bytes = decode(item.base64)
    total += bytes.length
    if (total > MAX_BACKUP_TOTAL_ASSET_BYTES || await hash(bytes) !== item.id) throw new Error('Invalid asset hash or total size')
    assets.push({ id: item.id, blob: new Blob([bytes], { type: item.mime }) })
  }
  return { exportedAt: raw.exportedAt, activeProfileId: raw.activeProfileId as string, profiles, assets }
}

/** Serialize profiles and assets, validating the same invariants as import. */
export async function serializeBackupV2(input: BackupV2Input): Promise<string> {
  const profiles = checkProfiles(input.profiles, input.activeProfileId)
  if (!Array.isArray(input.assets)) throw new Error('Invalid assets')
  let total = 0
  const assets: EncodedAsset[] = []
  for (const item of input.assets) {
    if (!item || typeof item.id !== 'string' || !assetId.test(item.id) || !(item.blob instanceof Blob) || !mimeTypes.has(item.blob.type) || !item.blob.size || item.blob.size > MAX_BACKUP_ASSET_BYTES) throw new Error('Invalid asset')
    total += item.blob.size
    if (total > MAX_BACKUP_TOTAL_ASSET_BYTES) throw new Error('Assets exceed total size limit')
    const bytes = new Uint8Array(await item.blob.arrayBuffer())
    assets.push({ id: item.id, mime: item.blob.type, base64: encode(bytes) })
  }
  const json = JSON.stringify({ kind: 'mnt.backup', backupVersion: 2, exportedAt: new Date().toISOString(), activeProfileId: input.activeProfileId, profiles, assets })
  await parseBackupV2(json)
  return json
}
