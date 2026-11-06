import { extensionApi, isFirefoxExtension, type ExtensionApi } from '../platform/extension'

export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text) || (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text) && !/^localhost:\d/i.test(text))) return null
  try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null } catch { return null }
}
export const ICON_CACHE_KEY = 'mnt.iconCache:v2'

export function faviconUrl(input: string): string | null { const url = normalizeUrl(input); return url ? `${new URL(url).origin}/favicon.ico` : null }
export function initialFaviconSources(input: string, api = extensionApi(), firefox = isFirefoxExtension()) {
  const normalized = normalizeUrl(input)
  if (!normalized) return []
  const internal = browserFaviconUrl(normalized, api, firefox, 64)
  return [...new Set([internal, faviconUrl(normalized)].filter((value): value is string => !!value))]
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
