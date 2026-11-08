import { chromium, expect, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

declare const chrome: {
  storage: { local: { get(keys: null | string | string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } }
}

export type SeedItem = { id: string; name: string; url?: string }
export type SeedGroup = { id: string; name: string; items: SeedItem[] }
export type StoredItem = Record<string, unknown> & { id: string }
export type StoredGroup = { id: string; name: string; collapsed: boolean; items: StoredItem[] }
export type ExtensionSession = { context: BrowserContext; extensionId: string; page: Page; close(): Promise<void> }

/** Chrome derives an unpacked extension id from the absolute path: sha256, 32 hex chars, 0-f mapped to a-p. */
export function extensionIdFor(dist: string): string {
  return createHash('sha256').update(dist).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, char => 'abcdefghijklmnop'[parseInt(char, 16)])
}

export function legacySettings(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1, language: 'en', theme: 'dark', accent: '#90d5cd', background: '#102932',
    showClock: true, showDate: true, showSearch: true, hour12: false,
    searchTemplate: 'https://www.google.com/search?q={query}',
    shortcuts: [{ id: 'example', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E' }],
    columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35,
    ...overrides,
  }
}

/**
 * Launches Chromium with the built extension loaded. The initial page stays on a static
 * extension resource so tests can seed `chrome.storage.local` before the app first boots.
 * A missing or unloadable extension throws: these tests must never silently skip.
 */
export async function launchExtension(options: { viewport?: { width: number; height: number }; hasTouch?: boolean } = {}): Promise<ExtensionSession> {
  const dist = resolve('dist')
  if (!existsSync(join(dist, 'manifest.json'))) throw new Error(`The extension is not built: ${join(dist, 'manifest.json')} is missing`)
  const userDataDir = mkdtempSync(join(tmpdir(), 'promptab-extension-e2e-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    locale: 'en-US',
    viewport: options.viewport ?? { width: 1280, height: 800 },
    ...(options.hasTouch ? { hasTouch: true } : {}),
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  })
  const fromWorker = context.serviceWorkers().map(worker => worker.url().match(/^chrome-extension:\/\/([a-p]{32})\//)?.[1]).find(Boolean)
  const extensionId = fromWorker ?? extensionIdFor(dist)
  const page = context.pages()[0] ?? await context.newPage()
  try {
    await page.goto(`chrome-extension://${extensionId}/manifest.json`)
    const usable = await page.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage?.local)
    if (!usable) throw new Error('chrome.storage is unavailable')
    await page.locator('body').waitFor({ state: 'attached' })
  } catch (error) {
    await context.close()
    throw new Error(`The built extension could not be loaded from ${dist} (id ${extensionId}): ${error instanceof Error ? error.message : String(error)}`)
  }
  return { context, extensionId, page, close: () => context.close() }
}

/** Seeds the legacy settings envelope the app migrates on first boot. */
export async function seedSettings(session: ExtensionSession, overrides: Record<string, unknown> = {}) {
  await session.page.goto(`chrome-extension://${session.extensionId}/manifest.json`)
  await session.page.evaluate(async settings => { await chrome.storage.local.set({ settings }) }, legacySettings(overrides))
}

export async function openApp(session: ExtensionSession, page: Page = session.page) {
  await page.goto(`chrome-extension://${session.extensionId}/index.html`)
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.bookmarks')).toBeVisible()
  return page
}

/** Replaces the bootstrapped profile's groups; keeps every required field by cloning a migrated item. */
export async function seedGroups(page: Page, groups: SeedGroup[]) {
  await page.evaluate(async spec => {
    const all = await chrome.storage.local.get(null)
    const index = JSON.parse(String(all['profiles:v2:index'])) as { revision: number; generation: string }
    const key = `profiles:v2:generation:${index.generation}`
    const snapshot = JSON.parse(String(all[key]))
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    const template = profile.bookmarks.groups.flatMap((group: StoredGroup) => group.items)[0]
    profile.bookmarks.groups = spec.map(group => ({
      id: group.id,
      name: group.name,
      collapsed: false,
      items: group.items.map(item => ({
        ...template,
        id: item.id,
        name: item.name,
        url: item.url ?? `https://example.com/${item.id}`,
        builtinName: undefined,
        builtinGroup: undefined,
      })),
    }))
    await chrome.storage.local.set({ [key]: JSON.stringify(snapshot) })
  }, groups)
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
}

export async function readState(page: Page): Promise<{ revision: number; groups: StoredGroup[] }> {
  return await page.evaluate(async () => {
    const all = await chrome.storage.local.get(null)
    const index = JSON.parse(String(all['profiles:v2:index'])) as { revision: number; generation: string }
    const snapshot = JSON.parse(String(all[`profiles:v2:generation:${index.generation}`]))
    const profile = snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
    return { revision: index.revision, groups: profile.bookmarks.groups }
  })
}

export async function readGroups(page: Page): Promise<StoredGroup[]> {
  return (await readState(page)).groups
}

export const idsOf = (groups: StoredGroup[]) => groups.map(group => group.items.map(item => item.id))
export const itemIds = (groups: StoredGroup[]) => groups.flatMap(group => group.items.map(item => item.id)).sort()

/** Every item survives exactly once with its fields untouched; groups keep their identity too. */
export function expectIntegrity(before: StoredGroup[], after: StoredGroup[]) {
  expect(itemIds(after)).toEqual(itemIds(before))
  const fields = new Map(before.flatMap(group => group.items).map(item => [item.id, item]))
  for (const item of after.flatMap(group => group.items)) expect(item).toEqual(fields.get(item.id))
  const shape = (groups: StoredGroup[]) => groups.map(group => ({ id: group.id, name: group.name, collapsed: group.collapsed }))
  expect(shape(after)).toEqual(shape(before))
}

/**
 * Polls the persisted order from Node. A page-side async predicate resolves before the
 * storage read settles, so waiting there would return immediately and hide slow writes.
 */
export async function waitForOrders(page: Page, expected: string[][], timeout = 10_000) {
  const deadline = Date.now() + timeout
  let last: string[][] = []
  while (Date.now() < deadline) {
    last = (await readGroups(page)).map(group => group.items.map(item => item.id))
    if (JSON.stringify(last) === JSON.stringify(expected)) return
    await page.waitForTimeout(100)
  }
  throw new Error(`Timed out waiting for ${JSON.stringify(expected)}; last read ${JSON.stringify(last)}`)
}

export async function waitForDomOrder(page: Page, expected: string[], timeout = 10_000) {
  await page.waitForFunction(want => JSON.stringify(Array.from(document.querySelectorAll('.bookmarks [data-sortable-id]')).map(node => node.getAttribute('data-sortable-id'))) === JSON.stringify(want), expected, { timeout })
}

/** Hovering (or touching, or focusing) loads the lazy drag layer; the tile layout must not move. */
export async function loadDragLayer(page: Page, tileId: string) {
  await page.mouse.move(2, 2)
  await page.locator(`.bookmarks [data-sortable-id="${tileId}"]`).hover()
  await expect(page.locator('.bookmarks[data-display-drag]')).toBeVisible()
}

export const tile = (page: Page, id: string) => page.locator(`.bookmarks [data-sortable-id="${id}"]`)
export const folderTile = (page: Page, id: string) => page.locator(`button.mnt-folder[data-folder="${id}"]`)
export const dialogItem = (page: Page, id: string) => page.locator(`.mnt-folder-dialog [data-sortable-id="${id}"]`)

export async function center(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export async function dragMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, options: { steps?: number; release?: boolean } = {}) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 10, from.y, { steps: 2 })
  await page.mouse.move(to.x, to.y, { steps: options.steps ?? 16 })
  if (options.release !== false) await page.mouse.up()
}

export async function dragTileTo(page: Page, fromId: string, to: { x: number; y: number }) {
  await dragMouse(page, await center(tile(page, fromId)), to)
}
