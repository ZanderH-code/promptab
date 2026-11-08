import { afterEach, describe, expect, it, vi } from 'vitest'
import { brandForUrl, clearBrandIndexCache, loadBrandIndex } from './brandIndex'
import { clearBrandShardCache, brandShardForSlug } from './brandShards'

const index = { version: 1, hosts: { 'bilibili.com': 'bilibili' } }
const brand = { slug: 'bilibili', title: 'Bilibili', hex: '00A1D6', path: 'M0 0h24v24H0z' }

function stubAssets() {
  const shard = { [brand.slug]: brand }
  return vi.fn(async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname
    if (path.endsWith('/brand-index.json')) return new Response(JSON.stringify(index), { status: 200 })
    if (path.endsWith(`/brands/${brandShardForSlug(brand.slug)}.json`)) return new Response(JSON.stringify(shard), { status: 200 })
    return new Response(JSON.stringify({}), { status: 200 })
  })
}

afterEach(() => {
  clearBrandIndexCache()
  clearBrandShardCache()
  vi.unstubAllGlobals()
})

describe('loadBrandIndex', () => {
  it('fetches the index once per page', async () => {
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadBrandIndex()).resolves.toEqual(index)
    await loadBrandIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves null and retries after a failed index fetch', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new Response(JSON.stringify(index), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadBrandIndex()).resolves.toBeNull()
    await expect(loadBrandIndex()).resolves.toEqual(index)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('resolves null on a non-OK index response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await expect(loadBrandIndex()).resolves.toBeNull()
  })
})

describe('brandForUrl', () => {
  it('resolves a matching domain to the mark in its shard', async () => {
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    await expect(brandForUrl('https://www.bilibili.com/video/BV1')).resolves.toEqual(brand)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null without loading a shard when no domain rule matches', async () => {
    const fetchMock = stubAssets()
    vi.stubGlobal('fetch', fetchMock)
    await expect(brandForUrl('https://not-a-brand.example.test/')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null when the index cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    await expect(brandForUrl('https://www.bilibili.com/')).resolves.toBeNull()
  })
})
