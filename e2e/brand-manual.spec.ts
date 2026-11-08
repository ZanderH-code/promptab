import { expect, test } from '@playwright/test'
import { launchExtension, openApp, readGroups, seedGroups, seedSettings, tile } from './extension-fixture'

const brand = { slug: 'bilibili', title: 'Bilibili', hex: '00A1D6', path: 'M2 2h20v20H2z' }

/** A shortcut with only a slug must still draw the bundled mark, and the mark must not be stored. */
test('draws a brand-mode shortcut that stores only a slug', async () => {
  const session = await launchExtension()
  try {
    const shardRequests: string[] = []
    session.page.on('request', request => { if (/\/brands\/\d+\.json/.test(request.url())) shardRequests.push(request.url()) })
    await seedSettings(session)
    await openApp(session)
    await seedGroups(session.page, [{
      id: 'main', name: 'Main',
      items: [{ id: 'slug', name: 'Bilibili', url: 'https://www.bilibili.com', iconMode: 'brand', iconName: 'bilibili' }],
    }])
    const page = session.page
    const path = tile(page, 'slug').locator('svg path')
    await expect(path).toBeVisible()
    expect((await path.getAttribute('d'))?.length).toBeGreaterThan(10)
    expect(shardRequests.length).toBeGreaterThan(0)

    await page.reload()
    await expect(page.locator('.clock')).toBeVisible()
    await expect(tile(page, 'slug').locator('svg path')).toBeVisible()
    const stored = (await readGroups(page))[0]!.items.find(item => item.id === 'slug')!
    expect(stored.brand).toBeUndefined()
    expect(stored.iconMode).toBe('brand')
    expect(stored.iconName).toBe('bilibili')
  } finally {
    await session.close()
  }
})

/** A stored brand object is complete on its own: no shard is fetched for it. */
test('renders a stored brand object without requesting a shard', async () => {
  const session = await launchExtension()
  try {
    const shardRequests: string[] = []
    session.page.on('request', request => { if (/\/brands\/\d+\.json/.test(request.url())) shardRequests.push(request.url()) })
    await seedSettings(session)
    await openApp(session)
    await seedGroups(session.page, [{
      id: 'main', name: 'Main',
      items: [{ id: 'full', name: 'Bilibili', url: 'https://www.bilibili.com', iconMode: 'brand', iconName: 'bilibili', brand }],
    }])
    const page = session.page
    await expect(tile(page, 'full').locator('svg path')).toHaveAttribute('d', brand.path)
    await page.waitForTimeout(500)
    expect(shardRequests).toEqual([])
  } finally {
    await session.close()
  }
})
