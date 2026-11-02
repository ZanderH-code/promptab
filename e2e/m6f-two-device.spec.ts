import { test, expect, type Browser, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

test('two devices resolve opt-in, sync edits, undo pulls and disable locally', async ({ browser }) => {
  test.setTimeout(90_000)
  const cloud: Record<string, unknown> = {}
  const pages: Page[] = []
  const contexts: Awaited<ReturnType<Browser['newContext']>>[] = []
  const device = async (accent: string) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', locale: 'en-US' })
    contexts.push(context)
    const page = await context.newPage()
    pages.push(page)
    await page.exposeBinding('__cloudRequest', async (_source, operation: string, argument: unknown) => {
      if (operation === 'get') {
        const keys = argument === null ? Object.keys(cloud) : Array.isArray(argument) ? argument : [argument]
        return Object.fromEntries(keys.filter(key => typeof key === 'string' && Object.hasOwn(cloud, key)).map(key => [key as string, cloud[key as string]]))
      }
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
      if (operation === 'set') {
        for (const [key, value] of Object.entries(argument as Record<string, unknown>)) {
          if (cloud[key] !== value) changes[key] = { oldValue: cloud[key], newValue: value }
          cloud[key] = value
        }
      } else {
        for (const key of Array.isArray(argument) ? argument : [argument]) {
          if (typeof key === 'string' && Object.hasOwn(cloud, key)) { changes[key] = { oldValue: cloud[key] }; delete cloud[key] }
        }
      }
      if (Object.keys(changes).length) setTimeout(() => {
        for (const target of pages) if (!target.isClosed()) void target.evaluate(value => {
          ;(window as unknown as { __notifySync: (changes: unknown) => void }).__notifySync(value)
        }, changes).catch(() => {})
      }, 0)
    })
    await page.addInitScript(initialAccent => {
      const local: Record<string, unknown> = { settings: { schemaVersion: 1, language: 'en', theme: 'dark', accent: initialAccent, background: '#102932', showClock: true, showDate: true, showSearch: true, hour12: false, searchTemplate: 'https://www.google.com/search?q={query}', shortcuts: [{ id: 'example', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E' }], columns: 6, iconSize: 72, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35 } }
      const listeners = new Set<(changes: unknown, area: string) => void>()
      const invoke = (operation: string, argument: unknown) => (window as unknown as { __cloudRequest: (operation: string, argument: unknown) => Promise<unknown> }).__cloudRequest(operation, argument)
      const localArea = {
        async get(keys: string | string[] | null) {
          const selected = keys === null ? Object.keys(local) : Array.isArray(keys) ? keys : [keys]
          return Object.fromEntries(selected.filter(key => Object.hasOwn(local, key)).map(key => [key, local[key]]))
        },
        async set(items: Record<string, unknown>) { Object.assign(local, items) },
        async remove(keys: string | string[]) { for (const key of Array.isArray(keys) ? keys : [keys]) delete local[key] },
      }
      ;(window as unknown as { __notifySync: (changes: unknown) => void }).__notifySync = changes => { for (const listener of listeners) listener(changes, 'sync') }
      Object.defineProperty(window, 'chrome', { configurable: true, value: { storage: {
        local: localArea,
        sync: { get: (keys: unknown) => invoke('get', keys), set: (items: unknown) => invoke('set', items), remove: (keys: unknown) => invoke('remove', keys) },
        onChanged: { addListener: (listener: (changes: unknown, area: string) => void) => listeners.add(listener), removeListener: (listener: (changes: unknown, area: string) => void) => listeners.delete(listener) },
      } } })
    }, accent)
    await seedExistingUser(page, { language: 'en', accent })
    await page.goto('/')
    await expect(page.locator('.mnt-clock')).toBeVisible()
    return page
  }
  try {
    const a = await device('#123456')
    const b = await device('#654321')
    const profileId = (page: Page) => page.evaluate(() => {
      const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
      return JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!).profiles.activeProfileId as string
    })
    expect(await profileId(a)).not.toBe(await profileId(b))
    const openSync = async (page: Page) => { await page.locator('.settings-button').click(); await openTab(page, 'data') }
    const toggle = (page: Page) => page.getByRole('checkbox', { name: 'Sync this profile across devices' })
    await openSync(a)
    await expect(toggle(a)).not.toBeChecked()
    await toggle(a).click()
    await expect(a.getByText('Profile synced.', { exact: true })).toBeVisible()
    const originalCloud = JSON.stringify(cloud)
    await openSync(b)
    await toggle(b).click()
    await expect(b.getByText('The local and browser sync profiles differ. Choose which copy to use.')).toBeVisible()
    expect(JSON.stringify(cloud)).toBe(originalCloud)
    await b.getByRole('button', { name: 'Use the cloud setup on this device' }).click()
    await expect(b.getByText('Cloud setup applied. You can undo this change.')).toBeVisible()
    await openTab(b, 'appearance')
    await expect(b.getByLabel('Accent color', { exact: true })).toHaveValue('#123456')
    await b.getByRole('button', { name: 'Undo pulled profile' }).click()
    await expect(b.getByLabel('Accent color', { exact: true })).toHaveValue('#654321')
    await expect.poll(() => JSON.stringify(cloud), { timeout: 15_000 }).toContain('#654321')
    await expect(a.getByText('Cloud setup applied. You can undo this change.')).toBeVisible({ timeout: 15_000 })
    await a.getByRole('button', { name: 'Close settings' }).click()
    // Editing a shortcut happens on the desktop, with the settings drawer closed.
    await a.locator('.shortcut').first().click({ button: 'right' })
    await a.getByRole('menuitem', { name: /edit/i }).click()
    await a.getByLabel('Name', { exact: true }).fill('Changed while closed')
    await a.getByRole('button', { name: 'Save website' }).click()
    await expect.poll(() => JSON.stringify(cloud), { timeout: 15_000 }).toContain('Changed while closed')
    await expect(b.getByText('Changed while closed', { exact: true })).toBeVisible({ timeout: 15_000 })
    await openTab(b, 'appearance')
    await b.getByLabel('Accent color', { exact: true }).fill('#112233')
    const manifest = JSON.parse(String(cloud['mnt.sync.manifest'])) as { count: number }
    const remote = JSON.parse(Array.from({ length: manifest.count }, (_, index) => String(cloud[`mnt.sync.chunk.${index}`])).join(''))
    remote.profile.theme.color.accent = '#445566'
    const changed = JSON.stringify(remote)
    for (let index = 0; index < manifest.count; index++) cloud[`mnt.sync.chunk.${index}`] = changed.slice(index * 3500, (index + 1) * 3500)
    cloud['mnt.sync.manifest'] = JSON.stringify({ ...manifest, revision: 'concurrent-change' })
    await b.evaluate(() => (window as unknown as { __notifySync: (changes: unknown) => void }).__notifySync({ 'mnt.sync.manifest': { newValue: 'changed' } }))
    await expect(b.getByText('The local and browser sync profiles differ. Choose which copy to use.')).toBeVisible({ timeout: 15_000 })
    await b.getByRole('button', { name: 'Use the cloud setup on this device' }).click()
    await expect(b.getByLabel('Accent color', { exact: true })).toHaveValue('#445566')
    await b.getByRole('button', { name: 'Undo pulled profile' }).click()
    await expect(b.getByLabel('Accent color', { exact: true })).toHaveValue('#112233')
    await expect.poll(() => JSON.stringify(cloud), { timeout: 15_000 }).toContain('#112233')
    await openTab(b, 'data')
    await toggle(b).click()
    const retained = JSON.stringify(cloud)
    await expect(b.getByText('Browser sync is off on this device.')).toBeVisible()
    expect(JSON.stringify(cloud)).toBe(retained)
    await openTab(b, 'appearance')
    await expect(b.getByLabel('Accent color', { exact: true })).toHaveValue('#112233')
  } finally {
    for (const context of contexts) void context.close().catch(() => {})
  }
})
