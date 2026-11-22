export const SHARD_COUNT: number
export const MAX_SHARD_BYTES: number
export function shardForSlug(slug: string): number
export function writeBrandShards(
  icons: Record<string, { slug?: string; title?: string; hex?: string; path?: string }>,
  outputDir?: string,
): Promise<{ dir: string; count: number; maxBytes: number; totalBytes: number }>
