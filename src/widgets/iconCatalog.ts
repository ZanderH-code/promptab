import { BookOpen, Briefcase, Camera, Cloud, Code, Gamepad2, Globe, Heart, House, Mail, Music, Search, ShoppingBag, Star, Video } from 'lucide-react'

export const genericIcons = { house: House, globe: Globe, search: Search, mail: Mail, star: Star, heart: Heart, 'book-open': BookOpen, briefcase: Briefcase, camera: Camera, cloud: Cloud, code: Code, 'gamepad-2': Gamepad2, music: Music, 'shopping-bag': ShoppingBag, video: Video }
export const emojis = ['🌐', '⭐', '❤️', '📚', '🎵', '🎮', '📷', '🛒', '💼', '🌻', '🚀', '☕']

export type BrandIcon = { title: string; slug: string; path: string; hex: string }
let catalog: Promise<BrandIcon[]> | undefined

// Reads every brand shard (the same files automatic brand icons use) instead of a second full catalog.
async function loadShardedBrands({ BRAND_SHARD_COUNT, loadBrandShard }: typeof import('../core/faviconQuality')): Promise<BrandIcon[]> {
  const shards = await Promise.all(Array.from({ length: BRAND_SHARD_COUNT }, (_, bucket) => loadBrandShard(bucket)))
  const brands = shards.flatMap(shard => Object.values(shard))
  if (!brands.length) throw new Error('Brand catalog unavailable')
  return brands.sort((a, b) => a.title.localeCompare(b.title, 'en'))
}
export function loadBrands() {
  return catalog ??= (import.meta.env.DEV
    ? import('simple-icons').then(module => Object.values(module) as BrandIcon[])
    : import('../core/faviconQuality').then(loadShardedBrands)).catch(error => { catalog = undefined; throw error })
}
