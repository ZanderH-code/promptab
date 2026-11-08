import * as simpleIcons from 'simple-icons'
import { describe, expect, it } from 'vitest'
import { BRAND_SHARD_COUNT, brandShardForSlug } from '../src/core/brandShards'
import { MAX_SHARD_BYTES, SHARD_COUNT, shardForSlug } from './build-brand-shards.mjs'

const icons = Object.values(simpleIcons).filter(icon => icon?.slug && icon.path)

describe('brand shard builder', () => {
  it('uses the runtime hash and shard count', () => {
    expect(SHARD_COUNT).toBe(BRAND_SHARD_COUNT)
    for (const icon of icons) expect(shardForSlug(icon.slug)).toBe(brandShardForSlug(icon.slug))
  })

  it('keeps every shard under 120 KB', () => {
    const buckets = Array.from({ length: SHARD_COUNT }, () => ({}))
    for (const icon of icons) buckets[shardForSlug(icon.slug)][icon.slug] = { slug: icon.slug, title: icon.title, hex: icon.hex, path: icon.path }
    const sizes = buckets.map(bucket => Buffer.byteLength(`${JSON.stringify(bucket)}\n`))
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_SHARD_BYTES)
  })

  it('assigns every icon with a path to exactly one shard', () => {
    const assignments = new Map<string, number>()
    for (const icon of icons) {
      const bucket = shardForSlug(icon.slug)
      expect(assignments.has(icon.slug)).toBe(false)
      assignments.set(icon.slug, bucket)
    }
    expect(assignments.size).toBe(icons.length)
  })
})
