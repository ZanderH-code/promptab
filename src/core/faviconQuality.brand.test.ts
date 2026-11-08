import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ICON_CACHE_KEY, readIconCache } from './favicon'
import {
  ICON_CACHE_TTL_MS,
  __resetFaviconQualityForTests,
  loadBestFavicon,
  type FaviconCandidate,
} from './faviconQuality'
import { brandShardForSlug, clearBrandShardCache } from './brandShards'
import { clearBrandIndexCache } from './brandIndex'

const DAY = 24 * 60 * 60 * 1000
const brand = { slug: 'bilibili', title: 'Bilibili', hex: '00A1D6', path: 'M0 0h24v24H0z' }
const index = { version: 1, hosts: { 'bilibili.com': 'bilibili' } }

function stubAssets() {
  const shard = { [brand.slug]: brand }
  return vi.fn(async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith('/brand-index.json')) return new Response(JSON.stringify(index), { status: 200 })
    if (path.endsWith(`/brands/${brandShardForSlug(brand.slug)}.json`)) return new Response(JSON.stringify(shard), { status: 200 })
    return new Response(JSON.stringify({}), { status: 200 })
  })
}

function seedV3(entries: Record<string, unknown>) {
  localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(entries))
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
  clearBrandIndexCache()
  clearBrandShardCache()
  delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome
  delete (globalThis as typeof globalThis & { browser?: unknown }).browser
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  __resetFaviconQualityForTests()
  clearBrandIndexCache()
  clearBrandShardCache()
  delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome
  delete (globalThis as typeof globalThis & { browser?: unknown }).browser
})

describe('automatic brand resolution', () => {
  it('uses a matched brand before probing any favicon and caches it', async () => {
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    const requested = stubImages(() => 128)
    const result = await discoverOnce('https://www.bilibili.com/video/BV1')
    expect(result.candidate?.sourceType).toBe('brand')
    expect(result.candidate?.brand).toEqual(brand)
    expect(result.complete).toBe(true)
    expect(requested).toEqual([])
    expect(readIconCache()['https://www.bilibili.com']?.brand).toEqual(brand)
  })

  it('leaves the favicon pipeline untouched when no domain rule matches', async () => {
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    const requested = stubImages(url => url.endsWith('/favicon-32x32.png') ? 128 : null)
    const result = await discoverOnce('https://plain.example.test/page')
    expect(result.candidate?.url).toBe('https://plain.example.test/favicon-32x32.png')
    expect(result.candidate?.brand).toBeUndefined()
    expect(requested.length).toBeGreaterThan(0)
    expect(readIconCache()['https://plain.example.test']?.url).toBe('https://plain.example.test/favicon-32x32.png')
  })

  it('falls back to the favicon pipeline when the index cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    stubImages(url => url.endsWith('/favicon-32x32.png') ? 128 : null)
    const result = await discoverOnce('https://www.bilibili.com/')
    expect(result.candidate?.url).toBe('https://www.bilibili.com/favicon-32x32.png')
    expect(readIconCache()['https://www.bilibili.com']?.url).toBe('https://www.bilibili.com/favicon-32x32.png')
  })

  it('paints a cached brand without fetching anything', async () => {
    const now = Date.now()
    seedV3({ 'https://cached-brand.example.test': { brand, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const requested = stubImages(() => 128)
    const result = await discoverOnce('https://cached-brand.example.test/page')
    expect(result.published[0]?.brand).toEqual(brand)
    expect(result.candidate?.brand).toEqual(brand)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(requested).toEqual([])
  })

  it('keeps a fresh cached favicon, so a newly matched brand arrives on the next refresh', async () => {
    const now = Date.now()
    const url = 'https://www.bilibili.com/old-icon.png'
    seedV3({ 'https://www.bilibili.com': { url, width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    const result = await discoverOnce('https://www.bilibili.com/video/BV1')
    expect(result.candidate?.url).toBe(url)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('replaces a stale cached favicon with the brand while revalidating', async () => {
    const now = Date.now()
    const url = 'https://www.bilibili.com/old-icon.png'
    seedV3({ 'https://www.bilibili.com': { url, width: 128, height: 128, savedAt: now - 8 * DAY, expiresAt: now - DAY } })
    vi.stubGlobal('fetch', stubAssets())
    stubImages(() => 128)
    const result = await discoverOnce('https://www.bilibili.com/video/BV1')
    expect(result.published[0]?.url).toBe(url)
    expect(result.candidate?.brand).toEqual(brand)
    expect(readIconCache()['https://www.bilibili.com']?.brand).toEqual(brand)
  })

  it('refreshes a cached favicon with the brand when the image itself failed', async () => {
    const now = Date.now()
    seedV3({ 'https://www.bilibili.com': { url: 'https://www.bilibili.com/gone.png', width: 128, height: 128, savedAt: now, expiresAt: now + ICON_CACHE_TTL_MS } })
    vi.stubGlobal('fetch', stubAssets())
    stubImages(() => 128)
    const result = await discoverOnce('https://www.bilibili.com/video/BV1', true)
    expect(result.candidate?.brand).toEqual(brand)
  })

  it('treats an unknown slug as a missed brand, not a broken shard', async () => {
    stubImages(url => url.endsWith('/favicon-32x32.png') ? 128 : null)
    // The index maps this host to a slug whose shard contains nothing.
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname
      if (path.endsWith('/brand-index.json')) return new Response(JSON.stringify({ version: 1, hosts: { 'empty.example.test': 'ghost' } }), { status: 200 })
      return new Response(JSON.stringify({}), { status: 200 })
    }))
    const result = await discoverOnce('https://empty.example.test/')
    expect(result.candidate?.url).toBe('https://empty.example.test/favicon-32x32.png')
    expect(result.candidate?.brand).toBeUndefined()
  })
})
