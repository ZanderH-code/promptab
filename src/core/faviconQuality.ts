import { browserFaviconUrl, normalizeUrl, ICON_CACHE_KEY } from './favicon'
import { extensionApi, isFirefoxExtension, type ExtensionApi } from '../platform/extension'

export const ICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const ICON_NEGATIVE_TTL_MS = 60 * 60 * 1000
export const ICON_CACHE_LIMIT = 256
export const ICON_MAX_CONCURRENCY = 3
export const ICON_PROBE_TIMEOUT_MS = 3500

export type FaviconCandidate = {
  url: string
  sourceType: string
  naturalWidth: number
  naturalHeight: number
  /** Real source resolution: an upscaled bitmap reports the pixels it actually came from. */
  effectiveWidth: number
  clarity: 'clear' | 'blurry'
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
type CacheEntry = { url?: string; brand?: string; width?: number; height?: number; svg?: boolean; known?: boolean; failed?: boolean; savedAt: number; expiresAt: number }
type CacheState = { version: 2; entries: Record<string, CacheEntry> }
type Listener = (candidate: FaviconCandidate | null, complete: boolean) => void
type Run = { listeners: Map<Listener, number>; best: FaviconCandidate | null; complete: boolean }

const cacheMemory: Record<string, CacheEntry> = {}
const activeRuns = new Map<string, Run>()
const queue: Array<() => void> = []
/** Any known suffix needs the known table; everything else does not. */
const KNOWN_HOSTS = /(^|\.)(google\.(com|dev)|ai\.google|chatgpt\.com|v0\.(app|dev)|deepseek\.com|grok\.com|outlook\.(live|office)\.com|instagram\.com|youtube\.com|reddit\.com|tradingview\.com|coinmarketcap\.com|interactivebrokers\.com|wealthsimple\.com|dify\.ai)$/
export function isKnownHost(hostname: string) { return KNOWN_HOSTS.test(hostname.toLowerCase()) }
/** Cache key: origin plus a known product path, or just the origin. */
export function faviconCacheKey(input: string) {
  const normalized = normalizeUrl(input)
  if (!normalized) return null
  const url = new URL(normalized)
  return url.hostname === 'www.google.com' && /^\/maps(\/|$)/.test(url.pathname) ? url.origin + '/maps' : url.origin
}
export function isUsableIcon(width: number, height: number, transparent = false, placeholder = false) { return width > 1 && height > 1 && !transparent && !placeholder }
export function isCacheEntryFresh(entry: CacheEntry, now = Date.now()) { return entry.expiresAt > now }
export function trimCacheEntries(entries: Record<string, CacheEntry>, limit = ICON_CACHE_LIMIT) {
  return Object.fromEntries(Object.entries(entries).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, limit))
}
export function chooseBestIcon(candidates: FaviconCandidate[]) {
  return candidates.reduce<FaviconCandidate | null>((best, candidate) => isBetter(candidate, best) ? candidate : best, null)
}
let activeLoads = 0
let cacheRead: Promise<void> | null = null
let writeChain = Promise.resolve()

function uniqueSources(input: string, api?: ExtensionApi, firefox?: boolean): CandidateSource[] {
  const normalized = normalizeUrl(input)
  if (!normalized) return []
  const origin = new URL(normalized).origin
  const sources: Array<CandidateSource | null> = [
    (() => { const url = browserFaviconUrl(normalized, api, firefox, 128); return url ? { url, sourceType: 'chrome-_favicon-128', svg: false } : null })(),
    (() => { const url = browserFaviconUrl(normalized, api, firefox, 64); return url ? { url, sourceType: 'chrome-_favicon-64', svg: false } : null })(),
    { url: `${origin}/apple-touch-icon.png`, sourceType: 'apple-touch-icon', svg: false },
    { url: `${origin}/apple-touch-icon-precomposed.png`, sourceType: 'apple-touch-icon-precomposed', svg: false },
    { url: `${origin}/favicon.svg`, sourceType: 'favicon.svg', svg: true },
    { url: `${origin}/favicon-32x32.png`, sourceType: 'favicon-32x32.png', svg: false },
    { url: `${origin}/favicon.ico`, sourceType: 'favicon.ico', svg: false },
  ]
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

async function loadCache() {
  if (cacheRead) return cacheRead
  cacheRead = (async () => {
    let raw: unknown
    const storage = extensionApi()?.storage?.local
    try {
      if (storage) raw = (await storage.get(ICON_CACHE_KEY))[ICON_CACHE_KEY]
      else if (typeof localStorage !== 'undefined') raw = JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || 'null')
    } catch { raw = null }
    if (!raw || typeof raw !== 'object' || (raw as CacheState).version !== 2 || typeof (raw as CacheState).entries !== 'object') return
    const now = Date.now()
    for (const [key, entry] of Object.entries((raw as CacheState).entries)) {
      if (!entry || !isCacheEntryFresh(entry, now) || !/^https?:\/\//.test(key)) continue
      let origin = ''
      try { origin = new URL(key).origin } catch { continue }
      // Cross-origin results are accepted only when this app stored a known-table URL.
      try { if (entry.url && !entry.known && new URL(entry.url).origin !== origin) continue } catch { continue }
      cacheMemory[key] = entry
    }
  })()
  return cacheRead
}

async function saveCache() {
  const now = Date.now()
  for (const [key, entry] of Object.entries(cacheMemory)) if (entry.expiresAt <= now) delete cacheMemory[key]
  const ordered = trimCacheEntries(cacheMemory)
  for (const key of Object.keys(cacheMemory)) delete cacheMemory[key]
  Object.assign(cacheMemory, ordered)
  const value: CacheState = { version: 2, entries: { ...cacheMemory } }
  writeChain = writeChain.then(async () => {
    const storage = extensionApi()?.storage?.local
    try {
      if (storage) await storage.set({ [ICON_CACHE_KEY]: value })
      else if (typeof localStorage !== 'undefined') localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(value))
    } catch { /* Icon discovery remains available without persistent cache storage. */ }
  })
  await writeChain
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
  const score = (item: FaviconCandidate) => item.svg ? Number.POSITIVE_INFINITY : item.effectiveWidth
  if (score(candidate) !== score(current)) return score(candidate) > score(current)
  // A real site file ties with an upscaled browser bitmap: keep the real file.
  return current.sourceType.startsWith('chrome-_favicon') && !candidate.sourceType.startsWith('chrome-_favicon')
}

async function loadExtras(input: string, chrome: boolean) {
  return chrome || isKnownHost(new URL(normalizeUrl(input)!).hostname) ? await import('./faviconExtras') : null
}

async function discover(key: string, input: string, run: Run) {
  await loadCache()
  const now = Date.now()
  const cached = cacheMemory[key]
  if (cached && isCacheEntryFresh(cached, now) && cached.failed) { publish(run, null, true); activeRuns.delete(key); return }
  const sources = faviconCandidates(input)
  const extras = await loadExtras(input, sources.some(source => source.sourceType.startsWith('chrome-_favicon')))
  if (extras) {
    const seen = new Set(sources.map(source => source.url))
    for (const source of extras.sources(input)) if (!seen.has(source.url)) sources.push(source)
    await extras.prepare()
  }
  if (cached && isCacheEntryFresh(cached, now) && cached.brand) {
    const brand = extras?.brand(cached.brand) ?? null
    if (brand) { publish(run, brand, true); activeRuns.delete(key); return }
  }
  if (cached?.url) sources.sort((a, b) => Number(b.url === cached.url) - Number(a.url === cached.url))
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
  const stored: CacheEntry = finalBest
    ? finalBest.brand
      ? { brand: finalBest.brand.slug, savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS }
      : { url: finalBest.url, width: finalBest.effectiveWidth, height: finalBest.naturalHeight, svg: finalBest.svg, known: finalBest.sourceType === 'known', savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS }
    : { failed: true, savedAt, expiresAt: savedAt + ICON_NEGATIVE_TTL_MS }
  cacheMemory[key] = stored
  await saveCache()
  publish(run, finalBest, true)
  activeRuns.delete(key)
}

export function loadBestFavicon(input: string, displaySize: number, listener: Listener) {
  const key = faviconCacheKey(input)
  if (!key) { listener(null, true); return () => {} }
  let run = activeRuns.get(key)
  if (!run) {
    run = { listeners: new Map(), best: null, complete: false }
    activeRuns.set(key, run)
    void discover(key, input, run).catch(() => { publish(run!, null, true); activeRuns.delete(key) })
  }
  run.listeners.set(listener, Math.max(1, displaySize))
  if (run.best || run.complete) publish(run, run.best, run.complete)
  return () => { run?.listeners.delete(listener) }
}

export async function clearFaviconCache() {
  for (const key of Object.keys(cacheMemory)) delete cacheMemory[key]
  cacheRead = Promise.resolve()
  const storage = extensionApi()?.storage?.local
  try {
    if (storage?.remove) await storage.remove(ICON_CACHE_KEY)
    else if (storage) await storage.set({ [ICON_CACHE_KEY]: { version: 2, entries: {} } satisfies CacheState })
    else if (typeof localStorage !== 'undefined') localStorage.removeItem(ICON_CACHE_KEY)
  } catch { /* Clearing metadata must not affect profiles or bookmarks. */ }
}

export function __resetFaviconQualityForTests() {
  for (const key of Object.keys(cacheMemory)) delete cacheMemory[key]
  activeRuns.clear()
  queue.splice(0)
  activeLoads = 0
  cacheRead = null
  writeChain = Promise.resolve()
}
