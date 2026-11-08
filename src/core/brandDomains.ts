import { suffixes } from './brandDomains.json'

/** Static index emitted by `scripts/build-brand-index.mjs` and loaded on demand. */
export type BrandIndex = {
  version: number
  hosts: Record<string, string>
  paths?: Record<string, string>
  labels?: Record<string, string>
  /** Hosts (and their subdomains) that must not inherit a parent brand. */
  ignore?: string[]
}

/** Shared-hosting domains where the registrable label is not the site's brand. */
const LABEL_EXCLUDED_DOMAINS = new Set([
  'github.io', 'gitlab.io', 'githubusercontent.com', 'netlify.app', 'vercel.app', 'pages.dev',
  'web.app', 'firebaseapp.com', 'blogspot.com', 'wixsite.com', 'squarespace.com', 'readthedocs.io', 'gitbook.io',
])

/** Small public-suffix list: no PSL dependency in the bundle. */
export const MULTI_LABEL_SUFFIXES: readonly string[] = suffixes

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
  if (index.ignore?.some(entry => host === entry || host.endsWith(`.${entry}`))) return null
  for (const candidate of hostChain(host)) {
    const slug = index.hosts[candidate]
    if (slug) return slug
  }
  // Label rules apply only to the registrable domain (and its www form), so user
  // subdomains of shared hosts never inherit the host's brand.
  const domain = registrableDomain(host)
  if (index.labels && !LABEL_EXCLUDED_DOMAINS.has(domain) && (host === domain || host === `www.${domain}`)) {
    const label = domain.split('.')[0]
    return index.labels[label] ?? null
  }
  return null
}
