import { extensionApi } from '../platform/extension'
import { ICON_CACHE_KEY, ICON_STALE_TTL_MS, readIconCache } from './favicon'

const V2_KEY = 'mnt.iconCache:v2'
type V2Entry = {
  url?: string
  brand?: string
  width?: number
  height?: number
  svg?: boolean
  known?: boolean
  failed?: boolean
  savedAt: number
  expiresAt: number
}

/** A cached URL may cross origins only for the known table or this extension's own favicon endpoint. */
function isCacheableUrl(key: string, url: string, known?: boolean) {
  try {
    const parsed = new URL(url)
    if (parsed.origin === new URL(key).origin) return true
    const own = extensionApi()?.runtime?.getURL('/')
    return !!own && parsed.origin === new URL(own).origin && parsed.pathname.startsWith('/_favicon/')
  } catch { return !!known }
}

/** Moves fresh v2 entries from `storage.local` into the synchronous v3 cache, then deletes the old key. */
export async function migrateV2() {
  const storage = extensionApi()?.storage?.local
  if (!storage) return
  let raw: unknown
  try { raw = (await storage.get(V2_KEY))[V2_KEY] } catch { return }
  const source = raw as { version?: number; entries?: Record<string, V2Entry> } | null
  if (source?.version !== 2 || !source.entries) return
  const now = Date.now()
  const entries = { ...readIconCache() }
  let brands: typeof import('./knownBrands') | null = null
  for (const [key, value] of Object.entries(source.entries)) {
    if (entries[key] || !value || !/^https?:\/\//.test(key) || value.savedAt + ICON_STALE_TTL_MS <= now) continue
    if (value.failed) {
      if (value.expiresAt > now) entries[key] = { failed: true, failures: 1, savedAt: value.savedAt, expiresAt: value.expiresAt }
    } else if (value.brand) {
      brands ??= await import('./knownBrands')
      const brand = brands.knownBrand(value.brand)
      if (brand) entries[key] = { brand, savedAt: value.savedAt, expiresAt: value.expiresAt }
    } else if (value.url && isCacheableUrl(key, value.url, value.known)) {
      entries[key] = { url: value.url, width: value.width, height: value.height, svg: value.svg, known: value.known, savedAt: value.savedAt, expiresAt: value.expiresAt }
    }
  }
  try {
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(entries))
    await storage.remove?.([V2_KEY])
  } catch { /* Migration is best effort; discovery still runs. */ }
}
