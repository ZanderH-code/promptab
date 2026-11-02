import { parseProfileV2, type ProfileV2 } from './schema/profile'

export const SYNC_MAX_ITEM_BYTES = 3_500
export const SYNC_MAX_TOTAL_BYTES = 45_000
const SYNC_KIND = 'mnt.profile-sync'
const SYNC_VERSION = 1

type SyncedTheme = Omit<ProfileV2['theme'], 'font'>
type SyncedBookmarkGroup = Omit<ProfileV2['bookmarks']['groups'][number], 'items'> & {
  items: Omit<ProfileV2['bookmarks']['groups'][number]['items'][number], 'image'>[]
}
export type SyncPayload = {
  kind: typeof SYNC_KIND
  version: typeof SYNC_VERSION
  profile: {
    meta: ProfileV2['meta']
    prefs: ProfileV2['prefs']
    theme: SyncedTheme
    layout: ProfileV2['layout']
    bookmarks: { groups: SyncedBookmarkGroup[] }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

/** Build the browser-sync projection. Asset-backed wallpaper, icon and font data stays on-device. */
export function toSyncPayload(profile: ProfileV2): SyncPayload {
  const { font: _font, ...theme } = structuredClone(profile.theme)
  const groups = profile.bookmarks.groups.map(group => ({
    ...structuredClone(group),
    items: group.items.map(item => {
      const { image: _image, ...bookmark } = structuredClone(item)
      return bookmark
    }),
  }))
  return {
    kind: SYNC_KIND,
    version: SYNC_VERSION,
    profile: {
      meta: structuredClone(profile.meta),
      prefs: structuredClone(profile.prefs),
      theme,
      layout: structuredClone(profile.layout),
      bookmarks: { groups },
    },
  }
}

export function serializeSyncPayload(profile: ProfileV2): string {
  return JSON.stringify(toSyncPayload(profile))
}

/** Validate the sync envelope; the merged profile is fully schema-validated before use. */
export function parseSyncPayload(json: string): SyncPayload {
  let raw: unknown
  try { raw = JSON.parse(json) } catch { throw new Error('Invalid sync payload') }
  if (!isRecord(raw) || raw.kind !== SYNC_KIND || raw.version !== SYNC_VERSION || !isRecord(raw.profile)) throw new Error('Invalid sync payload')
  const profile = raw.profile
  if (!isRecord(profile.meta) || typeof profile.meta.id !== 'string' || typeof profile.meta.updatedAt !== 'string' || !Number.isFinite(Date.parse(profile.meta.updatedAt)) ||
      !isRecord(profile.prefs) || !isRecord(profile.theme) || !isRecord(profile.layout) || !isRecord(profile.bookmarks) || !Array.isArray(profile.bookmarks.groups)) {
    throw new Error('Invalid sync payload')
  }
  return raw as unknown as SyncPayload
}

/** Apply the sync projection while retaining device-local wallpaper, fonts and icon assets. */
export function mergeSyncedProfile(local: ProfileV2, payload: SyncPayload): ProfileV2 {
  const incoming = payload.profile
  const localImages = new Map(local.bookmarks.groups.flatMap(group => group.items.map(item => [item.id, item.image] as const)))
  const groups = incoming.bookmarks.groups.map(group => ({
    ...structuredClone(group),
    items: group.items.map(item => {
      const image = localImages.get(item.id)
      return image ? { ...structuredClone(item), image } : structuredClone(item)
    }),
  }))
  const merged = {
    ...structuredClone(local),
    meta: { ...structuredClone(local.meta), updatedAt: incoming.meta.updatedAt },
    prefs: structuredClone(incoming.prefs),
    theme: { ...structuredClone(incoming.theme), font: structuredClone(local.theme.font) },
    layout: structuredClone(incoming.layout),
    bookmarks: { groups },
  }
  return parseProfileV2(merged)
}

export type SyncConflictDecision = 'keep-local' | 'pull-cloud'

export function decideSyncConflict(localUpdatedAt: string, cloudUpdatedAt: string): SyncConflictDecision {
  const localTime = Date.parse(localUpdatedAt)
  const cloudTime = Date.parse(cloudUpdatedAt)
  return Number.isFinite(localTime) && Number.isFinite(cloudTime) && cloudTime > localTime ? 'pull-cloud' : 'keep-local'
}

/** Split UTF-8 text without breaking code points and reject payloads beyond the conservative quota. */
export function chunkSyncPayload(payload: string): string[] {
  const encoder = new TextEncoder()
  const chunks: string[] = []
  let current = ''
  let currentBytes = 0
  let totalBytes = 0
  for (const character of payload) {
    const bytes = encoder.encode(character).length
    totalBytes += bytes
    if (totalBytes > SYNC_MAX_TOTAL_BYTES) throw new Error('Sync quota exceeded')
    if (currentBytes + bytes > SYNC_MAX_ITEM_BYTES) {
      chunks.push(current)
      current = ''
      currentBytes = 0
    }
    current += character
    currentBytes += bytes
  }
  if (current) chunks.push(current)
  if (chunks.length > 20) throw new Error('Sync quota exceeded')
  return chunks
}

const SYNC_MANIFEST_KEY = 'mnt.sync.manifest'
const SYNC_CHUNK_PREFIX = 'mnt.sync.chunk.'

type SyncStorage = {
  get(keys: string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, string>): Promise<void>
  remove(keys: string[]): Promise<void>
}

function storageBytes(items: Record<string, unknown>): number {
  const encoder = new TextEncoder()
  return Object.entries(items).reduce((total, [key, value]) => total + encoder.encode(JSON.stringify({ [key]: value })).length, 0)
}

/** Read the compact profile from extension sync storage, or null when this device has no snapshot. */
export async function readSyncStorage(storage: SyncStorage): Promise<SyncPayload | null> {
  const values = await storage.get(null)
  const rawManifest = values[SYNC_MANIFEST_KEY]
  if (rawManifest === undefined) return null
  let manifest: unknown
  try { manifest = JSON.parse(String(rawManifest)) } catch { throw new Error('Invalid sync manifest') }
  if (!isRecord(manifest) || manifest.version !== SYNC_VERSION || typeof manifest.count !== 'number' || !Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 20) throw new Error('Invalid sync manifest')
  const keys = Array.from({ length: manifest.count as number }, (_, index) => `${SYNC_CHUNK_PREFIX}${index}`)
  const missing = keys.filter(key => typeof values[key] !== 'string')
  if (missing.length) throw new Error('Incomplete sync payload')
  return parseSyncPayload(keys.map(key => values[key] as string).join(''))
}

/** Store a compact profile only when both per-item and total sync quotas can be respected. */
export async function writeSyncStorage(storage: SyncStorage, profile: ProfileV2): Promise<void> {
  const chunks = chunkSyncPayload(serializeSyncPayload(profile))
  const values = await storage.get(null)
  const ownKeys = Object.keys(values).filter(key => key === SYNC_MANIFEST_KEY || key.startsWith(SYNC_CHUNK_PREFIX))
  const items = Object.fromEntries(chunks.map((chunk, index) => [`${SYNC_CHUNK_PREFIX}${index}`, chunk])) as Record<string, string>
  for (const [key, value] of Object.entries(items)) {
    if (storageBytes({ [key]: value }) > 8_192) throw new Error('Sync item quota exceeded')
  }
  const manifest = { version: SYNC_VERSION, count: chunks.length }
  const nextSize = storageBytes({ ...values, ...items, [SYNC_MANIFEST_KEY]: JSON.stringify(manifest) })
  if (nextSize > 100_000) throw new Error('Sync total quota exceeded')
  await storage.set(items)
  await storage.set({ [SYNC_MANIFEST_KEY]: JSON.stringify(manifest) })
  const stale = ownKeys.filter(key => key.startsWith(SYNC_CHUNK_PREFIX) && Number(key.slice(SYNC_CHUNK_PREFIX.length)) >= chunks.length)
  if (stale.length) await storage.remove(stale)
}
