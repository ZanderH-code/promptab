import {
  browserFaviconUrl, faviconCacheKey, ICON_CACHE_KEY, ICON_STALE_TTL_MS, normalizeUrl, readIconCache,
  type IconCacheEntry,
} from './favicon'
import { extensionApi, isFirefoxExtension, type ExtensionApi } from '../platform/extension'
import { brandCandidate } from './brandIndex'

export const ICON_CACHE_TTL_MS = 6048e5
export const ICON_NEGATIVE_TTL_MS = 36e5
/** Consecutive-failure backoff: one hour, six hours, then a daily retry. */
export const ICON_FAILURE_BACKOFF_MS = [ICON_NEGATIVE_TTL_MS, 216e5, 864e5]
export const ICON_CACHE_LIMIT = 1024
export const ICON_MAX_CONCURRENCY = 3
export const ICON_PROBE_TIMEOUT_MS = 3500

export type FaviconCandidate = {
  url: string
  sourceType: string
  naturalWidth: number
  naturalHeight: number
  /** Real source resolution: an upscaled bitmap reports the pixels it actually came from. */
  effectiveWidth: number
  clarity?: 'clear' | 'blurry'
  svg: boolean
  /** Set when the result is a bundled brand mark instead of an image. */
  brand?: { slug: string; title: string; path: string; hex: string }
}
export type CandidateSource = { url: string; sourceType: string; svg: boolean }
/** Loaded on demand: known-site matching, upscale/placeholder inspection and bundled brand marks. */
export type FaviconExtras = {
  sources(input: string): CandidateSource[]
  prepare(): Promise<void>
  inspect(image: HTMLImageElement): Promise<{ transparent: boolean; placeholder: boolean; effectiveWidth: number }>
  resolveIconResult(best: FaviconCandidate | null, input: string, displaySize: number, dpr: number): FaviconCandidate | null
  brand(slug: string): FaviconCandidate | null
}
type Listener = (candidate: FaviconCandidate | null, complete: boolean) => void
type Run = { listeners: Map<Listener, number>; best: FaviconCandidate | null; complete: boolean }

const activeRuns = new Map<string, Run>()
const queue: Array<() => void> = []
/** Any known suffix needs the known table; everything else does not. */
const KNOWN_HOSTS = /(^|\.)(google\.(com|dev)|ai\.google|chatgpt\.com|v0\.(app|dev)|deepseek\.com|grok\.com|outlook\.(live|office)\.com|instagram\.com|youtube\.com|reddit\.com|tradingview\.com|coinmarketcap\.com|interactivebrokers\.com|wealthsimple\.com|dify\.ai)$/
export function isKnownHost(hostname: string) { return KNOWN_HOSTS.test(hostname.toLowerCase()) }
export function isUsableIcon(width: number, height: number, transparent = false, placeholder = false) { return width > 1 && height > 1 && !transparent && !placeholder }
export function isCacheEntryFresh(entry: IconCacheEntry, now = Date.now()) { return entry.expiresAt > now }
/** Least-recently-used first, so the tail can be dropped at the capacity limit. */
export function trimCacheEntries(entries: Record<string, IconCacheEntry>, limit = ICON_CACHE_LIMIT) {
  return Object.fromEntries(Object.entries(entries)
    .sort((a, b) => (b[1].usedAt ?? b[1].savedAt) - (a[1].usedAt ?? a[1].savedAt))
    .slice(0, limit))
}
export function chooseBestIcon(candidates: FaviconCandidate[]) {
  return candidates.reduce<FaviconCandidate | null>((best, candidate) => isBetter(candidate, best) ? candidate : best, null)
}
let activeLoads = 0
let migration: Promise<void> | null = null

function uniqueSources(input: string, api?: ExtensionApi, firefox?: boolean): CandidateSource[] {
  const normalized = normalizeUrl(input)
  if (!normalized) return []
  const origin = new URL(normalized).origin
  const sources: Array<CandidateSource | null> = ([128, 64] as const).map(size => {
    const url = browserFaviconUrl(normalized, api, firefox, size)
    return url ? { url, sourceType: `chrome-_favicon-${size}`, svg: false } : null
  })
  sources.push(
    { url: `${origin}/apple-touch-icon.png`, sourceType: 'apple-touch-icon', svg: false },
    { url: `${origin}/apple-touch-icon-precomposed.png`, sourceType: 'apple-touch-icon-precomposed', svg: false },
    { url: `${origin}/favicon.svg`, sourceType: 'favicon.svg', svg: true },
    { url: `${origin}/favicon-32x32.png`, sourceType: 'favicon-32x32.png', svg: false },
    { url: `${origin}/favicon.ico`, sourceType: 'favicon.ico', svg: false },
  )
  const seen = new Set<string>()
  return sources.filter((source): source is CandidateSource => {
    if (!source || seen.has(source.url)) return false
    let parsed: URL
    try { parsed = new URL(source.url) } catch { return false }
    if (!['http:', 'https:', 'chrome-extension:'].includes(parsed.protocol)) return false
    if (parsed.protocol !== 'chrome-extension:' && parsed.origin !== origin) return false
    seen.add(source.url)
    return true
  })
}

export function faviconCandidates(input: string, api = extensionApi(), firefox = isFirefoxExtension()) {
  return uniqueSources(input, api, firefox)
}

async function withImageSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeLoads >= ICON_MAX_CONCURRENCY) await new Promise<void>(resolve => queue.push(resolve))
  else activeLoads++
  try { return await work() }
  finally {
    const next = queue.shift()
    if (next) next()
    else activeLoads--
  }
}

export function loadImage(url: string) {
  return withImageSlot(() => new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.referrerPolicy = 'no-referrer'
    let settled = false
    const finish = (loaded: boolean, timedOut = false) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (timedOut) image.removeAttribute('src')
      resolve(loaded ? image : null)
    }
    const timer = window.setTimeout(() => finish(false, true), ICON_PROBE_TIMEOUT_MS)
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    image.src = url
  }))
}

/** Read-modify-write keeps entries written by other tabs; stale entries and the LRU tail are dropped. */
function writeEntry(key: string, entry: IconCacheEntry) {
  const now = Date.now()
  const kept = Object.entries({ ...readIconCache(), [key]: entry }).filter(([, value]) => value.savedAt + ICON_STALE_TTL_MS > now)
  try { localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(trimCacheEntries(Object.fromEntries(kept)))) } catch { /* Icon discovery remains available without persistent cache storage. */ }
}

function cachedCandidate(entry: IconCacheEntry): FaviconCandidate | null {
  if (entry.brand) return { url: '', sourceType: 'brand', naturalWidth: 0, naturalHeight: 0, effectiveWidth: Infinity, svg: true, brand: entry.brand }
  if (!entry.url) return null
  return { url: entry.url, sourceType: entry.known ? 'known' : 'cache', naturalWidth: entry.width ?? 0, naturalHeight: entry.height ?? 0, effectiveWidth: entry.width ?? 0, clarity: 'clear', svg: !!entry.svg }
}

/** Only extensions can hold a v2 cache; the web build skips the migration chunk entirely. */
function migrateV2() {
  if (migration) return migration
  const storage = extensionApi()?.storage?.local
  migration = storage ? import('./faviconMigrate').then(module => module.migrateV2()).catch(() => {}) : Promise.resolve()
  return migration
}

function publish(run: Run, candidate: FaviconCandidate | null, complete: boolean) {
  run.best = candidate
  run.complete = complete
  const dpr = window.devicePixelRatio || 1
  for (const [listener, displaySize] of run.listeners) {
    const sized = candidate ? { ...candidate, clarity: candidate.svg || candidate.effectiveWidth >= Math.ceil(displaySize * dpr) ? 'clear' as const : 'blurry' as const } : null
    listener(sized, complete)
  }
}

async function probeSource(source: CandidateSource, extras: FaviconExtras | null): Promise<FaviconCandidate | null> {
  const image = await loadImage(source.url)
  if (!image) return null
  const info = source.sourceType.startsWith('chrome-_favicon') && extras ? await extras.inspect(image) : null
  if (!isUsableIcon(image.naturalWidth, image.naturalHeight, !!info?.transparent, !!info?.placeholder)) return null
  const effectiveWidth = info?.effectiveWidth ?? image.naturalWidth
  return {
    url: source.url,
    sourceType: source.sourceType,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    effectiveWidth,
    clarity: source.svg || effectiveWidth >= Math.ceil(24 * (window.devicePixelRatio || 1)) ? 'clear' : 'blurry',
    svg: source.svg,
  }
}

function isBetter(candidate: FaviconCandidate, current: FaviconCandidate | null) {
  if (!current) return true
  const score = (item: FaviconCandidate) => item.svg ? Infinity : item.effectiveWidth
  if (score(candidate) !== score(current)) return score(candidate) > score(current)
  // A real site file ties with an upscaled browser bitmap: keep the real file.
  return current.sourceType.startsWith('chrome-_favicon') && !candidate.sourceType.startsWith('chrome-_favicon')
}

async function loadExtras(input: string, chrome: boolean) {
  return chrome || isKnownHost(new URL(normalizeUrl(input)!).hostname) ? await import('./faviconExtras') : null
}

async function discover(key: string, input: string, run: Run, force: boolean) {
  await migrateV2()
  const now = Date.now()
  const cached = readIconCache()[key]
  if (!force) {
    if (cached?.failed && cached.expiresAt > now) { publish(run, null, true); activeRuns.delete(key); return }
    if (cached && !cached.failed && cached.savedAt + ICON_STALE_TTL_MS > now) {
      const candidate = cachedCandidate(cached)
      if (candidate) {
        const fresh = cached.expiresAt > now
        // A fresh hit is complete without probing. A stale hit paints immediately, then revalidates.
        publish(run, candidate, fresh)
        if (fresh) {
          if ((cached.usedAt ?? 0) + 864e5 <= now) writeEntry(key, { ...cached, usedAt: now })
          activeRuns.delete(key)
          return
        }
      }
    }
  }
  // A domain-matched brand wins over every favicon step. Fresh cache entries returned above, so
  // the index chunk is requested only for a new, stale or forced icon, never for a cached grid.
  const brand = await brandCandidate(input)
  if (brand) {
    const savedAt = Date.now()
    writeEntry(key, { brand: brand.brand, savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS })
    publish(run, brand, true)
    activeRuns.delete(key)
    return
  }
  const sources = faviconCandidates(input)
  const extras = await loadExtras(input, sources.some(source => source.sourceType.startsWith('chrome-_favicon')))
  if (extras) {
    const seen = new Set(sources.map(source => source.url))
    for (const source of extras.sources(input)) if (!seen.has(source.url)) sources.push(source)
    await extras.prepare()
  }
  if (!sources.length) { publish(run, null, true); activeRuns.delete(key); return }
  const source128 = sources.find(source => source.sourceType === 'chrome-_favicon-128')
  const source64 = sources.find(source => source.sourceType === 'chrome-_favicon-64')
  const others = sources.filter(source => source !== source128 && source !== source64)
  let best: FaviconCandidate | null = null
  const probe = async (source: CandidateSource) => {
    const candidate = await probeSource(source, extras)
    if (candidate && isBetter(candidate, best)) {
      best = candidate
      publish(run, best, false)
    }
  }
  const preferred = source128
    ? probe(source128).then(() => source64 ? probe(source64) : undefined)
    : source64 ? probe(source64) : Promise.resolve(undefined)
  await Promise.all([...others.map(probe), preferred])
  const guide = best as FaviconCandidate | null
  const displaySize = Math.max(64, ...run.listeners.values())
  const finalBest = extras ? extras.resolveIconResult(guide, input, displaySize, window.devicePixelRatio || 1) : guide
  const savedAt = Date.now()
  if (finalBest) {
    writeEntry(key, finalBest.brand
      ? { brand: finalBest.brand, savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS }
      : { url: finalBest.url, width: finalBest.effectiveWidth, height: finalBest.naturalHeight, svg: finalBest.svg, known: finalBest.sourceType === 'known', savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS })
  } else {
    const failures = (cached?.failures ?? 0) + 1
    // A stale success that cannot revalidate keeps its icon and retries after the failure backoff.
    // A forced run means the cached image itself failed, so that icon must not be kept.
    const previous = !force && cached && !cached.failed && cached.savedAt + ICON_STALE_TTL_MS > savedAt ? cached : null
    const kept = previous ? cachedCandidate(previous) : null
    if (kept && previous) {
      writeEntry(key, { ...previous, failures, expiresAt: savedAt + ICON_FAILURE_BACKOFF_MS[Math.min(failures - 1, 2)]! })
      publish(run, kept, true)
      activeRuns.delete(key)
      return
    }
    writeEntry(key, { failed: true, failures, savedAt, expiresAt: savedAt + ICON_FAILURE_BACKOFF_MS[Math.min(failures - 1, 2)]! })
  }
  publish(run, finalBest, true)
  activeRuns.delete(key)
}

export function loadBestFavicon(input: string, displaySize: number, listener: Listener, force = false) {
  const key = faviconCacheKey(input)
  if (!key) { listener(null, true); return () => {} }
  let run = activeRuns.get(key)
  if (!run) {
    run = { listeners: new Map(), best: null, complete: false }
    activeRuns.set(key, run)
    void discover(key, input, run, force).catch(() => { publish(run!, null, true); activeRuns.delete(key) })
  }
  run.listeners.set(listener, Math.max(1, displaySize))
  if (run.best || run.complete) publish(run, run.best, run.complete)
  return () => { run?.listeners.delete(listener) }
}

export async function clearFaviconCache() {
  try { for (const key of ['mnt.iconCache:v1', 'mnt.iconCache:v2', ICON_CACHE_KEY]) localStorage.removeItem(key) } catch { /* Clearing metadata must not affect profiles or bookmarks. */ }
  try { await extensionApi()?.storage?.local?.remove?.(['mnt.iconCache:v2']) } catch { /* Icon discovery remains available without persistent cache storage. */ }
}

export function __resetFaviconQualityForTests() {
  activeRuns.clear()
  queue.splice(0)
  activeLoads = 0
  migration = null
}
