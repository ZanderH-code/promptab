import domainData from './brandDomains.json'

/** Static index emitted by `scripts/build-brand-index.mjs` and loaded on demand. */
export type BrandIndex = {
  version: number
  hosts: Record<string, string>
  paths?: Record<string, string>
}

/** Small public-suffix list: no PSL dependency in the bundle. */
export const MULTI_LABEL_SUFFIXES: readonly string[] = domainData.suffixes

export function registrableDomain(host: string): string {
  const clean = host.toLowerCase().replace(/\.$/, '')
  const parts = clean.split('.')
  const size = MULTI_LABEL_SUFFIXES.some(suffix => clean === suffix || clean.endsWith(`.${suffix}`)) ? 3 : 2
  return parts.length > size ? parts.slice(-size).join('.') : clean
}

/** Exact host first, then each parent down to (and including) the registrable domain. */
export function hostChain(host: string): string[] {
  const clean = host.toLowerCase().replace(/\.$/, '')
  const parts = clean.split('.')
  const stop = registrableDomain(clean)
  const chain: string[] = []
  for (let index = 0; index < parts.length; index += 1) {
    const candidate = parts.slice(index).join('.')
    chain.push(candidate)
    if (candidate === stop) break
  }
  return chain
}

/**
 * Resolve a URL to a simple-icons slug using host rules first and then host+path rules.
 * Path rules win over host rules so `www.google.com/maps` is Maps, not Search.
 */
export function brandSlugFor(index: BrandIndex, input: string): string | null {
  let url: URL
  try { url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`) } catch { return null }
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const pathRules = Object.entries(index.paths ?? {}).sort(([a], [b]) => b.length - a.length)
  for (const [key, slug] of pathRules) {
    const slash = key.indexOf('/')
    if (slash < 0) continue
    const ruleHost = key.slice(0, slash)
    const rulePath = key.slice(slash)
    if (ruleHost === host && (path === rulePath || path.startsWith(`${rulePath}/`))) return slug
  }
  for (const candidate of hostChain(host)) {
    const slug = index.hosts[candidate]
    if (slug) return slug
  }
  return null
}
