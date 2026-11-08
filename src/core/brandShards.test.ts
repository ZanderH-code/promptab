import { afterEach, describe, expect, it, vi } from 'vitest'
import { BRAND_SHARD_COUNT, brandShardForSlug, clearBrandShardCache, loadBrand } from './brandShards'

const brand = { slug: 'bilibili', title: 'Bilibili', hex: '00A1D6', path: 'M0 0h24v24H0z' }
const other = { slug: 'github', title: 'GitHub', hex: '181717', path: 'M12 0C5.37 0 0 5.37 0 12' }

function bucketsFor(slugs: string[]) {
  const byBucket = new Map<number, Record<string, typeof brand>>()
  for (const slug of slugs) {
    const bucket = brandShardForSlug(slug)
    const shard = byBucket.get(bucket) ?? {}
    shard[slug] = slug === 'bilibili' ? brand : other
    byBucket.set(bucket, shard)
  }
  return byBucket
}

afterEach(() => {
  clearBrandShardCache()
  vi.unstubAllGlobals()
})

describe('brandShardForSlug', () => {
  it('is stable and inside the shard range', () => {
    expect(brandShardForSlug('bilibili')).toBe(brandShardForSlug('bilibili'))
    expect(brandShardForSlug('bilibili')).toBeGreaterThanOrEqual(0)
    expect(brandShardForSlug('bilibili')).toBeLessThan(BRAND_SHARD_COUNT)
  })
})

describe('loadBrand', () => {
  it('loads the shard that contains the slug', async () => {
    const shards = bucketsFor(['bilibili'])
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const bucket = Number(String(url).match(/brands\/(\d+)\.json$/)?.[1])
      return new Response(JSON.stringify(shards.get(bucket) ?? {}), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadBrand('bilibili')).resolves.toEqual(brand)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(new RegExp(`brands/${brandShardForSlug('bilibili')}\\.json$`))
  })

  it('returns null for a slug missing from a loaded shard', async () => {
    const shards = bucketsFor(['github'])
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const bucket = Number(String(url).match(/brands\/(\d+)\.json$/)?.[1])
      return new Response(JSON.stringify(shards.get(bucket) ?? {}), { status: 200 })
    }))
    await expect(loadBrand('bilibili')).resolves.toBeNull()
  })

  it('fetches each shard only once', async () => {
    const shards = bucketsFor(['bilibili', 'github'])
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const bucket = Number(String(url).match(/brands\/(\d+)\.json$/)?.[1])
      return new Response(JSON.stringify(shards.get(bucket) ?? {}), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([loadBrand('bilibili'), loadBrand('bilibili')])
    await loadBrand('bilibili')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves null and retries after a failed shard', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new Response(JSON.stringify({ bilibili: brand }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadBrand('bilibili')).resolves.toBeNull()
    await expect(loadBrand('bilibili')).resolves.toEqual(brand)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('resolves null on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await expect(loadBrand('bilibili')).resolves.toBeNull()
  })
})
