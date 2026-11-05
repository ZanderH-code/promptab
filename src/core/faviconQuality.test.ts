import { describe, expect, it } from 'vitest'
import {
  ICON_CACHE_LIMIT,
  ICON_CACHE_TTL_MS,
  ICON_NEGATIVE_TTL_MS,
  chooseBestIcon,
  faviconCandidates,
  isCacheEntryFresh,
  isDefaultGlobeFingerprint,
  isUsableIcon,
  trimCacheEntries,
  type FaviconCandidate,
} from './faviconQuality'

describe('favicon quality candidates', () => {
  const api = { runtime: { getURL: (path: string) => `chrome-extension://test${path}` } }

  it('orders Chromium sizes before same-origin touch, SVG, PNG and ICO sources', () => {
    const candidates = faviconCandidates('https://example.com/a/b?q=1', api, false)
    expect(candidates.map(candidate => candidate.sourceType)).toEqual([
      'chrome-_favicon-128', 'chrome-_favicon-64', 'apple-touch-icon', 'apple-touch-icon-precomposed',
      'favicon.svg', 'favicon-32x32.png', 'favicon.ico',
    ])
    expect(candidates[0]?.url).toContain('size=128')
    expect(candidates[1]?.url).toContain('size=64')
    expect(candidates.slice(2).map(candidate => new URL(candidate.url).origin)).toEqual(Array(5).fill('https://example.com'))
  })

  it('omits the Chromium endpoint in Firefox and deduplicates identical candidate URLs', () => {
    const firefox = faviconCandidates('https://example.com/path', api, true)
    expect(firefox.map(candidate => candidate.sourceType)).toEqual([
      'apple-touch-icon', 'apple-touch-icon-precomposed', 'favicon.svg', 'favicon-32x32.png', 'favicon.ico',
    ])
    expect(new Set(firefox.map(candidate => candidate.url)).size).toBe(firefox.length)
  })

  it('rejects invalid URLs and never adds another origin', () => {
    expect(faviconCandidates('javascript:alert(1)', api, false)).toEqual([])
    expect(faviconCandidates('https://example.com/path', api, false).some(candidate => candidate.url.includes('google'))).toBe(false)
  })
})

describe('favicon quality selection and cache rules', () => {
  const icon = (url: string, width: number, svg = false): FaviconCandidate => ({
    url, sourceType: svg ? 'favicon.svg' : 'favicon.ico', naturalWidth: width, naturalHeight: width,
    clarity: 'blurry', svg,
  })

  it('matches the browser globe by pixel fingerprint, including the rendered dimensions', () => {
    const defaults = new Set(['64x64:deadbeef', '128x128:feed1234'])
    expect(isDefaultGlobeFingerprint('64x64:deadbeef', defaults)).toBe(true)
    expect(isDefaultGlobeFingerprint('32x32:deadbeef', defaults)).toBe(false)
  })

  it('rejects placeholders, 1×1 and fully transparent images', () => {
    expect(isUsableIcon(1, 1)).toBe(false)
    expect(isUsableIcon(64, 64, true)).toBe(false)
    expect(isUsableIcon(64, 64, false, true)).toBe(false)
    expect(isUsableIcon(32, 32)).toBe(true)
  })

  it('chooses the largest natural image and treats SVG as infinitely scalable', () => {
    const candidates = [icon('/small.png', 32), icon('/large.png', 128), icon('/favicon.svg', 24, true)]
    expect(chooseBestIcon(candidates)?.url).toBe('/favicon.svg')
    expect(chooseBestIcon(candidates.slice(0, 2))?.url).toBe('/large.png')
  })

  it('uses seven-day positive and six-hour negative cache TTLs', () => {
    expect(ICON_CACHE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(ICON_NEGATIVE_TTL_MS).toBe(6 * 60 * 60 * 1000)
    const entry = { url: '/favicon.ico', savedAt: 1_000, expiresAt: 2_000 }
    expect(isCacheEntryFresh(entry, 1_999)).toBe(true)
    expect(isCacheEntryFresh(entry, 2_000)).toBe(false)
  })

  it('keeps only the newest cache entries within the configured capacity', () => {
    const entries = Object.fromEntries(Array.from({ length: ICON_CACHE_LIMIT + 20 }, (_, index) => [
      `https://site-${index}.test`, { savedAt: index, expiresAt: 10_000 },
    ]))
    const trimmed = trimCacheEntries(entries)
    expect(Object.keys(trimmed)).toHaveLength(ICON_CACHE_LIMIT)
    expect(trimmed['https://site-275.test']?.savedAt).toBe(275)
    expect(trimmed['https://site-0.test']).toBeUndefined()
  })
})
