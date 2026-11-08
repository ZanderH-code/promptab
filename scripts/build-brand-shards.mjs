// Emits `brands/<n>.json` shards: each holds the full simple-icons path for a slice of
// slugs. They are static assets fetched on demand by `src/core/brandShards.ts`, never
// imported by application code.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

export const SHARD_COUNT = 128
export const MAX_SHARD_BYTES = 120 * 1024

/** FNV-1a; must match `brandShardForSlug` in `src/core/brandShards.ts`. */
export function shardForSlug(slug) {
  let hash = 2166136261
  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % SHARD_COUNT
}

export async function writeBrandShards(icons, outputDir = 'dist') {
  const buckets = Array.from({ length: SHARD_COUNT }, () => ({}))
  for (const icon of Object.values(icons)) {
    if (!icon?.slug || !icon.path) continue
    const brand = { slug: icon.slug, title: icon.title, hex: icon.hex, path: icon.path }
    buckets[shardForSlug(icon.slug)][icon.slug] = brand
  }
  const dir = resolve(root, outputDir, 'brands')
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  let totalBytes = 0
  let maxBytes = 0
  for (let bucket = 0; bucket < SHARD_COUNT; bucket += 1) {
    const body = `${JSON.stringify(buckets[bucket])}\n`
    const bytes = Buffer.byteLength(body)
    totalBytes += bytes
    maxBytes = Math.max(maxBytes, bytes)
    await writeFile(resolve(dir, `${bucket}.json`), body)
  }
  if (maxBytes > MAX_SHARD_BYTES) throw new Error(`brand shard exceeds ${MAX_SHARD_BYTES} bytes: ${maxBytes}`)
  return { dir, count: SHARD_COUNT, maxBytes, totalBytes }
}
