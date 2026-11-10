#!/usr/bin/env node
/**
 * Measures the new tab's first paint in the built MV3 extension.
 *
 * Usage:
 *   npm run build
 *   npm run measure:flash -- all /tmp/flash-out
 *   npm run measure:flash -- fresh /tmp/flash-out
 *
 * Scenarios:
 *   fresh      a brand-new browser profile, measured on its first new tab
 *   returning  a warm profile (one unmeasured load), measured on its next new tab
 *   wallpaper  a warm profile with an uploaded generated PNG wallpaper, measured on its next new tab
 *   dismissed  a warm profile with the onboarding-dismissed flag set, measured on its next new tab
 *
 * Each scenario launches Chromium with the built extension (`dist/`) and records:
 * - CDP `Page.startScreencast` JPEG frames (written to `<out>/<scenario>/frames/*.jpg`),
 * - paint entries, `layout-shift` (CLS) and `largest-contentful-paint` via PerformanceObserver,
 * - per-animation-frame DOM/CSS samples (theme, backgrounds, `main.loading`, shortcut count,
 *   wallpaper background, clock/search/tile rects, font status).
 *
 * Files written per scenario: `frames/*.jpg`, `frames.json`, `data.json`.
 * The console prints one row per scenario:
 *   scenario, first captured frame colour, first frame that already matches the scheme background,
 *   FP, FCP, main.loading window, content frame, onboarding frame, max CLS, wallpaper frame, and whether
 *   the wallpaper appeared after the content.
 *
 * Profile directories live under `<out>/profiles/<scenario>` and are recreated for every run,
 * so repeated runs start from the same state. Only Chromium is supported (extensions need a
 * persistent context); nothing in the product is changed by this script.
 *
 * Tolerance against the 0.16.0 audit: the loading window should be at least ~250 ms, `fresh`
 * should show CLS ≥ 0.05, and the first painted frame is still the blank surface rather than
 * the scheme colour. All three are printed so later first-paint tickets can compare numbers.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const args = process.argv.slice(2)
const scenarioArg = args[0] ?? 'all'
const outRoot = resolve(args[1] ?? '/tmp/flash-out')
const SCENARIOS = ['fresh', 'returning', 'wallpaper', 'dismissed']
const VIEWPORT = { width: 1440, height: 900 }

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/manifest.json is missing; run npm run build first')
  process.exit(1)
}
const names = scenarioArg === 'all' ? SCENARIOS : [scenarioArg]
if (names.some(name => !SCENARIOS.includes(name))) {
  console.error(`unknown scenario ${scenarioArg}; use ${SCENARIOS.join(', ')} or all`)
  process.exit(1)
}

/** Runs before every measured document. Samples once per animation frame; capped for long idle pages. */
function instrument() {
  const state = { samples: [], shifts: [], lcp: [] }
  globalThis.__flash = state
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.shifts.push({ t: entry.startTime, value: entry.value, sources: (entry.sources || []).map(source => `${source.node?.tagName ?? ''}.${source.node?.className ?? ''}`.slice(0, 60)) })
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) state.lcp.push({ t: entry.startTime, size: entry.size, el: `${entry.element?.tagName ?? ''}.${entry.element?.className ?? ''}`.slice(0, 60) })
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* Older engines: the rest of the samples still run. */ }
  let frames = 0
  const css = (element, property) => element ? getComputedStyle(element)[property] : ''
  const rect = element => {
    if (!element) return null
    const box = element.getBoundingClientRect()
    return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) }
  }
  const sample = () => {
    const html = document.documentElement
    const body = document.body
    const wallpaper = document.querySelector('.wallpaper-image')
    const tile = document.querySelector('.shortcut')
    const clock = document.querySelector('.mnt-clock')
    const search = document.querySelector('#search, .search-input, input[type=search]')
    state.samples.push({
      t: Math.round(performance.now()),
      ready: document.readyState,
      theme: html.dataset.theme || '',
      scheme: html.dataset.scheme || '',
      htmlBg: css(html, 'backgroundColor'),
      bodyBg: css(body, 'backgroundColor'),
      loading: !!document.querySelector('main.loading'),
      shortcuts: document.querySelectorAll('.shortcut').length,
      onboarding: !!document.querySelector('.onboarding-card'),
      wall: !!wallpaper,
      wallImg: wallpaper ? String(css(wallpaper, 'backgroundImage')).slice(0, 40) : '',
      wallBox: wallpaper ? `${Math.round(wallpaper.getBoundingClientRect().width)}x${Math.round(wallpaper.getBoundingClientRect().height)}` : '',
      clock: rect(clock),
      search: rect(search),
      firstTile: rect(tile),
      fonts: document.fonts.status,
      icons: document.querySelectorAll('.shortcut img, .shortcut .mnt-favicon, .shortcut svg').length,
    })
    frames++
    if (frames < 700) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
}

const launch = userDataDir => chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium',
  headless: true,
  viewport: VIEWPORT,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run', '--no-default-browser-check'],
})

async function openNewTab(page) {
  await page.goto('chrome://newtab/', { waitUntil: 'load' })
  await page.waitForSelector('.shortcut, main.loading', { timeout: 20000 })
}

/** Generates a PNG in the page, picks the image background, and uploads it through the settings UI. */
async function uploadWallpaper(page) {
  await page.locator('.settings-button, .mnt-settings-entry').first().click()
  await page.getByRole('tab', { name: /^(Background|背景)$/ }).click()
  await page.getByRole('radio', { name: /^(Image|图片)$/ }).click()
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 300
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 480, 300)
    gradient.addColorStop(0, '#c7d5dc')
    gradient.addColorStop(0.5, '#627782')
    gradient.addColorStop(1, '#182530')
    context.fillStyle = gradient
    context.fillRect(0, 0, 480, 300)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('.sd-file input[type=file]').first().setInputFiles({ name: 'wallpaper.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })
  await page.waitForFunction(() => {
    const element = document.querySelector('.wallpaper-image')
    return !!element && getComputedStyle(element).backgroundImage.includes('blob:')
  }, null, { timeout: 20000 })
  await page.waitForTimeout(600)
}

/** Prepares a profile for a scenario, without measuring. */
async function prepare(scenario, userDataDir) {
  if (scenario === 'fresh') return
  const context = await launch(userDataDir)
  try {
    const page = await context.newPage()
    await openNewTab(page)
    await page.waitForTimeout(500)
    if (scenario === 'dismissed') {
      await page.evaluate(() => localStorage.setItem('mnt:onboarding:dismissed', 'true'))
      await page.waitForTimeout(300)
    }
    if (scenario === 'wallpaper') await uploadWallpaper(page)
  } finally {
    await context.close()
  }
}

const colourOf = async (page, frame) => {
  const text = await page.evaluate(async dataUrl => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, 16, 16)
    // A corner pixel samples the page surface without letting the clock and tiles dominate the mean.
    const [r, g, b] = context.getImageData(2, 2, 1, 1).data
    return `${r},${g},${b}`
  }, `data:image/jpeg;base64,${frame.data}`)
  const [r, g, b] = text.split(',').map(Number)
  return { r, g, b, text: `rgb(${text})` }
}

const parseColour = value => {
  const hex = /^#([0-9a-f]{6})$/i.exec((value || '').trim())
  if (hex) return { r: parseInt(hex[1].slice(0, 2), 16), g: parseInt(hex[1].slice(2, 4), 16), b: parseInt(hex[1].slice(4, 6), 16) }
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value || '')
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null
}

const closeTo = (a, b) => !!a && !!b && Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) <= 30

async function measure(scenario, userDataDir, outDir) {
  const context = await launch(userDataDir)
  try {
    const page = await context.newPage()
    await page.addInitScript(instrument)
    const cdp = await context.newCDPSession(page)
    const frames = []
    let firstFrameSeen
    const seen = new Promise(resolve => { firstFrameSeen = resolve })
    cdp.on('Page.screencastFrame', event => {
      frames.push({ timestamp: event.metadata.timestamp, data: event.data })
      if (frames.length === 1) firstFrameSeen()
      cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
    })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 75, everyNthFrame: 1, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height })
    // Force a paint on the initial blank page and keep its frame, so frame 0 is always the pre-navigation
    // surface the audit calls the first frame: it must not already be the scheme colour on this build.
    await page.evaluate(() => { document.documentElement.style.background = '#fff'; if (document.body) document.body.style.background = '#fff' })
    await Promise.race([seen, page.waitForTimeout(3000)])
    await page.goto('chrome://newtab/', { waitUntil: 'load' })
    await page.waitForTimeout(4000)
    await cdp.send('Page.stopScreencast').catch(() => {})
    const result = await page.evaluate(() => ({
      origin: performance.timeOrigin,
      url: location.href,
      flash: globalThis.__flash,
      paints: performance.getEntriesByType('paint').map(entry => ({ name: entry.name, t: entry.startTime })),
      navigation: performance.getEntriesByType('navigation').map(entry => ({ domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd, responseEnd: entry.responseEnd })),
      resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name.split('/').pop(), start: Math.round(entry.startTime), duration: Math.round(entry.duration) })),
    }))
    const timeline = frames.map((frame, index) => ({ i: index, t: Math.round(frame.timestamp * 1000 - result.origin) }))
    const paint = name => result.paints.find(entry => entry.name === name)?.t ?? null
    const firstPaint = paint('first-paint')
    const firstContentfulPaint = paint('first-contentful-paint')
    const firstIndex = Math.max(0, timeline.findIndex(frame => frame.t >= 0))
    const firstPaintedIndex = firstPaint === null ? firstIndex : Math.max(0, timeline.findIndex(frame => frame.t >= firstPaint))
    const samples = result.flash.samples
    const schemeValue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-scheme-bg').trim())
    const schemeSample = [...samples].reverse().find(sample => sample.htmlBg && !sample.htmlBg.includes('rgba(0, 0, 0, 0)'))
    const scheme = parseColour(schemeValue) || parseColour(schemeSample?.htmlBg ?? '')
    const firstColour = frames.length ? await colourOf(page, frames[0]) : { text: 'none' }
    // The first frame whose average colour already matches the scheme background. Later tickets use this
    // to prove that the blank surface is gone: it must become 0 when the first frame is themed.
    let firstStyledFrame = null
    for (let index = 0; index < frames.length; index++) {
      const colour = index === 0 ? firstColour : await colourOf(page, frames[index])
      if (closeTo(colour, scheme)) { firstStyledFrame = index; break }
    }
    const loadingStart = samples.find(sample => sample.loading)
    const loadingEnd = loadingStart ? samples.slice(samples.indexOf(loadingStart) + 1).find(sample => !sample.loading) : undefined
    const content = samples.find(sample => sample.shortcuts > 0)
    const onboarding = samples.find(sample => sample.onboarding)
    const wallpaper = samples.find(sample => sample.wallImg.startsWith('url('))
    const cls = result.flash.shifts.reduce((sum, shift) => sum + shift.value, 0)
    const summary = {
      scenario,
      url: result.url,
      frameCount: frames.length,
      sampleCount: samples.length,
      firstFrame: { ...(timeline[0] ?? { i: 0, t: 0 }), colour: firstColour.text },
      firstStyledFrame,
      firstCommittedFrame: timeline[firstIndex] ?? null,
      firstPaintedFrame: timeline[firstPaintedIndex] ?? null,
      firstPaint,
      firstContentfulPaint,
      loading: loadingStart ? { start: loadingStart.t, end: loadingEnd?.t ?? null, duration: loadingEnd ? loadingEnd.t - loadingStart.t : null } : null,
      contentFrame: content?.t ?? null,
      onboardingFrame: onboarding?.t ?? null,
      cls,
      wallpaperFrame: wallpaper?.t ?? null,
      wallpaperAfterContent: !!(content && wallpaper && wallpaper.t > content.t),
      schemeBackground: schemeValue || schemeSample?.htmlBg || '',
      shifts: result.flash.shifts,
      lcp: result.flash.lcp,
      samples,
      paints: result.paints,
      navigation: result.navigation,
      resources: result.resources,
    }
    await mkdir(join(outDir, 'frames'), { recursive: true })
    for (let index = 0; index < frames.length; index++) await writeFile(join(outDir, 'frames', `${String(index).padStart(4, '0')}.jpg`), Buffer.from(frames[index].data, 'base64'))
    await writeFile(join(outDir, 'frames.json'), JSON.stringify(timeline, null, 1))
    await writeFile(join(outDir, 'data.json'), JSON.stringify(summary, null, 1))
    return summary
  } finally {
    await context.close()
  }
}

const fmt = value => value === null || value === undefined ? '—' : String(Math.round(value))
const pad = (value, width) => String(value).padEnd(width)
const rows = []
for (const scenario of names) {
  const userDataDir = join(outRoot, 'profiles', scenario)
  const outDir = join(outRoot, scenario)
  await rm(userDataDir, { recursive: true, force: true })
  await rm(outDir, { recursive: true, force: true })
  await mkdir(userDataDir, { recursive: true })
  await prepare(scenario, userDataDir)
  const summary = await measure(scenario, userDataDir, outDir)
  rows.push(summary)
  const loading = summary.loading ? `${fmt(summary.loading.start)}→${fmt(summary.loading.end)} (${fmt(summary.loading.duration)})` : 'none'
  console.log(`${pad(scenario, 10)} first=${pad(summary.firstFrame.colour, 18)} styled=${pad(fmt(summary.firstStyledFrame), 4)} FP=${pad(fmt(summary.firstPaint), 5)} FCP=${pad(fmt(summary.firstContentfulPaint), 5)} loading=${pad(loading, 17)} content=${pad(fmt(summary.contentFrame), 5)} onboarding=${pad(fmt(summary.onboardingFrame), 5)} CLS=${pad(summary.cls.toFixed(4), 7)} wallpaper=${pad(fmt(summary.wallpaperFrame), 5)} wall>content=${summary.wallpaperAfterContent ? 'yes' : 'no'}`)
}
await writeFile(join(outRoot, 'summary.json'), JSON.stringify(rows, null, 1))
console.log(`wrote ${rows.length} scenario${rows.length === 1 ? '' : 's'} to ${outRoot}`)
