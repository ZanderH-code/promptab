import { describe, expect, it } from 'vitest'
import {
  ICON_CACHE_LIMIT,
  ICON_CACHE_TTL_MS,
  ICON_NEGATIVE_TTL_MS,
  chooseBestIcon,
  faviconCacheKey,
  faviconCandidates,
  isCacheEntryFresh,
  isKnownHost,
  isUsableIcon,
  trimCacheEntries,
  type FaviconCandidate,
} from './faviconQuality'
import { estimateEffectiveWidth, isDefaultGlobeFingerprint, resolveIconResult, sources } from './faviconExtras'
import { ICON_CACHE_KEY } from './favicon'
import { iconCacheKey, isAllowedIconUrl, knownIconFor } from './knownIcons'

const MAPS_ICON = 'https://www.gstatic.com/images/branding/productlogos/maps_2025_round/v1/web-512dp/logo_maps_2025_round_color_1x_web_512dp.png'

function randomPixels(size: number) {
  const pixels = new Uint8ClampedArray(size * size * 4)
  let seed = 123456789
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    pixels[i] = seed & 255
    pixels[i + 1] = (seed >> 8) & 255
    pixels[i + 2] = (seed >> 16) & 255
    pixels[i + 3] = 255
  }
  return pixels
}

function upscale(source: Uint8ClampedArray, sourceSize: number, factor: number) {
  const size = sourceSize * factor
  const pixels = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = ((Math.floor(y / factor) * sourceSize) + Math.floor(x / factor)) * 4
      const to = (y * size + x) * 4
      for (let channel = 0; channel < 4; channel++) pixels[to + channel] = source[from + channel]!
    }
  }
  return pixels
}

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

  it('adds bundled known URLs as extra candidates for their sites only', () => {
    expect(sources('https://chatgpt.com/').find(candidate => candidate.sourceType === 'known')?.url).toBe('https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png')
    expect(sources('https://not-known.example.test/')).toEqual([])
    const base = faviconCandidates('https://chatgpt.com/', api, false)
    expect(base.some(candidate => candidate.sourceType === 'known')).toBe(false)
    expect(base.every(candidate => candidate.url.startsWith('chrome-extension://test/') || new URL(candidate.url).origin === 'https://chatgpt.com')).toBe(true)
  })
})

describe('effective resolution detection', () => {
  it('reports the source width of a nearest-neighbor upscaled bitmap', () => {
    expect(estimateEffectiveWidth(upscale(randomPixels(32), 32, 4), 128, 128)).toBe(32)
    expect(estimateEffectiveWidth(upscale(randomPixels(64), 64, 2), 128, 128)).toBe(64)
  })

  it('keeps a genuinely detailed bitmap and a flat colour at full size', () => {
    expect(estimateEffectiveWidth(randomPixels(128), 128, 128)).toBe(128)
    const flat = new Uint8ClampedArray(128 * 128 * 4).fill(255)
    expect(estimateEffectiveWidth(flat, 128, 128)).toBe(128)
  })

  it('ignores images too small to measure', () => {
    expect(estimateEffectiveWidth(new Uint8ClampedArray(4), 2, 2)).toBe(2)
  })
})

describe('favicon quality selection and cache rules', () => {
  const icon = (url: string, width: number, svg = false): FaviconCandidate => ({
    url, sourceType: svg ? 'favicon.svg' : 'favicon.ico', naturalWidth: width, naturalHeight: width,
    effectiveWidth: width, clarity: 'blurry', svg,
  })
  const chromeIcon = (width: number, effectiveWidth = width): FaviconCandidate => ({
    url: `chrome-extension://test/_favicon/?size=${width}`, sourceType: 'chrome-_favicon-128', naturalWidth: width,
    naturalHeight: width, effectiveWidth, clarity: 'blurry', svg: false,
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

  it('scores an upscaled Chromium bitmap by its effective width, so a real icon wins', () => {
    const upscaled = chromeIcon(128, 32)
    const real = { ...icon('https://site.test/apple-touch-icon-precomposed.png', 128), sourceType: 'apple-touch-icon-precomposed' }
    expect(chooseBestIcon([upscaled, real])?.url).toBe(real.url)
    expect(chooseBestIcon([real, upscaled])?.url).toBe(real.url)
    expect(chooseBestIcon([upscaled])?.effectiveWidth).toBe(32)
  })

  it('prefers a real site file when it ties with the Chromium endpoint', () => {
    const real = { ...icon('https://site.test/apple-touch-icon.png', 128), sourceType: 'apple-touch-icon' }
    expect(chooseBestIcon([chromeIcon(128), real])?.url).toBe(real.url)
    expect(chooseBestIcon([real, chromeIcon(128)])?.url).toBe(real.url)
  })

  it('falls back to a bundled brand mark for missing or blurry results and when preferred', () => {
    expect(resolveIconResult(null, 'https://www.youtube.com')?.brand?.slug).toBe('youtube')
    expect(resolveIconResult(chromeIcon(128, 32), 'https://www.youtube.com', 64)?.brand?.slug).toBe('youtube')
    expect(resolveIconResult(icon('/sharp.png', 128), 'https://www.youtube.com', 64)?.url).toBe('/sharp.png')
    expect(resolveIconResult(icon('/sharp.png', 128), 'https://dify.ai', 64)?.brand?.slug).toBe('dify')
    expect(resolveIconResult(null, 'https://example.com')).toBeNull()
  })

  it('uses seven-day positive and one-hour negative cache TTLs in the v2 cache', () => {
    expect(ICON_CACHE_KEY).toBe('mnt.iconCache:v2')
    expect(ICON_CACHE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(ICON_NEGATIVE_TTL_MS).toBe(60 * 60 * 1000)
    const entry = { url: '/favicon.ico', savedAt: 1_000, expiresAt: 2_000 }
    expect(isCacheEntryFresh(entry, 1_999)).toBe(true)
    expect(isCacheEntryFresh(entry, 2_000)).toBe(false)
  })

  it('keys known product paths separately while other sites keep the origin', () => {
    expect(faviconCacheKey('https://www.google.com/maps')).toBe('https://www.google.com/maps')
    expect(faviconCacheKey('https://www.google.com/maps/dir/1')).toBe('https://www.google.com/maps')
    expect(faviconCacheKey('https://www.google.com/search?q=map')).toBe('https://www.google.com')
    expect(faviconCacheKey('https://example.com/a/b')).toBe('https://example.com')
    expect(faviconCacheKey('not a url')).toBeNull()
    expect(faviconCacheKey('https://www.google.com/maps')).toBe(iconCacheKey('https://www.google.com/maps'))
    expect(isKnownHost('gemini.google.com')).toBe(true)
    expect(isKnownHost('ai.google.dev')).toBe(true)
    expect(isKnownHost('example.com')).toBe(false)
  })

  it('allows cached cross-origin URLs only when the known table lists them', () => {
    expect(knownIconFor('https://www.google.com/maps')?.urls).toContain(MAPS_ICON)
    expect(isAllowedIconUrl('https://www.google.com/maps', MAPS_ICON)).toBe(true)
    expect(isAllowedIconUrl('https://www.google.com/search', MAPS_ICON)).toBe(false)
    expect(isAllowedIconUrl('https://example.com', 'https://example.com/favicon.ico')).toBe(true)
    expect(isAllowedIconUrl('https://example.com', 'https://evil.example/favicon.ico')).toBe(false)
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
