import { expect, test, type Page } from '@playwright/test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { seedExistingUser } from './helpers'

const FAILED = 'https://failed-icon.example.test'
const BRAND = 'https://www.youtube.com'

async function seedAuto(page: Page, name: string, url: string) {
  await seedExistingUser(page, {
    language: 'en', iconSize: 64,
    shortcuts: [{ id: 'auto-icon', name, url, color: '#345678', icon: name[0], iconMode: 'auto' }],
  })
}

/** Records every rendered icon state before React runs, so a letter flash cannot be missed. */
async function watchIcon(page: Page) {
  await page.addInitScript(() => {
    const states: Array<{ text: string; img: string | null; svg: boolean }> = []
    ;(window as typeof window & { iconStates?: typeof states }).iconStates = states
    new MutationObserver(() => {
      const icon = document.querySelector('.shortcut-icon')
      if (!icon) return
      states.push({ text: icon.textContent || '', img: icon.querySelector('img')?.getAttribute('src') ?? null, svg: !!icon.querySelector('svg') })
    }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true })
  })
}

const iconStates = (page: Page) => page.evaluate(() => (window as typeof window & { iconStates: Array<{ text: string; img: string | null; svg: boolean }> }).iconStates)

const iconVisible = (page: Page) => page.evaluate(() => {
  const image = document.querySelector('.shortcut-icon img') as HTMLImageElement | null
  return !!image && image.complete && image.naturalWidth > 0 && getComputedStyle(image).visibility === 'visible'
})

/** A real HTTP server keeps the icon in Chromium's immutable disk/memory cache; route interception does not. */
async function startIconServer() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#3a7"/></svg>'
  const hits: string[] = []
  const server = createServer((request, response) => {
    hits.push(request.url || '')
    if (request.url === '/favicon.svg') {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Content-Length': Buffer.byteLength(svg), 'Cache-Control': 'public, max-age=31536000, immutable' })
      response.end(svg)
    } else {
      response.writeHead(404)
      response.end('missing')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    site: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    hits,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  }
}

/** Waits until the first page has discovered, loaded and cached the icon. */
async function cacheIcon(page: Page, site: string) {
  await seedAuto(page, 'Cached', site)
  await page.goto('/')
  await expect(page.locator('.shortcut-icon img')).toHaveAttribute('src', `${site}/favicon.svg`)
  await expect.poll(() => page.evaluate(() => {
    const image = document.querySelector('.shortcut-icon img') as HTMLImageElement | null
    return !!image && image.complete && image.naturalWidth > 0
  })).toBe(true)
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem('mnt.iconCache:v3') || 'null')?.[key]?.url, site)).toBe(`${site}/favicon.svg`)
}

test('a cached icon is visible on a second page opened while the first stays open', async ({ page, context }) => {
  const server = await startIconServer()
  try {
    await cacheIcon(page, server.site)
    const second = await context.newPage()
    await second.goto('/')
    await expect(second.locator('.shortcut-icon img')).toHaveAttribute('src', `${server.site}/favicon.svg`)
    await expect.poll(() => second.evaluate(() => {
      const image = document.querySelector('.shortcut-icon img') as HTMLImageElement | null
      return !!image && image.complete && image.naturalWidth > 0
    })).toBe(true)
    // The reload keeps the renderer's memory cache warm, which is the condition of a second tab
    // whose image was already decoded. The load event can then fire before passive mount effects.
    await second.reload()
    await expect.poll(() => iconVisible(second), { timeout: 2_000 }).toBe(true)
    await second.close()
  } finally {
    await server.close()
  }
})

test('cached icons are visible when two pages open concurrently', async ({ page, context }) => {
  const server = await startIconServer()
  try {
    await cacheIcon(page, server.site)
    const [first, second] = await Promise.all([context.newPage(), context.newPage()])
    await Promise.all([first.goto('/'), second.goto('/')])
    for (const tab of [first, second]) {
      await expect(tab.locator('.shortcut-icon img')).toHaveAttribute('src', `${server.site}/favicon.svg`)
      await expect.poll(() => tab.evaluate(() => {
        const image = document.querySelector('.shortcut-icon img') as HTMLImageElement | null
        return !!image && image.complete && image.naturalWidth > 0
      })).toBe(true)
    }
    await Promise.all([first.reload(), second.reload()])
    await expect.poll(() => iconVisible(first), { timeout: 2_000 }).toBe(true)
    await expect.poll(() => iconVisible(second), { timeout: 2_000 }).toBe(true)
    await first.close()
    await second.close()
  } finally {
    await server.close()
  }
})

test('a cached success paints its image on the second open with no discovery requests', async ({ page, context }) => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#3a7"/></svg>'
  const hits: string[] = []
  const server = createServer((request, response) => {
    hits.push(request.url || '')
    if (request.url === '/favicon.svg') {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Content-Length': Buffer.byteLength(svg), 'Cache-Control': 'public, max-age=31536000, immutable' })
      response.end(svg)
    } else {
      response.writeHead(404)
      response.end('missing')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const site = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    await seedAuto(page, 'Cached', site)
    await page.goto('/')
    await expect(page.locator('.shortcut-icon img')).toHaveAttribute('src', `${site}/favicon.svg`)
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem('mnt.iconCache:v3') || 'null')?.[key]?.url, site)).toBe(`${site}/favicon.svg`)

    const before = hits.length
    const second = await context.newPage()
    await watchIcon(second)
    await second.goto('/')
    await expect(second.locator('.shortcut-icon img')).toHaveAttribute('src', `${site}/favicon.svg`)
    await second.waitForTimeout(500)
    const states = await iconStates(second)
    expect(states.length).toBeGreaterThan(0)
    expect(states[0]?.img).toBe(`${site}/favicon.svg`)
    expect(states.some(state => state.text === 'C')).toBe(false)
    expect(hits.slice(before)).toEqual([])
    await second.close()
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('a cached failure paints the letter with no requests, then retries after the backoff', async ({ page, context }) => {
  await page.route(`${FAILED}/**`, route => route.fulfill({ status: 404, body: 'missing' }))
  await seedAuto(page, 'Failed', FAILED)
  await page.goto('/')
  await expect(page.locator('.shortcut-icon')).toContainText('F')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mnt.iconCache:v3') || 'null')?.['https://failed-icon.example.test']?.failed)).toBe(true)

  const second = await context.newPage()
  const requests: string[] = []
  await second.route(`${FAILED}/**`, route => { requests.push(route.request().url()); return route.fulfill({ status: 404, body: 'missing' }) })
  await watchIcon(second)
  await second.goto('/')
  await expect(second.locator('.shortcut-icon')).toContainText('F')
  await second.waitForTimeout(500)
  expect(requests).toEqual([])
  expect((await iconStates(second)).some(state => state.text === 'F')).toBe(true)

  await second.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('mnt.iconCache:v3')!)
    state['https://failed-icon.example.test'].expiresAt = Date.now() - 1
    localStorage.setItem('mnt.iconCache:v3', JSON.stringify(state))
  })
  await second.reload()
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  await second.close()
})

test('a cached brand paints the mark on the second open with no letter and no requests', async ({ page, context }) => {
  await page.route(`${BRAND}/**`, route => route.fulfill({ status: 404, body: 'missing' }))
  await seedAuto(page, 'YouTube', BRAND)
  await page.goto('/')
  await expect(page.locator('.shortcut-icon svg path')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mnt.iconCache:v3') || 'null')?.['https://www.youtube.com']?.brand?.slug)).toBe('youtube')

  const second = await context.newPage()
  const requests: string[] = []
  await second.route(`${BRAND}/**`, route => { requests.push(route.request().url()); return route.fulfill({ status: 404, body: 'missing' }) })
  await watchIcon(second)
  await second.goto('/')
  await expect(second.locator('.shortcut-icon svg path')).toHaveCount(1)
  await second.waitForTimeout(500)
  const states = await iconStates(second)
  expect(states.some(state => state.svg)).toBe(true)
  expect(states.some(state => state.text === 'Y')).toBe(false)
  expect(requests).toEqual([])
  await second.close()
})
