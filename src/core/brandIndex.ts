import type { FaviconCandidate } from './faviconQuality'
import { brandSlugFor, type BrandIndex } from './brandDomains'
import { brandAssetUrl, loadBrand, type KnownBrand } from './brandShards'

/** Domain index emitted by `scripts/build-brand-index.mjs`; ~138 KB, so it stays out of the bundle. */
const INDEX_PATH = 'brand-index.json'

let index: Promise<BrandIndex | null> | null = null

async function fetchIndex(): Promise<BrandIndex | null> {
  try {
    const response = await fetch(brandAssetUrl(INDEX_PATH))
    if (!response.ok) return null
    return await response.json() as BrandIndex
  } catch { return null }
}

/**
 * Fetch the domain index once per page. It is only reached from `faviconQuality.discover`,
 * which skips fresh cache entries, so a start-up screen with cached icons fetches nothing.
 * A failed load is forgotten so the next uncached icon retries.
 */
export function loadBrandIndex(): Promise<BrandIndex | null> {
  if (!index) {
    const pending = fetchIndex()
    index = pending
    void pending.then(loaded => { if (!loaded && index === pending) index = null })
  }
  return index
}

/**
 * Auto-resolution first step: the URL's domain → slug → on-demand shard.
 * Any failure returns null, leaving the existing favicon pipeline untouched.
 */
export async function brandForUrl(input: string): Promise<KnownBrand | null> {
  const loaded = await loadBrandIndex()
  if (!loaded) return null
  const slug = brandSlugFor(loaded, input)
  return slug ? loadBrand(slug) : null
}

/** The candidate shape `faviconQuality.discover` publishes for a bundled mark. */
export async function brandCandidate(input: string): Promise<FaviconCandidate | null> {
  const brand = await brandForUrl(input)
  return brand ? { url: '', sourceType: 'brand', naturalWidth: 0, naturalHeight: 0, effectiveWidth: Infinity, svg: true, brand } : null
}

/** Test helper: forget the cached index. */
export function clearBrandIndexCache() { index = null }
