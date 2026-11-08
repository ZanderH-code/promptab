import { extensionApi } from '../platform/extension'
import type { KnownBrand } from './knownBrands'

/** Number of shards emitted by `scripts/build-brand-shards.mjs`. */
export const BRAND_SHARD_COUNT = 128

/** FNV-1a; must match `shardForSlug` in `scripts/build-brand-shards.mjs`. */
export function brandShardForSlug(slug: string): number {
  let hash = 2166136261
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % BRAND_SHARD_COUNT
}

export function brandShardPath(bucket: number): string {
  return `brands/${bucket}.json`
}

const shards = new Map<number, Promise<Record<string, KnownBrand>>>()

function shardUrl(bucket: number): string {
  const path = brandShardPath(bucket)
  const api = extensionApi()
  if (api?.runtime?.getURL) return api.runtime.getURL(path)
  return new URL(path, document.baseURI).href
}

async function fetchShard(bucket: number): Promise<Record<string, KnownBrand>> {
  const response = await fetch(shardUrl(bucket))
  if (!response.ok) throw new Error(`Brand shard ${bucket} failed with ${response.status}`)
  return await response.json() as Record<string, KnownBrand>
}

/**
 * Load one brand mark on demand. Only the shard containing `slug` is fetched, and each
 * shard is fetched at most once per session. A failed shard is evicted so a later call retries.
 */
export function loadBrand(slug: string): Promise<KnownBrand | null> {
  const bucket = brandShardForSlug(slug)
  let shard = shards.get(bucket)
  if (!shard) {
    shard = fetchShard(bucket)
    shards.set(bucket, shard)
    void shard.catch(() => { if (shards.get(bucket) === shard) shards.delete(bucket) })
  }
  return shard.then(brands => brands[slug] ?? null, () => null)
}

/** Test helper: forget every cached shard. */
export function clearBrandShardCache() {
  shards.clear()
}
