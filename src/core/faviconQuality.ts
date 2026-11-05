import { browserFaviconUrl, normalizeUrl, ICON_CACHE_KEY } from './favicon'
import { extensionApi, isFirefoxExtension, type ExtensionApi } from '../platform/extension'

export const ICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const ICON_NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000
export const ICON_CACHE_LIMIT = 256
export const ICON_MAX_CONCURRENCY = 3
export const ICON_PROBE_TIMEOUT_MS = 3500

export type FaviconCandidate = {
  url: string
  sourceType: string
  naturalWidth: number
  naturalHeight: number
  clarity: 'clear' | 'blurry'
  svg: boolean
}
type CandidateSource = { url: string; sourceType: string; svg: boolean }
type CacheEntry = { url?: string; width?: number; height?: number; svg?: boolean; failed?: boolean; savedAt: number; expiresAt: number }
type CacheState = { version: 1; entries: Record<string, CacheEntry> }
type Listener = (candidate: FaviconCandidate | null, complete: boolean) => void
type Run = { listeners: Map<Listener, number>; best: FaviconCandidate | null; complete: boolean }

const cacheMemory: Record<string, CacheEntry> = {}
const activeRuns = new Map<string, Run>()
const queue: Array<() => void> = []
export function isDefaultGlobeFingerprint(actual: string, defaults: Set<string>) { return defaults.has(actual) }
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
let globeFingerprints: Promise<Set<string>> | null = null

function getOrigin(input: string) {
  const normalized = normalizeUrl(input)
  return normalized ? new URL(normalized).origin : null
}

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
    if (!source.url.startsWith('chrome-extension://') && new URL(source.url).origin !== origin) return false
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

function fingerprint(image: HTMLImageElement): { hash: string; transparent: boolean } | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let hash = 2166136261
    let transparent = true
    for (let i = 0; i < pixels.length; i += 4) {
      hash = Math.imul(hash ^ pixels[i]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 1]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 2]!, 16777619)
      hash = Math.imul(hash ^ pixels[i + 3]!, 16777619)
      if (pixels[i + 3] !== 0) transparent = false
    }
    return { hash: `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16)}`, transparent }
  } catch {
    // Cross-origin pixels without CORS cannot be read. The image can still be displayed.
    return null
  }
}

function loadImage(url: string, timeout = ICON_PROBE_TIMEOUT_MS) {
  return withImageSlot(() => new Promise<{ image: HTMLImageElement | null; timedOut: boolean }>(resolve => {
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
      resolve({ image: loaded ? image : null, timedOut })
    }
    const timer = window.setTimeout(() => finish(false, true), timeout)
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    image.src = url
  }))
}

async function getGlobeFingerprints() {
  if (!globeFingerprints) {
    const api = extensionApi()
    const url = `https://promptab-${Math.random().toString(36).slice(2)}.invalid/`
    const urls = [browserFaviconUrl(url, api, false, 128), browserFaviconUrl(url, api, false, 64)].filter((value): value is string => !!value)
    globeFingerprints = Promise.all(urls.map(async source => {
      const { image } = await loadImage(source)
      return image ? fingerprint(image)?.hash ?? null : null
    })).then(hashes => new Set(hashes.filter((hash): hash is string => !!hash)))
  }
  return globeFingerprints
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
    if (!raw || typeof raw !== 'object' || (raw as CacheState).version !== 1 || typeof (raw as CacheState).entries !== 'object') return
    const now = Date.now()
    for (const [origin, entry] of Object.entries((raw as CacheState).entries)) {
      if (!entry || !isCacheEntryFresh(entry, now) || !/^https?:\/\//.test(origin)) continue
      cacheMemory[origin] = entry
    }
  })()
  return cacheRead
}

async function saveCache() {
  const now = Date.now()
  for (const [origin, entry] of Object.entries(cacheMemory)) if (entry.expiresAt <= now) delete cacheMemory[origin]
  const ordered = trimCacheEntries(cacheMemory)
  for (const key of Object.keys(cacheMemory)) delete cacheMemory[key]
  Object.assign(cacheMemory, ordered)
  const value: CacheState = { version: 1, entries: { ...cacheMemory } }
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
    const sized = candidate ? { ...candidate, clarity: candidate.svg || candidate.naturalWidth >= Math.ceil(displaySize * dpr) ? 'clear' as const : 'blurry' as const } : null
    listener(sized, complete)
  }
}

async function probeSource(source: CandidateSource, globeHashes: Set<string>): Promise<FaviconCandidate | null> {
  const { image } = await loadImage(source.url)
  if (!image) return null
  const pixels = fingerprint(image)
  const placeholder = source.sourceType.startsWith('chrome-_favicon') && !!pixels && isDefaultGlobeFingerprint(pixels.hash, globeHashes)
  if (!isUsableIcon(image.naturalWidth, image.naturalHeight, !!pixels?.transparent, placeholder)) return null
  const svg = source.svg
  return {
    url: source.url,
    sourceType: source.sourceType,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    clarity: svg || image.naturalWidth >= Math.ceil(24 * (window.devicePixelRatio || 1)) ? 'clear' : 'blurry',
    svg,
  }
}

function isBetter(candidate: FaviconCandidate, current: FaviconCandidate | null) {
  if (!current) return true
  const score = (item: FaviconCandidate) => item.svg ? Number.POSITIVE_INFINITY : item.naturalWidth
  return score(candidate) > score(current)
}

async function discover(origin: string, input: string, run: Run) {
  await loadCache()
  const now = Date.now()
  const cached = cacheMemory[origin]
  if (cached && isCacheEntryFresh(cached, now) && cached.failed) {
    publish(run, null, true)
    activeRuns.delete(origin)
    return
  }
  const api = extensionApi()
  const sources = faviconCandidates(input, api, isFirefoxExtension())
  if (cached?.url) sources.sort((a, b) => Number(b.url === cached.url) - Number(a.url === cached.url))
  const hasChromiumFavicon = sources.some(source => source.sourceType.startsWith('chrome-_favicon'))
  const globeHashes = hasChromiumFavicon ? await getGlobeFingerprints() : new Set<string>()
  if (!sources.length) { publish(run, null, true); activeRuns.delete(origin); return }
  const source128 = sources.find(source => source.sourceType === 'chrome-_favicon-128')
  const source64 = sources.find(source => source.sourceType === 'chrome-_favicon-64')
  const others = sources.filter(source => source !== source128 && source !== source64)
  let best: FaviconCandidate | null = null
  const probe = async (source: CandidateSource) => {
    const candidate = await probeSource(source, globeHashes)
    if (candidate && isBetter(candidate, best)) {
      best = candidate
      publish(run, best, false)
    }
    return candidate
  }
  const preferred = source128
    ? probe(source128).then(candidate => candidate || (source64 ? probe(source64) : null))
    : source64 ? probe(source64) : Promise.resolve(null)
  await Promise.all([...others.map(probe), preferred])
  const finalBest = best as FaviconCandidate | null
  const savedAt = Date.now()
  const stored: CacheEntry = finalBest
    ? { url: finalBest.url, width: finalBest.naturalWidth, height: finalBest.naturalHeight, svg: finalBest.svg, savedAt, expiresAt: savedAt + ICON_CACHE_TTL_MS }
    : { failed: true, savedAt, expiresAt: savedAt + ICON_NEGATIVE_TTL_MS }
  cacheMemory[origin] = stored
  await saveCache()
  publish(run, finalBest, true)
  activeRuns.delete(origin)
}

export function loadBestFavicon(input: string, displaySize: number, listener: Listener) {
  const origin = getOrigin(input)
  if (!origin) { listener(null, true); return () => {} }
  let run = activeRuns.get(origin)
  if (!run) {
    run = { listeners: new Map(), best: null, complete: false }
    activeRuns.set(origin, run)
    void discover(origin, input, run).catch(() => { publish(run!, null, true); activeRuns.delete(origin) })
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
    else if (storage) await storage.set({ [ICON_CACHE_KEY]: { version: 1, entries: {} } satisfies CacheState })
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
  globeFingerprints = null
}
