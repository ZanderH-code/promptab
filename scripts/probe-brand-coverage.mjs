// Dev tool (B0a): measures what the home tiles actually show for common sites.
//
//   npx vite-node scripts/probe-brand-coverage.mjs --profile=fresh --out=/tmp/before-fresh.json
//   npx vite-node scripts/probe-brand-coverage.mjs --profile=warm  --out=/tmp/before-warm.json
//
// `fresh` launches a new Chromium profile with no history, exactly like a first install.
// `warm` first visits every site so Chromium's favicon database is populated, like a
// returning user's. Neither mode changes product code; the extension is only seeded with
// `auto` shortcuts and read back from the DOM.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as icons from 'simple-icons'
import { launchExtension, openApp, seedGroups, seedSettings } from '../e2e/extension-fixture.ts'
import { COMMON_SITES, siteId } from '../e2e/fixtures/common-sites.ts'
import { readFileSync } from 'node:fs'
import { brandSlugFor } from '../src/core/brandDomains.ts'
import { knownIconFor } from '../src/core/knownIcons.ts'

const args = new Map(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=')
  return [key, rest.join('=') || 'true']
}))
const profile = args.get('profile') ?? 'fresh'
if (!['fresh', 'warm'].includes(profile)) throw new Error(`Unknown --profile=${profile}; use fresh or warm`)
const outPath = resolve(args.get('out') ?? `brand-report/probe-${profile}.json`)
const limit = Number(args.get('limit') ?? COMMON_SITES.length)
const sites = COMMON_SITES.slice(0, limit)
const GROUP_SIZE = 30

// ---------------------------------------------------------------- offline data

const catalogue = new Map(Object.values(icons).filter(icon => icon?.slug).map(icon => [icon.slug, icon]))
/** The product's own resolver and data: what the tile will actually do, not an offline guess. */
const brandIndex = JSON.parse(readFileSync(new URL('../dist/brand-index.json', import.meta.url), 'utf8'))

/** Small public-suffix list: enough for the domains in the fixture, no PSL dependency. */
const MULTI_SUFFIXES = ['co.uk', 'org.uk', 'ac.uk', 'com.cn', 'net.cn', 'org.cn', 'com.hk', 'com.tw', 'com.sg', 'com.au', 'net.au', 'co.jp', 'co.kr', 'co.in', 'com.br', 'com.mx']
function registrableLabel(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const parts = host.split('.')
  const suffixLength = MULTI_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`)) ? 3 : 2
  return parts.length > suffixLength ? parts[parts.length - suffixLength] : parts[0]
}
function sourceLabels(icon) {
  try {
    const host = new URL(icon.source).hostname.replace(/^www\./, '')
    if (host.endsWith('github.io') || host.endsWith('github.com')) return []
    return [registrableLabel(host)]
  } catch { return [] }
}
const labelToSlugs = new Map()
for (const icon of catalogue.values()) {
  for (const label of new Set([icon.slug, ...sourceLabels(icon)])) {
    if (!label || label.length < 3) continue
    if (!labelToSlugs.has(label)) labelToSlugs.set(label, [])
    labelToSlugs.get(label).push(icon.slug)
  }
}
const normalise = text => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Exact first (`expectSlug`, slug/label, source label, title), then a conservative heuristic. */
function resolveSlug(site) {
  if (site.expectSlug && catalogue.has(site.expectSlug)) return { slug: site.expectSlug, match: 'exact' }
  const host = new URL(site.url).hostname
  const label = registrableLabel(host)
  if (catalogue.has(label)) return { slug: label, match: 'exact' }
  const byLabel = labelToSlugs.get(label) ?? []
  if (byLabel.length === 1) return { slug: byLabel[0], match: 'exact' }
  try {
    for (const icon of catalogue.values()) {
      const source = new URL(icon.source)
      if (source.hostname.replace(/^www\./, '') === host.replace(/^www\./, '')) return { slug: icon.slug, match: 'exact' }
    }
  } catch { /* source can be missing or malformed */ }
  const name = normalise(site.name)
  for (const icon of catalogue.values()) {
    if (icon.slug === name || normalise(icon.title) === name) return { slug: icon.slug, match: 'exact' }
  }
  const candidates = [...catalogue.values()].filter(icon => {
    const slug = icon.slug
    return slug.length >= 4 && (slug.includes(label) || label.includes(slug) || name.includes(slug))
  })
  if (candidates.length === 1) return { slug: candidates[0].slug, match: 'heuristic' }
  return { slug: null, match: 'none' }
}

function offline(site) {
  const known = knownIconFor(site.url)
  const resolved = resolveSlug(site)
  const indexSlug = brandSlugFor(brandIndex, site.url)
  return {
    inKnownTable: !!known,
    indexSlug,
    indexBrandBundled: !!indexSlug && catalogue.has(indexSlug),
    simpleIconsSlug: resolved.slug,
    slugMatch: resolved.match,
    missingInSimpleIcons: !resolved.slug,
  }
}

// ------------------------------------------------------------------- DOM read

async function readTiles(page) {
  return await page.$$eval('.bookmarks .shortcut-wrap[data-sortable-id]', nodes => nodes.map(node => {
    const icon = node.querySelector('.shortcut-icon')
    const svg = icon?.querySelector('svg path')
    const img = icon?.querySelector('img')
    const text = icon?.textContent?.trim() ?? ''
    return {
      id: node.getAttribute('data-sortable-id') ?? '',
      display: svg ? 'brand' : img ? 'favicon' : text ? 'letter' : 'pending',
      src: img?.getAttribute('src') ?? null,
      text,
    }
  }))
}

/** Items inside an open folder dialog; the anchor title is the shortcut name. */
async function readDialogTiles(page) {
  return await page.$$eval('.mnt-folder-dialog-item', nodes => nodes.map(node => {
    const icon = node.querySelector('.shortcut-icon')
    const svg = icon?.querySelector('svg path')
    const img = icon?.querySelector('img')
    const text = icon?.textContent?.trim() ?? ''
    return {
      name: node.querySelector('a.shortcut')?.getAttribute('title') ?? node.textContent?.trim() ?? '',
      display: svg ? 'brand' : img ? 'favicon' : text ? 'letter' : 'pending',
      src: img?.getAttribute('src') ?? null,
      text,
    }
  }))
}

async function waitUntilSettled(read, expected, frameMs = 1000, quietFrames = 6, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  let last = ''
  let quiet = 0
  while (Date.now() < deadline) {
    const tiles = await read()
    const signature = tiles.map(tile => `${tile.id ?? tile.name}:${tile.display}:${tile.src ?? ''}`).join('|')
    const settled = tiles.length >= expected && tiles.every(tile => tile.display !== 'pending')
    if (settled && signature === last) quiet += 1
    else quiet = 0
    last = signature
    if (quiet >= quietFrames) return tiles
    await new Promise(resolve => setTimeout(resolve, frameMs))
  }
  return await read()
}

const waitForIcons = (page, expected) => waitUntilSettled(() => readTiles(page), expected)
const waitForDialogIcons = (page, expected) => waitUntilSettled(() => readDialogTiles(page), expected)

/** Folder mode renders only the first group as tiles; the others become folder tiles. */
async function openFolder(page, groupId) {
  await page.locator(`[data-folder="${groupId}"]`).click()
  await page.locator('.mnt-folder-dialog').waitFor({ state: 'visible' })
}

async function closeFolder(page) {
  await page.locator('.mnt-folder-close').click()
  await page.locator('.mnt-folder-dialog').waitFor({ state: 'detached' })
}

function srcKind(src, site) {
  if (!src) return null
  if (src.includes('/_favicon/')) return '_favicon'
  const known = knownIconFor(site.url)
  if (known?.urls.includes(src)) return 'known'
  if (/^https?:/i.test(src)) return 'site'
  return 'other'
}

// ------------------------------------------------------------------------ run

const session = await launchExtension({ viewport: { width: 1400, height: 1000 } })
const visits = []
try {
  const page = session.page
  if (profile === 'warm') {
    const browser = session.context
    const visit = await browser.newPage()
    // Visiting the sites populates Chromium's own favicon database; this is the only
    // difference between the two profiles.
    for (const site of sites) {
      try {
        await visit.goto(site.url, { timeout: 15_000, waitUntil: 'domcontentloaded' })
        await visit.waitForTimeout(750)
        visits.push({ url: site.url, status: 'ok' })
      } catch (error) {
        visits.push({ url: site.url, status: 'failed', error: String(error?.message ?? error).split('\n')[0] })
      }
    }
    await visit.close()
  }

  // Seed every site as an auto shortcut, in groups of about 30, then open the app.
  await seedSettings(session, {
    shortcuts: [{ id: 'probe-template', name: 'Probe template', url: 'https://example.com', color: '#90d5cd', icon: 'P', iconMode: 'auto' }],
  })
  await openApp(session)
  const groups = []
  for (let start = 0; start < sites.length; start += GROUP_SIZE) {
    const chunk = sites.slice(start, start + GROUP_SIZE)
    groups.push({
      id: `probe-group-${start / GROUP_SIZE + 1}`,
      name: `Probe ${start / GROUP_SIZE + 1}`,
      items: chunk.map((site, offset) => ({ id: siteId(start + offset), name: site.name, url: site.url })),
    })
  }
  await seedGroups(page, groups)
  // With two or more groups the home shows the first group's tiles and folder tiles for
  // the rest, so read the first group directly and open each folder for the others.
  const homeTiles = await waitForIcons(page, groups[0]?.items.length ?? 0)
  const byId = new Map(homeTiles.map(tile => [tile.id, tile]))
  const byName = new Map()
  for (const group of groups.slice(1)) {
    await openFolder(page, group.id)
    const dialogTiles = await waitForDialogIcons(page, group.items.length)
    for (const tile of dialogTiles) byName.set(tile.name, tile)
    await closeFolder(page)
  }

  const results = sites.map((site, index) => {
    const tile = byId.get(siteId(index)) ?? byName.get(site.name) ?? { display: 'pending', src: null, text: '' }
    const visit = visits.find(entry => entry.url === site.url)
    return {
      site: site.name,
      url: site.url,
      category: site.category,
      display: tile.display,
      src: tile.src,
      srcKind: srcKind(tile.src, site),
      letter: tile.display === 'letter' ? tile.text : null,
      visitStatus: profile === 'warm' ? visit?.status ?? 'missing' : null,
      ...offline(site),
    }
  })

  const counts = results.reduce((acc, entry) => {
    const key = entry.display === 'favicon' ? `favicon:${entry.srcKind ?? 'other'}` : entry.display
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const report = {
    mode: profile,
    generatedAt: new Date().toISOString(),
    total: results.length,
    counts,
    visits: profile === 'warm' ? visits : undefined,
    sites: results,
  }
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`wrote ${outPath}`)
  console.log(JSON.stringify(counts, null, 2))
} finally {
  await session.close()
}
