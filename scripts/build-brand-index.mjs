// Builds `brand-index.json`: a host (and a few host+path) → simple-icons slug map.
//
// The index is a static asset loaded on demand. It is never imported by application code,
// so it adds no startup bytes. Generic rules derive the mapping from simple-icons metadata;
// `src/core/brandDomains.json` holds the curated exceptions.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

/** Source URLs that describe a brand rather than point at its product domain. */
const DENIED_HOSTS = new Set(['github.com', 'github.io', 'figma.com', 'wikipedia.org', 'wikimedia.org', 'creativecommons.org'])
const DENIED_SUFFIXES = [
  'github.io', 'githubusercontent.com', 'cloudfront.net', 'googleusercontent.com', 'gstatic.com',
  'githubassets.com', 'twimg.com', 'fbcdn.net', 'staticflickr.com', 'notion.site', 'wordpress.com',
  'blogspot.com', 'netlify.app', 'vercel.app', 'pages.dev', 'web.app', 'firebaseapp.com',
  'wixsite.com', 'squarespace.com', 'readthedocs.io', 'gitbook.io',
]

const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** TLDs that are also common brand-name suffixes (mistral.ai, ele.me). Exact label matches only. */
const LABEL_TLDS = ['ai', 'io', 'app', 'dev', 'co', 'me', 'so', 'tv', 'gg', 'xyz']

function denied(host, deniedHosts, deniedSuffixes) {
  return deniedHosts.has(host) || deniedSuffixes.some(suffix => host === suffix || host.endsWith(`.${suffix}`))
}

export function registrableDomain(host, suffixes) {
  const clean = host.toLowerCase().replace(/\.$/, '')
  const parts = clean.split('.')
  const size = suffixes.some(suffix => clean === suffix || clean.endsWith(`.${suffix}`)) ? 3 : 2
  return parts.length > size ? parts.slice(-size).join('.') : clean
}

export function registrableLabel(host, suffixes) {
  return registrableDomain(host, suffixes).split('.')[0]
}

/**
 * @param {Record<string, {slug?: string, title?: string, source?: string}>} catalogue
 * @param {{suffixes: string[], hosts?: Record<string,string>, paths?: Record<string,string>}} overrides
 * @param {{deniedHosts?: Set<string>, deniedSuffixes?: string[]}} [options]
 */
export function buildBrandIndex(catalogue, overrides, options = {}) {
  const deniedHosts = options.deniedHosts ?? DENIED_HOSTS
  const deniedSuffixes = options.deniedSuffixes ?? DENIED_SUFFIXES
  const suffixes = overrides.suffixes ?? []
  const claims = []

  for (const icon of Object.values(catalogue)) {
    if (!icon?.slug || !icon.source) continue
    let source
    try { source = new URL(icon.source) } catch { continue }
    const host = source.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
    if (!host || denied(host, deniedHosts, deniedSuffixes)) continue
    const domain = registrableDomain(host, suffixes)
    const label = registrableLabel(host, suffixes)
    // A source host whose label is the slug is the brand's own domain.
    if (label === icon.slug) claims.push({ host: domain, slug: icon.slug, rank: 2 })
    // A title that equals the label confirms the same domain.
    else if (normalize(icon.title ?? '') === label) claims.push({ host: domain, slug: icon.slug, rank: 1 })
    // A product subdomain (music.apple.com) is mapped exactly; its parent is not.
    else if (normalize(icon.title ?? '') === icon.slug && host !== domain) claims.push({ host, slug: icon.slug, rank: 1 })
  }

  const byHost = new Map()
  for (const claim of claims) {
    if (!byHost.has(claim.host)) byHost.set(claim.host, [])
    byHost.get(claim.host).push(claim)
  }
  const hosts = {}
  for (const [host, hostClaims] of byHost) {
    const slugs = [...new Set(hostClaims.map(claim => claim.slug))]
    const labelled = [...new Set(hostClaims.filter(claim => claim.rank === 2).map(claim => claim.slug))]
    // A host claimed by unrelated products (developers.google.com) is ambiguous: skip it.
    const chosen = slugs.length === 1 ? slugs[0] : labelled.length === 1 ? labelled[0] : null
    if (chosen) hosts[host] = chosen
  }

  // Label rules: the registrable label equals a slug or a normalised title. The lookup
  // helper only applies these to the registrable domain itself, so user subdomains
  // (alice.github.io, myblog.wordpress.com) never match.
  const labelClaims = []
  for (const icon of Object.values(catalogue)) {
    if (!icon?.slug) continue
    const slug = icon.slug
    if (slug.length >= 2) labelClaims.push({ label: slug, slug, rank: 3 })
    const titles = [icon.title, ...Object.values(icon.aliases?.loc ?? {}), ...(icon.aliases?.aka ?? [])]
    for (const value of titles) {
      const title = normalize(value ?? '')
      if (title.length >= 3) labelClaims.push({ label: title, slug, rank: 2 })
    }
    for (const tld of LABEL_TLDS) {
      if (slug.endsWith(tld) && slug.length - tld.length >= 3) labelClaims.push({ label: slug.slice(0, -tld.length), slug, rank: 1 })
    }
    if (slug.endsWith('dotcom') && slug.length > 9) labelClaims.push({ label: slug.slice(0, -'dotcom'.length), slug, rank: 1 })
    if (slug.includes('dot')) {
      const stripped = slug.replaceAll('dot', '')
      if (stripped.length >= 3) labelClaims.push({ label: stripped, slug, rank: 1 })
    }
  }
  const byLabel = new Map()
  for (const claim of labelClaims) {
    if (!byLabel.has(claim.label)) byLabel.set(claim.label, [])
    byLabel.get(claim.label).push(claim)
  }
  const labels = {}
  for (const [label, claims] of byLabel) {
    const slugsForLabel = [...new Set(claims.map(claim => claim.slug))]
    if (slugsForLabel.length === 1) { labels[label] = slugsForLabel[0]; continue }
    const exact = [...new Set(claims.filter(claim => claim.rank === 3).map(claim => claim.slug))]
    if (exact.length === 1) labels[label] = exact[0]
  }

  const slugs = new Set(Object.values(catalogue).map(icon => icon?.slug).filter(Boolean))
  const merged = { ...hosts }
  for (const [host, slug] of Object.entries(overrides.hosts ?? {})) {
    if (!slugs.has(slug)) throw new Error(`brand-index override ${host} → ${slug} is not a simple-icons slug`)
    merged[host.toLowerCase()] = slug
  }
  const paths = {}
  for (const [key, slug] of Object.entries(overrides.paths ?? {})) {
    if (!slugs.has(slug)) throw new Error(`brand-index path override ${key} → ${slug} is not a simple-icons slug`)
    paths[key.toLowerCase()] = slug
  }

  const sortedHosts = Object.fromEntries(Object.keys(merged).sort().map(host => [host, merged[host]]))
  const sortedPaths = Object.fromEntries(Object.keys(paths).sort().map(key => [key, paths[key]]))
  const sortedLabels = Object.fromEntries(Object.keys(labels).sort().map(label => [label, labels[label]]))
  const ignore = [...new Set((overrides.ignore ?? []).map(host => host.toLowerCase()))].sort()
  return { version: 1, hosts: sortedHosts, paths: sortedPaths, labels: sortedLabels, ignore }
}

export async function buildIndexFromInstalledIcons(overridesPath = resolve(root, 'src/core/brandDomains.json')) {
  const overrides = JSON.parse(await readFile(overridesPath, 'utf8'))
  // The JSON data file carries `aliases`; the package's JavaScript exports do not.
  const raw = JSON.parse(await readFile(resolve(root, 'node_modules/simple-icons/data/simple-icons.json'), 'utf8'))
  const list = Array.isArray(raw) ? raw : raw.icons
  const catalogue = Object.fromEntries(list.map(icon => [icon.slug, icon]))
  return buildBrandIndex(catalogue, overrides)
}

export async function writeBrandIndex(outputDir = 'dist') {
  const index = await buildIndexFromInstalledIcons()
  const target = resolve(root, outputDir, 'brand-index.json')
  await writeFile(target, `${JSON.stringify(index)}\n`)
  return { target, bytes: Buffer.byteLength(JSON.stringify(index)), hosts: Object.keys(index.hosts).length, paths: Object.keys(index.paths).length, labels: Object.keys(index.labels).length }
}
