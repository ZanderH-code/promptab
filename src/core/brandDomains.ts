/** Static index emitted by `scripts/build-brand-index.mjs` and fetched on demand. */
export type BrandIndex = {
  version: number
  hosts: Record<string, string>
  paths?: Record<string, string>
  labels?: Record<string, string>
  /** Multi-label public suffixes (`co.uk`, `com.cn`), precomputed at build time. */
  suffixes?: string[]
  /** Shared hosts and documented product exclusions; their subdomains inherit nothing. */
  ignore?: string[]
}

/**
 * Resolve a URL to a simple-icons slug. Everything domain-specific is data in the index;
 * this only walks the host chain and reads the maps.
 */
export function brandSlugFor(index: BrandIndex, input: string): string | null {
  let url: URL
  try { url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`) } catch { return null }
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/+$/, '') || '/'
  for (const key in index.paths ?? {}) {
    const slash = key.indexOf('/')
    const rule = key.slice(slash)
    if (key.slice(0, slash) === host && (path === rule || path.startsWith(`${rule}/`))) return index.paths![key]!
  }
  if (index.ignore?.some(entry => host === entry || host.endsWith(`.${entry}`))) return null
  const parts = host.split('.')
  const stop = Math.max(0, parts.length - (index.suffixes?.includes(parts.slice(-2).join('.')) ? 3 : 2))
  for (let at = 0; at <= stop; at += 1) {
    const slug = index.hosts[parts.slice(at).join('.')]
    if (slug) return slug
  }
  // Label rules apply only to the registrable domain (and its www form), never to a user subdomain.
  const domain = parts.slice(stop).join('.')
  if (index.labels && (host === domain || host === `www.${domain}`)) return index.labels[parts[stop]!] ?? null
  return null
}
