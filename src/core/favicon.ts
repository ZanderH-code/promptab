import { extensionApi, isFirefoxExtension, type ExtensionApi } from '../platform/extension'

export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text) || (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text) && !/^localhost:\d/i.test(text))) return null
  try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null } catch { return null }
}
export const ICON_CACHE_KEY = 'mnt.iconCache:v3'
export const ICON_STALE_TTL_MS = 2592e6
export type IconCacheEntry = {
  url?: string
  brand?: { slug: string; title: string; path: string; hex: string }
  width?: number
  height?: number
  svg?: boolean
  known?: boolean
  failed?: boolean
  failures?: number
  savedAt: number
  expiresAt: number
  usedAt?: number
}
export type IconCache = Record<string, IconCacheEntry>
let rawCache = ''
let cache: IconCache = {}

/** Cache key: origin plus a known product path, or just the origin. */
export function faviconCacheKey(input: string): string | null {
  const normalized = normalizeUrl(input)
  if (!normalized) return null
  const url = new URL(normalized)
  return url.hostname === 'www.google.com' && /^\/maps(\/|$)/.test(url.pathname) ? url.origin + '/maps' : url.origin
}

/** Synchronous so the first render can paint from the cache; re-parses only when another tab wrote. */
export function readIconCache(): IconCache {
  let raw = ''
  try { raw = localStorage.getItem(ICON_CACHE_KEY) ?? '' } catch { /* Storage can be unavailable. */ }
  if (raw !== rawCache) {
    rawCache = raw
    try { cache = JSON.parse(raw) || {} } catch { cache = {} }
  }
  return cache
}

/** Fresh failures and stale successes are returned; entries older than the stale window are not. */
export function cachedFavicon(input: string): IconCacheEntry | null {
  const key = faviconCacheKey(input)
  const entry = key ? readIconCache()[key] : null
  if (!entry) return null
  const now = Date.now()
  return (entry.failed ? entry.expiresAt : entry.savedAt + ICON_STALE_TTL_MS) > now ? entry : null
}

export function initialFaviconSources(input: string, api = extensionApi(), firefox = isFirefoxExtension()) {
  const normalized = normalizeUrl(input)
  if (!normalized) return []
  return [browserFaviconUrl(normalized, api, firefox, 64), `${new URL(normalized).origin}/favicon.ico`].filter((value): value is string => !!value)
}
export function browserFaviconUrl(input: string, api = extensionApi(), firefox = isFirefoxExtension(), size: 64 | 128 = 64): string | null {
  const url = normalizeUrl(input)
  // `/_favicon/` is Chromium-specific. Firefox goes directly to the site's favicon fallback.
  if (firefox || !url || !api?.runtime?.getURL) return null
  const icon = new URL(api.runtime.getURL('/_favicon/'))
  icon.searchParams.set('pageUrl', url)
  icon.searchParams.set('size', String(size))
  return icon.href
}
