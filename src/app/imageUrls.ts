/**
 * Data URLs for image assets, shared by every projection on the page. Asset IDs are content hashes,
 * so a reference always names the same bytes and its URL never goes stale; only the size is bounded.
 */
const MAX_ENTRIES = 256
const urls = new Map<string, string>()
const references = new Map<string, string>()

/** The data URL for `reference`, or undefined when it has not been read yet (or was evicted). */
export function cachedImageUrl(reference: string): string | undefined {
  const url = urls.get(reference)
  if (url === undefined) return undefined
  // Map order is insertion order; re-inserting keeps recently used entries away from eviction.
  urls.delete(reference)
  urls.set(reference, url)
  return url
}

/** The asset reference whose bytes `url` encodes, when this page produced or stored it. */
export function cachedImageReference(url: string): string | undefined {
  return references.get(url)
}

export function rememberImageUrl(reference: string, url: string): void {
  const previous = urls.get(reference)
  if (previous !== undefined) { urls.delete(reference); references.delete(previous) }
  urls.set(reference, url)
  references.set(url, reference)
  while (urls.size > MAX_ENTRIES) {
    const [oldest, oldUrl] = urls.entries().next().value!
    urls.delete(oldest)
    if (references.get(oldUrl) === oldest) references.delete(oldUrl)
  }
}

export function clearImageUrls(): void {
  urls.clear()
  references.clear()
}
