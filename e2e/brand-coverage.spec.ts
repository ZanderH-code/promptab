import { expect, test, type Page } from '@playwright/test'
import { launchExtension, openApp, seedGroups, seedSettings, tile } from './extension-fixture'
import { COMMON_SITES, siteId } from './fixtures/common-sites'

const MANUAL = [
  { id: 'manual-brand', name: 'Manual brand', url: 'https://brand.example', iconMode: 'brand', brand: { slug: 'bilibili', title: 'Bilibili', hex: '00A1D6', path: 'M2 2h20v20H2z' } },
  { id: 'manual-lucide', name: 'Manual lucide', url: 'https://lucide.example', iconMode: 'lucide', iconName: 'house' },
  { id: 'manual-emoji', name: 'Manual emoji', url: 'https://emoji.example', iconMode: 'emoji', iconName: '🚀' },
  { id: 'manual-text', name: 'Manual text', url: 'https://text.example', iconMode: 'text', icon: 'TX' },
]

const brandIds = COMMON_SITES.flatMap((site, index) => site.expectSlug ? [siteId(index)] : [])
const plainIds = COMMON_SITES.flatMap((site, index) => site.expectSlug ? [] : [siteId(index)])

/** Every tile is settled once it has a brand mark, a loaded favicon image, or visible text. */
async function readIcons(page: Page, ids: string[]) {
  return await page.evaluate(wanted => wanted.map(id => {
    const icon = document.querySelector(`.bookmarks [data-sortable-id="${id}"] .shortcut-icon`)
    const image = icon?.querySelector('img') ?? null
    return {
      id,
      svg: !!icon?.querySelector('svg path'),
      src: image?.getAttribute('src') ?? null,
      imageOk: image ? image.complete && image.naturalWidth > 0 : null,
      text: icon?.textContent?.trim() ?? '',
    }
  }), ids)
}

test('every common auto site resolves locally and manual icons are never replaced', async () => {
  const session = await launchExtension({ viewport: { width: 1400, height: 1000 } })
  try {
    const page = session.page
    // Brand resolution is local: blocking the public web must not cost any brand mark.
    await session.context.route(/^https?:\/\//, route => route.abort())
    const shardRequests: string[] = []
    page.on('request', request => { if (/\/brands\/\d+\.json/.test(request.url())) shardRequests.push(request.url()) })
    await seedSettings(session)
    await openApp(session)
    await seedGroups(page, [{
      id: 'coverage', name: 'Coverage',
      items: [...COMMON_SITES.map((site, index) => ({ id: siteId(index), name: site.name, url: site.url, iconMode: 'auto' })), ...MANUAL],
    }])

    // Sites the catalogue can name must show the bundled mark.
    await expect.poll(async () => (await readIcons(page, brandIds)).filter(icon => !icon.svg).map(icon => icon.id), {
      timeout: 90_000, intervals: [250, 500, 1000],
    }).toEqual([])
    // Sites it cannot name must never keep a broken image: a loaded favicon or the letter is fine.
    await expect.poll(async () => (await readIcons(page, plainIds)).flatMap(icon => [
      ...(icon.svg ? [`${icon.id}:brand`] : []),
      ...(icon.imageOk === false ? [`${icon.id}:broken`] : []),
      ...(!icon.svg && icon.imageOk !== true && !icon.text ? [`${icon.id}:empty`] : []),
    ]), { timeout: 90_000, intervals: [250, 500, 1000] }).toEqual([])
    expect(shardRequests.length).toBeGreaterThan(0)

    // A manual choice wins over every automatic path.
    await expect(tile(page, 'manual-brand').locator('.shortcut-icon svg path')).toHaveAttribute('d', 'M2 2h20v20H2z')
    await expect(tile(page, 'manual-lucide').locator('.shortcut-icon svg.lucide')).toBeVisible()
    await expect(tile(page, 'manual-emoji').locator('.shortcut-icon')).toHaveText('🚀')
    await expect(tile(page, 'manual-text').locator('.shortcut-icon')).toHaveText('TX')
  } finally {
    await session.close()
  }
})

test('a profile with no auto shortcut fetches no brand shard at startup', async () => {
  const session = await launchExtension()
  try {
    const page = session.page
    const shardRequests: string[] = []
    page.on('request', request => { if (/\/brands\/\d+\.json/.test(request.url())) shardRequests.push(request.url()) })
    await seedSettings(session)
    await openApp(session)
    await seedGroups(page, [{ id: 'manual', name: 'Manual', items: MANUAL }])
    await expect(tile(page, 'manual-brand').locator('.shortcut-icon svg path')).toBeVisible()
    await page.waitForTimeout(2000)
    expect(shardRequests).toEqual([])
  } finally {
    await session.close()
  }
})
