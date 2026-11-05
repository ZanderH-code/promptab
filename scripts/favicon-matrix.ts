import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { cp, mkdtemp, rm, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, firefox, type Browser, type BrowserContext, type Page } from 'playwright'
import { type ExtensionApi } from '../src/core/favicon'
import { chooseBestIcon, faviconCandidates } from '../src/core/faviconQuality'
import { STARTER_SITES } from '../src/core/starter-sites'

type MatrixEntry = { id: string; category: string; url: string; addedDate: string }
type NetworkResult = { status?: number; contentType?: string; corp?: string; cfMitigated?: string; finalUrl?: string; requestFailure?: string; headersReady?: Promise<void> }
type CandidateResult = {
  url: string; sourceType: string; status: number | null; contentType: string | null; finalUrl: string | null
  corp: string | null; cfMitigated: string | null; metadataSource: 'browser' | 'unauthenticated-http-probe' | 'none'
  naturalWidth: number; naturalHeight: number; loaded: boolean; placeholder: boolean; svg: boolean; clarity: 'clear' | 'blurry' | 'not-found'
  elapsedMs: number; failureReason: string | null
}

const ROOT = path.resolve(import.meta.dirname, '..')
const MATRIX_PATH = path.join(ROOT, 'e2e/fixtures/favicon-matrix.json')
const allMatrix = JSON.parse(readFileSync(MATRIX_PATH, 'utf8')) as MatrixEntry[]
const matrix = allMatrix.slice(0, Number(process.env.FAVICON_LIMIT || allMatrix.length))
const DISPLAY_SIZE = Number(process.env.FAVICON_DISPLAY_SIZE || 72)
const DPR = Number(process.env.FAVICON_DPR || 1)
const TIMEOUT_MS = Number(process.env.FAVICON_TIMEOUT_MS || 4500)
const LABEL = process.argv.find(arg => arg.startsWith('--label='))?.slice('--label='.length) || 'main'
const OUTPUT_DIR = path.join(ROOT, 'store')

function validateMatrix() {
  const ids = new Set<string>()
  const urls = new Set<string>()
  for (const entry of allMatrix) {
    if (!entry.id || !entry.category || !entry.addedDate) throw new Error(`Matrix entry is missing metadata: ${JSON.stringify(entry)}`)
    if (ids.has(entry.id)) throw new Error(`Duplicate favicon matrix id: ${entry.id}`)
    ids.add(entry.id)
    const origin = new URL(entry.url).origin
    if (urls.has(entry.id + origin)) throw new Error(`Duplicate matrix id/origin: ${entry.id} ${origin}`)
    urls.add(entry.id + origin)
  }
  const matrixOrigins = new Set(allMatrix.map(entry => new URL(entry.url).origin))
  const missingStarters = STARTER_SITES.filter(site => !matrixOrigins.has(new URL(site.url).origin))
  if (missingStarters.length) throw new Error(`Starter site coverage missing: ${missingStarters.map(site => site.url).join(', ')}`)
  if (allMatrix.length < 60) throw new Error(`Favicon matrix needs at least 60 sites, got ${allMatrix.length}`)
  const counts = new Map<string, number>()
  for (const entry of allMatrix) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
  for (const category of ['search', 'mail', 'maps', 'social', 'video', 'ecommerce', 'ai', 'developer-tools', 'news', 'office', 'cloud-storage', 'music']) {
    if ((counts.get(category) ?? 0) < 3) throw new Error(`Category ${category} needs at least 3 sites`)
  }
}

function sourceType(source: string, contentType?: string | null) {
  const url = new URL(source)
  if (url.pathname.endsWith('/_favicon/')) return 'chrome-_favicon'
  const name = url.pathname.split('/').at(-1)?.toLowerCase() || ''
  if (name === 'apple-touch-icon.png' || name === 'apple-touch-icon-precomposed.png') return name.replace('.png', '')
  if (name.endsWith('.svg') || contentType?.includes('image/svg+xml')) return 'favicon.svg'
  if (name.includes('favicon-32x32')) return 'favicon-32x32.png'
  if (name.endsWith('favicon.ico') || contentType?.includes('icon')) return 'favicon.ico'
  return contentType?.startsWith('image/') ? contentType : 'unknown'
}

async function staticServer(directory: string) {
  const root = path.resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname)
      let filename = path.resolve(root, `.${pathname}`)
      if (!filename.startsWith(root + path.sep) && filename !== root) { response.writeHead(403).end(); return }
      let info = await stat(filename)
      if (info.isDirectory()) { filename = path.join(filename, 'index.html'); info = await stat(filename) }
      const contentType = filename.endsWith('.html') ? 'text/html' : filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : filename.endsWith('.json') ? 'application/json' : filename.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream'
      response.writeHead(200, { 'content-type': contentType, 'content-length': info.size })
      createReadStream(filename).pipe(response)
    } catch { response.writeHead(404).end() }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Cannot start local favicon diagnostic server')
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}

function extensionId(extensionPath: string) {
  const digest = createHash('sha256').update(extensionPath).digest().subarray(0, 16)
  return [...digest].map(byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('')
}

async function fingerprintImage(page: Page, src: string) {
  return page.evaluate(async source => {
    const image = new Image()
    image.referrerPolicy = 'no-referrer'
    const loaded = await new Promise<boolean>(resolve => {
      const timer = setTimeout(() => resolve(false), 8000)
      image.onload = () => { clearTimeout(timer); resolve(true) }
      image.onerror = () => { clearTimeout(timer); resolve(false) }
      image.src = source
    })
    if (!loaded) return null
    try {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) return null
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let hash = 2166136261
      for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619)
      return `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16).padStart(8, '0')}`
    } catch { return null }
  }, src)
}

async function probeHttp(source: string) {
  if (!/^https?:\/\//i.test(source)) return null
  try {
    const response = await fetch(source, { redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(TIMEOUT_MS) })
    const result = { status: response.status, contentType: response.headers.get('content-type'), corp: response.headers.get('cross-origin-resource-policy'), cfMitigated: response.headers.get('cf-mitigated'), finalUrl: response.url }
    await response.body?.cancel()
    return result
  } catch (error) { return { status: null, contentType: null, corp: null, cfMitigated: null, finalUrl: null, error: String(error) } }
}

async function probeCandidate(page: Page, source: string, network: Map<string, NetworkResult>, placeholderFingerprints: Set<string>): Promise<CandidateResult> {
  const before = network.get(source)
  const started = Date.now()
  const result = await page.evaluate(({ src, timeoutMs }) => new Promise<{ width: number; height: number; loaded: boolean; elapsedMs: number; fingerprint: string | null; transparent: boolean }>(resolve => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.referrerPolicy = 'no-referrer'
    const start = performance.now()
    const timer = setTimeout(() => resolve({ width: image.naturalWidth, height: image.naturalHeight, loaded: false, elapsedMs: performance.now() - start, fingerprint: null, transparent: false }), timeoutMs)
    image.onload = () => {
      clearTimeout(timer)
      let fingerprint: string | null = null
      let transparent = false
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (context) {
          context.drawImage(image, 0, 0)
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
          let hash = 2166136261, allClear = true
          for (let i = 0; i < pixels.length; i += 4) {
            hash = Math.imul(hash ^ pixels[i]!, 16777619)
            hash = Math.imul(hash ^ pixels[i + 1]!, 16777619)
            hash = Math.imul(hash ^ pixels[i + 2]!, 16777619)
            hash = Math.imul(hash ^ pixels[i + 3]!, 16777619)
            if (pixels[i + 3] !== 0) allClear = false
          }
          fingerprint = `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16).padStart(8, '0')}`
          transparent = allClear
        }
      } catch { /* Cross-origin image pixels are intentionally unreadable without site CORS. */ }
      resolve({ width: image.naturalWidth, height: image.naturalHeight, loaded: true, elapsedMs: performance.now() - start, fingerprint, transparent })
    }
    image.onerror = () => { clearTimeout(timer); resolve({ width: image.naturalWidth, height: image.naturalHeight, loaded: false, elapsedMs: performance.now() - start, fingerprint: null, transparent: false }) }
    image.src = src
  }), { src: source, timeoutMs: TIMEOUT_MS })
  let response = network.get(source) ?? before ?? {}
  for (let wait = 0; wait < 250 && !response.status && !response.requestFailure; wait += 10) {
    await new Promise(resolve => setTimeout(resolve, 10))
    response = network.get(source) ?? response
  }
  await response.headersReady
  const http = await probeHttp(source)
  const metadataSource = response.status !== undefined ? 'browser' : http ? 'unauthenticated-http-probe' : 'none'
  const status = response.status ?? http?.status ?? null
  const contentType = response.contentType ?? http?.contentType ?? null
  const corp = response.corp ?? http?.corp ?? null
  const cfMitigated = response.cfMitigated ?? http?.cfMitigated ?? null
  const finalUrl = response.finalUrl ?? http?.finalUrl ?? null
  const placeholder = placeholderFingerprints.has(result.fingerprint ?? '')
  let failureReason: string | null = null
  if (placeholder) failureReason = 'default-globe-placeholder'
  else if (cfMitigated === 'challenge') failureReason = 'bot-challenge'
  else if (!result.loaded && corp?.toLowerCase() === 'same-origin') failureReason = 'blocked-by-corp-same-origin'
  else if (!result.loaded && response.requestFailure) failureReason = response.requestFailure
  else if (!result.loaded && status) failureReason = `image-decode-or-policy-error-http-${status}`
  else if (!result.loaded && Date.now() - started >= TIMEOUT_MS) failureReason = 'timeout'
  else if (!result.loaded && http?.error) failureReason = `http-probe-failed:${http.error}`
  else if (!result.loaded) failureReason = 'image-load-failed'
  else if (result.width === 1 && result.height === 1) failureReason = 'one-by-one-image'
  else if (result.transparent) failureReason = 'transparent-image'
  else if (contentType && !contentType.startsWith('image/')) failureReason = `content-type-${contentType}`
  const valid = result.loaded && !failureReason && result.width > 1 && result.height > 1
  const svg = source.toLowerCase().endsWith('.svg') || contentType?.includes('image/svg+xml')
  return {
    url: source,
    sourceType: sourceType(source, contentType),
    status,
    contentType,
    finalUrl,
    corp,
    cfMitigated,
    metadataSource,
    naturalWidth: result.width,
    naturalHeight: result.height,
    loaded: result.loaded,
    placeholder,
    svg,
    clarity: !valid ? 'not-found' : svg || result.width >= DISPLAY_SIZE * DPR ? 'clear' : 'blurry',
    elapsedMs: Math.round(result.elapsedMs),
    failureReason,
  }
}

async function attachNetworkTracking(page: Page) {
  const network = new Map<string, NetworkResult>()
  const rootUrl = (request: import('playwright').Request) => {
    let first = request
    while (first.redirectedFrom()) first = first.redirectedFrom()!
    return first.url()
  }
  page.on('request', request => { network.set(rootUrl(request), network.get(rootUrl(request)) ?? {}) })
  page.on('response', response => {
    const originalUrl = rootUrl(response.request())
    const result: NetworkResult = { ...network.get(originalUrl), status: response.status(), finalUrl: response.url() }
    result.headersReady = response.allHeaders().then(headers => {
      result.contentType = headers['content-type'] ?? undefined
      result.corp = headers['cross-origin-resource-policy'] ?? undefined
      result.cfMitigated = headers['cf-mitigated'] ?? undefined
    }).catch(() => {})
    network.set(originalUrl, result)
  })
  page.on('requestfailed', request => {
    const originalUrl = rootUrl(request)
    const result = network.get(originalUrl) ?? {}
    result.requestFailure = request.failure()?.errorText ?? 'request-failed'
    network.set(originalUrl, result)
  })
  return network
}

async function mapLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await work(items[index]!)
    }
  }))
  return results
}

async function probeCandidates(page: Page, candidates: string[], network: Map<string, NetworkResult>, placeholderFingerprints: Set<string>) {
  const checked: CandidateResult[] = []
  for (const candidate of candidates) checked.push(await probeCandidate(page, candidate, network, placeholderFingerprints))
  return checked
}

function summarizeSite(entry: MatrixEntry, checked: CandidateResult[]) {
  const usable = checked.filter(candidate => candidate.loaded && !candidate.failureReason && candidate.naturalWidth > 1 && candidate.naturalHeight > 1)
  const selected = chooseBestIcon(usable.map(candidate => ({
    url: candidate.url, sourceType: candidate.sourceType, naturalWidth: candidate.naturalWidth,
    naturalHeight: candidate.naturalHeight, clarity: candidate.clarity === 'clear' ? 'clear' as const : 'blurry' as const, svg: candidate.svg,
  })))
  const final = selected ? checked.find(candidate => candidate.url === selected.url) : undefined
  return {
    ...entry,
    candidates: checked,
    found: !!final,
    sourceType: final?.sourceType ?? 'text-fallback',
    sourceUrl: final?.url ?? null,
    naturalWidth: final?.naturalWidth ?? 0,
    naturalHeight: final?.naturalHeight ?? 0,
    clarity: final?.clarity ?? 'not-found',
    failureReason: final ? null : checked.find(candidate => candidate.failureReason)?.failureReason ?? 'all-candidates-failed',
  }
}

function summarize(platforms: any[]) {
  const all = platforms.flatMap(platform => platform.results)
  const group = (key: 'category' | 'sourceType') => {
    const counts = new Map<string, { total: number; found: number; clear: number }>()
    for (const result of all) {
      const value = result[key] as string
      const count = counts.get(value) ?? { total: 0, found: 0, clear: 0 }
      count.total++
      if (result.found) count.found++
      if (result.clarity === 'clear') count.clear++
      counts.set(value, count)
    }
    return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => [name, { ...count, hitRate: count.total ? count.found / count.total : 0, clarityRate: count.total ? count.clear / count.total : 0 }]))
  }
  return {
    sitesPerPlatform: platforms.map(platform => ({ platform: platform.id, total: platform.results.length, hits: platform.results.filter((result: any) => result.found).length, clear: platform.results.filter((result: any) => result.clarity === 'clear').length })),
    overall: { total: all.length, hits: all.filter(result => result.found).length, clear: all.filter(result => result.clarity === 'clear').length },
    byCategory: group('category'), bySourceType: group('sourceType'),
  }
}

function reanalyze(report: any) {
  for (const platform of report.platforms) for (const result of platform.results) {
    const usable = result.candidates.filter((candidate: CandidateResult) => candidate.loaded && !candidate.failureReason && candidate.naturalWidth > 1 && candidate.naturalHeight > 1)
    const selected = chooseBestIcon(usable.map((candidate: CandidateResult) => ({
      url: candidate.url, sourceType: candidate.sourceType, naturalWidth: candidate.naturalWidth,
      naturalHeight: candidate.naturalHeight, clarity: candidate.clarity === 'clear' ? 'clear' as const : 'blurry' as const, svg: candidate.svg,
    })))
    const final = selected ? usable.find((candidate: CandidateResult) => candidate.url === selected.url) : undefined
    Object.assign(result, {
      found: !!final, sourceType: final?.sourceType ?? 'text-fallback', sourceUrl: final?.url ?? null,
      naturalWidth: final?.naturalWidth ?? 0, naturalHeight: final?.naturalHeight ?? 0,
      clarity: final?.clarity ?? 'not-found', failureReason: final ? null : result.candidates.find((candidate: CandidateResult) => candidate.failureReason)?.failureReason ?? 'all-candidates-failed',
    })
  }
  report.summary = summarize(report.platforms)
  return report
}

function markdown(report: any) {
  const siteRows = report.platforms.flatMap((platform: any) => platform.results.map((result: any) => `| ${platform.id} | ${result.id} | ${result.category} | ${result.found ? 'yes' : 'no'} | ${result.sourceType ?? 'none'} | ${result.sourceUrl ?? '—'} | ${result.naturalWidth || 0}×${result.naturalHeight || 0} | ${result.clarity} | ${result.failureReason ?? '—'} |`))
  const candidateRows = report.platforms.flatMap((platform: any) => platform.results.flatMap((result: any) => result.candidates.map((candidate: any) => `| ${platform.id} | ${result.id} | ${candidate.sourceType} | ${candidate.url} | ${candidate.status ?? '—'} | ${candidate.contentType ?? '—'} | ${candidate.naturalWidth}×${candidate.naturalHeight} | ${candidate.loaded ? 'loaded' : 'failed'} | ${candidate.elapsedMs} | ${candidate.corp ?? '—'} | ${candidate.metadataSource} | ${candidate.failureReason ?? '—'} |`)))
  const summary = report.summary.sitesPerPlatform.map((item: any) => `| ${item.platform} | ${item.hits}/${item.total} (${percent(item.hits, item.total)}) | ${item.clear}/${item.total} (${percent(item.clear, item.total)}) |`).join('\n')
  const categories = Object.entries(report.summary.byCategory).map(([name, value]: [string, any]) => `| ${name} | ${value.found}/${value.total} (${percent(value.found, value.total)}) | ${value.clear}/${value.total} (${percent(value.clear, value.total)}) |`).join('\n')
  const sources = Object.entries(report.summary.bySourceType).map(([name, value]: [string, any]) => `| ${name} | ${value.found}/${value.total} (${percent(value.found, value.total)}) | ${value.clear}/${value.total} (${percent(value.clear, value.total)}) |`).join('\n')
  const errors = report.platforms.filter((platform: any) => platform.error).map((platform: any) => `- ${platform.id}: ${platform.error.replaceAll('\n', ' ')}`).join('\n') || '- None'
  return `# Favicon quality matrix: ${report.label}\n\n- Run date: ${report.runDate}\n- Source commit: ${report.commit}\n- Environment: ${report.environment.os} ${report.environment.release} ${report.environment.arch}; Chromium ${report.environment.chromium ?? 'unavailable'}; Firefox ${report.environment.firefox ?? 'unavailable'}\n- Matrix sites: ${report.matrixCount}; display size: ${report.displaySize}px; DPR: ${report.devicePixelRatio}\n- External access is best-effort and time-sensitive; this report is not a CI gate. Browser image load and unauthenticated HTTP header probes are recorded separately.\n\n## Summary\n\n| Platform | Hit rate | Clear rate |\n|---|---:|---:|\n${summary}\n\n## Per-site final result\n\n| Platform | ID | Category | Found | Source type | Source URL | Natural size | Clarity | Failure |\n|---|---|---|---:|---|---|---:|---|---|\n${siteRows.join('\n')}\n\n## Candidate diagnostics\n\n` + (candidateRows.length ? `| Platform | ID | Candidate | URL | HTTP | Content type | Natural size | Browser image | Time ms | CORP | Metadata source | Failure |\n|---|---|---|---|---:|---|---:|---|---:|---|---|---|\n${candidateRows.join('\n')}` : 'No candidate requests ran.') + `\n\n## Category rates\n\n| Category | Found | Clear |\n|---|---:|---:|\n${categories}\n\n## Source rates\n\n| Source | Found | Clear |\n|---|---:|---:|\n${sources}\n\n## Platform limitations\n\n${errors}\n`
}

function percent(value: number, total: number) { return total ? `${Math.round(value * 100 / total)}%` : '0%' }

async function main() {
  validateMatrix()
  if (process.env.FAVICON_RENDER_JSON) {
    const jsonPath = path.resolve(ROOT, process.env.FAVICON_RENDER_JSON)
    let report = JSON.parse(readFileSync(jsonPath, 'utf8'))
    if (process.env.FAVICON_MARK_DIRTY) {
      report.commit = `${report.commit.replace(/-dirty$/, '')}-dirty`
      await import('node:fs/promises').then(fs => fs.writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n'))
    }
    if (process.env.FAVICON_REANALYZE_JSON) {
      report = reanalyze(report)
      await import('node:fs/promises').then(fs => fs.writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n'))
    }
    const markdownPath = jsonPath.replace(/\.json$/, '.md')
    await import('node:fs/promises').then(fs => fs.writeFile(markdownPath, markdown(report)))
    console.log(JSON.stringify({ jsonPath, markdownPath, renderedFromExistingData: true, reanalyzed: !!process.env.FAVICON_REANALYZE_JSON }))
    return
  }
  const web = await staticServer(path.join(ROOT, 'dist-web'))
  const ff = await staticServer(path.join(ROOT, 'dist-firefox'))
  const platforms: any[] = []
  const extensionProfile = await mkdtemp(path.join(tmpdir(), 'promptab-favicon-matrix-profile-'))
  const extensionDir = path.join(extensionProfile, 'extension')
  await cp(path.join(ROOT, 'dist'), extensionDir, { recursive: true })
  let chromiumBrowser: Browser | undefined
  let extensionContext: BrowserContext | undefined
  let webContext: BrowserContext | undefined
  let firefoxBrowser: Browser | undefined
  let firefoxContext: BrowserContext | undefined
  try {
    const extId = extensionId(extensionDir)
    try {
      extensionContext = await chromium.launchPersistentContext(path.join(extensionProfile, 'user-data'), {
        headless: true, channel: 'chromium', viewport: { width: 1200, height: 6000 }, deviceScaleFactor: DPR,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: ['--no-first-run', `--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
      })
      chromiumBrowser = extensionContext.browser() ?? undefined
      const page = extensionContext.pages()[0] ?? await extensionContext.newPage()
      await page.goto(`chrome-extension://${extId}/index.html`, { waitUntil: 'domcontentloaded' })
      const api = { runtime: { getURL: (name: string) => `chrome-extension://${extId}${name}` } } as ExtensionApi
      const network = await attachNetworkTracking(page)
      const sentinelCandidates = faviconCandidates(`https://promptab-${Date.now()}-${Math.random().toString(36).slice(2)}.invalid/`, api, false).filter(candidate => candidate.sourceType.startsWith('chrome-_favicon'))
      const sentinelHashes = await Promise.all(sentinelCandidates.map(candidate => fingerprintImage(page, candidate.url)))
      const placeholderFingerprints = new Set(sentinelHashes.filter((hash): hash is string => !!hash))
      const results = await mapLimit(matrix, 3, async entry => {
        const candidates = faviconCandidates(entry.url, api, false).map(candidate => candidate.url)
        const checked = await probeCandidates(page, candidates, network, placeholderFingerprints)
        return summarizeSite(entry, checked)
      })
      platforms.push({ id: 'chromium-extension', browserVersion: chromiumBrowser.version(), results })
    } catch (error) {
      platforms.push({ id: 'chromium-extension', error: String(error), results: [] })
    }

    try {
      chromiumBrowser ??= await chromium.launch({ headless: true })
      webContext = await chromiumBrowser.newContext({ viewport: { width: 1200, height: 6000 }, deviceScaleFactor: DPR })
      const page = await webContext.newPage()
      await page.goto(web.url, { waitUntil: 'domcontentloaded' })
      const network = await attachNetworkTracking(page)
      const results = await mapLimit(matrix, 3, async entry => {
        const candidates = faviconCandidates(entry.url, undefined, false).map(candidate => candidate.url)
        const checked = await probeCandidates(page, candidates, network, new Set())
        return summarizeSite(entry, checked)
      })
      platforms.push({ id: 'web', browserVersion: chromiumBrowser.version(), results })
    } catch (error) { platforms.push({ id: 'web', error: String(error), results: [] }) }

    try {
      firefoxBrowser = await firefox.launch({ headless: true })
      firefoxContext = await firefoxBrowser.newContext({ viewport: { width: 1200, height: 6000 }, deviceScaleFactor: DPR })
      const page = await firefoxContext.newPage()
      await page.goto(ff.url, { waitUntil: 'domcontentloaded' })
      const network = await attachNetworkTracking(page)
      const results = await mapLimit(matrix, 3, async entry => {
        const candidates = faviconCandidates(entry.url, undefined, true).map(candidate => candidate.url)
        const checked = await probeCandidates(page, candidates, network, new Set())
        return summarizeSite(entry, checked)
      })
      platforms.push({ id: 'firefox-build', browserVersion: firefoxBrowser.version(), results })
    } catch (error) { platforms.push({ id: 'firefox-build', error: String(error), results: [] }) }

    const childProcess = await import('node:child_process')
    const revision = childProcess.execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
    const dirty = !!childProcess.execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim()
    const report = {
      label: LABEL, runDate: new Date().toISOString().slice(0, 10), commit: dirty ? `${revision}-dirty` : revision,
      environment: { os: process.platform, release: (await import('node:os')).release(), arch: process.arch, chromium: platforms.find(p => p.id === 'chromium-extension')?.browserVersion, firefox: platforms.find(p => p.id === 'firefox-build')?.browserVersion },
      matrixCount: matrix.length, displaySize: DISPLAY_SIZE, devicePixelRatio: DPR, platforms, summary: summarize(platforms),
    }
    const basename = `favicon-matrix-${report.runDate}-${LABEL}`
    const jsonPath = path.join(OUTPUT_DIR, `${basename}.json`)
    const markdownPath = path.join(OUTPUT_DIR, `${basename}.md`)
    await import('node:fs/promises').then(fs => Promise.all([fs.writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n'), fs.writeFile(markdownPath, markdown(report))]))
    console.log(JSON.stringify({ jsonPath, markdownPath, matrixCount: matrix.length, summary: report.summary, platformErrors: platforms.filter(p => p.error).map(p => ({ platform: p.id, error: p.error })) }, null, 2))
  } finally {
    await Promise.allSettled([extensionContext?.close(), webContext?.close(), firefoxContext?.close()])
    if (chromiumBrowser) await chromiumBrowser.close().catch(() => {})
    if (firefoxBrowser) await firefoxBrowser.close().catch(() => {})
    await web.close(); await ff.close()
    await rm(extensionProfile, { recursive: true, force: true })
  }
}

void main()
