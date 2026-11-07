import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ICON_CACHE_LIMIT,
  ICON_CACHE_TTL_MS,
  ICON_FAILURE_BACKOFF_MS,
  ICON_NEGATIVE_TTL_MS,
  __resetFaviconQualityForTests,
  chooseBestIcon,
  faviconCandidates,
  isCacheEntryFresh,
  isKnownHost,
  isUsableIcon,
  loadBestFavicon,
  trimCacheEntries,
  type FaviconCandidate,
} from './faviconQuality'
import { estimateEffectiveWidth, isDefaultGlobeFingerprint, resolveIconResult, sources } from './faviconExtras'
import {
  ICON_CACHE_KEY,
  ICON_STALE_TTL_MS,
  cachedFavicon,
  faviconCacheKey,
  readIconCache,
} from './favicon'
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

  it('uses a seven-day positive window, a 30-day stale window and failure backoff in the v3 cache', () => {
    expect(ICON_CACHE_KEY).toBe('mnt.iconCache:v3')
    expect(ICON_CACHE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(ICON_STALE_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
    expect(ICON_NEGATIVE_TTL_MS).toBe(60 * 60 * 1000)
    expect(ICON_FAILURE_BACKOFF_MS).toEqual([60 * 60 * 1000, 6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000])
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

  it('keeps the most recently used cache entries within the configured capacity', () => {
    const entries = Object.fromEntries(Array.from({ length: ICON_CACHE_LIMIT + 20 }, (_, index) => [
      `https://site-${index}.test`, { savedAt: index, usedAt: index, expiresAt: 10_000 },
    ]))
    const trimmed = trimCacheEntries(entries)
    expect(Object.keys(trimmed)).toHaveLength(ICON_CACHE_LIMIT)
    expect(trimmed['https://site-1043.test']?.savedAt).toBe(1043)
    expect(trimmed['https://site-19.test']).toBeUndefined()
  })

  it('evicts by last use rather than save time', () => {
    const entries = {
      'https://old-but-used.test': { savedAt: 1, usedAt: 9_000, expiresAt: 10_000 },
      'https://new-but-idle.test': { savedAt: 8_000, expiresAt: 10_000 },
    }
    expect(trimCacheEntries(entries, 1)['https://old-but-used.test']).toBeDefined()
  })
})

describe('synchronous cache and discovery', () => {
  const DAY = 24 * 60 * 60 * 1000

  const seedV3 = (entries: Record<string, unknown>) => localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(entries))

  function seedV2(entries: Record<string, unknown>) {
    const store: Record<string, unknown> = { 'mnt.iconCache:v2': { version: 2, entries } }
    const removed: string[] = []
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: { runtime: { getURL: (path: string) => `chrome-extension://abc${path}` }, storage: { local: {
        get: async (key: string) => ({ [key]: store[key] }),
        set: async (items: Record<string, unknown>) => { Object.assign(store, items) },
        remove: async (keys: string[]) => { removed.push(...keys); for (const key of keys) delete store[key] },
      } } },
    })
    return { store, removed }
  }

  function stubImages(load: (url: string) => number | null) {
    const requested: string[] = []
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 0
      naturalHeight = 0
      decoding = ''
      loading = ''
      referrerPolicy = ''
      removeAttribute() {}
      set src(url: string) {
        requested.push(url)
        const width = load(url)
        queueMicrotask(() => {
          if (width) { this.naturalWidth = width; this.naturalHeight = width; this.onload?.() }
          else this.onerror?.()
        })
      }
    }
    vi.stubGlobal('Image', FakeImage)
    return requested
  }

  function discoverOnce(input: string, force = false) {
    return new Promise<{ candidate: FaviconCandidate | null; complete: boolean; published: Array<FaviconCandidate | null> }>(resolve => {
      const published: Array<FaviconCandidate | null> = []
      let unsubscribe: (() => void) | undefined
      unsubscribe = loadBestFavicon(input, 64, (candidate, complete) => {
        published.push(candidate)
        if (complete) { unsubscribe?.(); resolve({ candidate, complete, published }) }
      }, force)
    })
  }

  beforeEach(() => {
    localStorage.clear()
    __resetFaviconQualityForTests()
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    __resetFaviconQualityForTests()
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome
    delete (globalThis as typeof globalThis & { browser?: unknown }).browser
  })

  it('publishes a fresh cached success as complete without loading any image', async () => {
    const now = Date.now()
    seedV3({ 'https://cached.example.test': { url: 'https://cached.example.test/icon.png', width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    const requested = stubImages(() => 128)
    const result = await discoverOnce('https://cached.example.test/page')
    expect(result.candidate?.url).toBe('https://cached.example.test/icon.png')
    expect(result.complete).toBe(true)
    expect(requested).toEqual([])
    expect(readIconCache()['https://cached.example.test']?.usedAt).toBeGreaterThan(0)
  })

  it('rediscovers when the cached URL failed to load', async () => {
    const now = Date.now()
    seedV3({ 'https://broken.example.test': { url: 'https://broken.example.test/gone.png', width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    const requested = stubImages(url => url.endsWith('/favicon-32x32.png') ? 128 : null)
    const result = await discoverOnce('https://broken.example.test', true)
    expect(result.candidate?.url).toBe('https://broken.example.test/favicon-32x32.png')
    expect(requested.length).toBeGreaterThan(0)
    expect(readIconCache()['https://broken.example.test']?.url).toBe('https://broken.example.test/favicon-32x32.png')
  })

  it('publishes a stale success immediately, then revalidates it', async () => {
    const now = Date.now()
    seedV3({ 'https://stale.example.test': { url: 'https://stale.example.test/old.png', width: 128, height: 128, savedAt: now - 8 * DAY, expiresAt: now - DAY } })
    stubImages(url => url.endsWith('/favicon.svg') ? 256 : null)
    const result = await discoverOnce('https://stale.example.test')
    expect(result.published[0]?.url).toBe('https://stale.example.test/old.png')
    expect(result.candidate?.url).toBe('https://stale.example.test/favicon.svg')
    expect(result.complete).toBe(true)
  })

  it('drops successes older than 30 days instead of showing them', async () => {
    const now = Date.now()
    seedV3({ 'https://ancient.example.test': { url: 'https://ancient.example.test/old.png', width: 128, height: 128, savedAt: now - 31 * DAY, expiresAt: now - 24 * DAY } })
    expect(cachedFavicon('https://ancient.example.test')).toBeNull()
    const requested = stubImages(url => url.endsWith('/favicon.ico') ? 32 : null)
    const result = await discoverOnce('https://ancient.example.test')
    expect(result.published[0]?.url).not.toBe('https://ancient.example.test/old.png')
    expect(requested.length).toBeGreaterThan(0)
    expect(readIconCache()['https://ancient.example.test']?.url).toBe('https://ancient.example.test/favicon.ico')
  })

  it('backs off consecutive failures at 1h, 6h and 24h, then resets after a success', async () => {
    const now = Date.now()
    stubImages(() => null)
    await discoverOnce('https://fail.example.test')
    let entry = readIconCache()['https://fail.example.test']!
    expect(entry).toMatchObject({ failed: true, failures: 1 })
    expect(entry.expiresAt - entry.savedAt).toBe(ICON_FAILURE_BACKOFF_MS[0])

    seedV3({ 'https://fail.example.test': { ...entry, savedAt: now - 2 * 3600e3, expiresAt: now - 3600e3 } })
    await discoverOnce('https://fail.example.test')
    entry = readIconCache()['https://fail.example.test']!
    expect(entry.failures).toBe(2)
    expect(entry.expiresAt - entry.savedAt).toBe(ICON_FAILURE_BACKOFF_MS[1])

    seedV3({ 'https://fail.example.test': { ...entry, failures: 9, savedAt: now - 2 * DAY, expiresAt: now - DAY } })
    await discoverOnce('https://fail.example.test')
    entry = readIconCache()['https://fail.example.test']!
    expect(entry.failures).toBe(10)
    expect(entry.expiresAt - entry.savedAt).toBe(ICON_FAILURE_BACKOFF_MS[2])

    vi.unstubAllGlobals()
    stubImages(url => url.endsWith('/favicon.ico') ? 32 : null)
    seedV3({ 'https://fail.example.test': { ...entry, savedAt: now - 2 * DAY, expiresAt: now - DAY } })
    await discoverOnce('https://fail.example.test')
    entry = readIconCache()['https://fail.example.test']!
    expect(entry.failed).toBeUndefined()
    expect(entry.failures).toBeUndefined()
    expect(entry.url).toBe('https://fail.example.test/favicon.ico')
  })

  it('migrates a v2 _favicon entry into v3 so it survives a reload', async () => {
    const now = Date.now()
    const icon = 'chrome-extension://abc/_favicon/?pageUrl=https%3A%2F%2Ffav.test%2F&size=128'
    const { store, removed } = seedV2({ 'https://fav.test': { url: icon, width: 128, height: 128, known: false, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    const requested = stubImages(() => 128)
    const result = await discoverOnce('https://fav.test')
    expect(result.candidate?.url).toBe(icon)
    expect(requested).toEqual([])
    expect(cachedFavicon('https://fav.test')?.url).toBe(icon)
    expect(store['mnt.iconCache:v2']).toBeUndefined()
    expect(removed).toContain('mnt.iconCache:v2')
  })

  it('migrates fresh v2 successes, failures and brands, dropping stale or foreign URLs', async () => {
    const now = Date.now()
    seedV2({
      'https://same.test': { url: 'https://same.test/icon.png', width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS },
      'https://foreign.test': { url: 'https://evil.test/icon.png', width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS },
      'https://failed.test': { failed: true, savedAt: now, expiresAt: now + ICON_NEGATIVE_TTL_MS },
      'https://brand.test': { brand: 'youtube', savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS },
      'https://stale.test': { url: 'https://stale.test/icon.png', width: 128, height: 128, savedAt: now - 31 * DAY, expiresAt: now - 24 * DAY },
    })
    stubImages(() => null)
    await discoverOnce('https://migrate.test')
    const entries = readIconCache()
    expect(entries['https://same.test']?.url).toBe('https://same.test/icon.png')
    expect(entries['https://foreign.test']).toBeUndefined()
    expect(entries['https://failed.test']).toMatchObject({ failed: true, failures: 1 })
    expect(entries['https://brand.test']?.brand?.slug).toBe('youtube')
    expect(entries['https://brand.test']?.brand?.path).toBeTruthy()
    expect(entries['https://stale.test']).toBeUndefined()
  })

  it('merges entries written by another tab instead of overwriting them', async () => {
    const now = Date.now()
    seedV3({ 'https://tab-a.test': { url: 'https://tab-a.test/a.png', width: 64, height: 64, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    readIconCache()
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({
      'https://tab-a.test': { url: 'https://tab-a.test/a.png', width: 64, height: 64, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS },
      'https://tab-b.test': { url: 'https://tab-b.test/b.png', width: 64, height: 64, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS },
    }))
    stubImages(url => url.endsWith('/favicon.ico') ? 32 : null)
    await discoverOnce('https://tab-c.test')
    const entries = readIconCache()
    expect(entries['https://tab-a.test']).toBeDefined()
    expect(entries['https://tab-b.test']).toBeDefined()
    expect(entries['https://tab-c.test']?.url).toBe('https://tab-c.test/favicon.ico')
  })

  it('uses one key for sync reads and discovery writes across path variants', async () => {
    const now = Date.now()
    seedV3({ 'https://paths.test': { url: 'https://paths.test/icon.png', width: 64, height: 64, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    expect(cachedFavicon('https://paths.test/a/b?q=1')?.url).toBe('https://paths.test/icon.png')
    expect(faviconCacheKey('https://paths.test/a/b?q=1')).toBe('https://paths.test')
    stubImages(() => 64)
    await discoverOnce('https://paths.test/deep/path')
    expect(readIconCache()['https://paths.test']?.url).toBe('https://paths.test/icon.png')
  })
})
