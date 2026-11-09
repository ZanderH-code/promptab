import { expect, test, type Page } from '@playwright/test'
import { launchExtension, openApp, seedSettings, type ExtensionSession } from './extension-fixture'

declare const chrome: { storage: { local: { get(keys: null | string | string[]): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } } }

const A_CSS = '.mnt-clock { color: rgb(10, 20, 30); }'
const B_CSS = '.mnt-clock { color: rgb(40, 50, 60); }'
const A_DRAFT = ' .mnt-date { color: rgb(7, 8, 9); }'
const B_DRAFT = ' .mnt-date { color: rgb(70, 80, 90); }'

/** Clones the bootstrapped profile into a second one with different stored CSS and returns both ids. */
async function seedTwoProfiles(page: Page) {
  return await page.evaluate(async ({ aCss, bCss }) => {
    const all = await chrome.storage.local.get(null)
    const index = JSON.parse(String(all['profiles:v2:index'])) as { revision: number; generation: string }
    const key = `profiles:v2:generation:${index.generation}`
    const snapshot = JSON.parse(String(all[key]))
    const aId = snapshot.profiles.activeProfileId as string
    const a = snapshot.profiles.profiles[aId]
    a.custom.css = aCss
    a.custom.cssEnabled = false
    const b = structuredClone(a)
    b.meta = { ...a.meta, id: 'profile-b', name: 'Profile B', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    b.custom = { ...a.custom, css: bCss }
    snapshot.profiles.profiles['profile-b'] = b
    await chrome.storage.local.set({ [key]: JSON.stringify(snapshot) })
    return { aId, bId: 'profile-b' }
  }, { aCss: A_CSS, bCss: B_CSS })
}

/** Stored CSS per profile, read from the live profile snapshot. */
async function storedCss(page: Page) {
  return await page.evaluate(async () => {
    const all = await chrome.storage.local.get(null)
    const index = JSON.parse(String(all['profiles:v2:index'])) as { generation: string }
    const snapshot = JSON.parse(String(all[`profiles:v2:generation:${index.generation}`]))
    const css: Record<string, string> = {}
    for (const [id, profile] of Object.entries<{ custom: { css: string } }>(snapshot.profiles.profiles)) css[id] = profile.custom.css
    return css
  })
}

async function openSettings(page: Page) {
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function openTabAndWait(page: Page, name: string) {
  await page.getByRole('tab', { name, exact: true }).click()
}

async function openStyle(page: Page) {
  await openTabAndWait(page, 'Custom CSS')
  await expect(page.locator('.cm-content')).toBeVisible()
}

async function switchProfile(page: Page, id: string) {
  await openTabAndWait(page, 'Backup & import')
  const select = page.getByLabel('Active profile')
  await select.selectOption(id)
  await expect(select).toHaveValue(id)
}

async function appendDraft(page: Page, text: string, marker: string) {
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await expect(page.locator('.cm-content')).toContainText(marker)
}

test('an unapplied CSS draft belongs to its own profile', async () => {
  const session: ExtensionSession = await launchExtension({ viewport: { width: 1280, height: 900 } })
  const page = session.page
  try {
    await seedSettings(session)
    await openApp(session)
    const errors: string[] = []
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', error => errors.push(String(error)))
    const { aId } = await seedTwoProfiles(page)
    await page.reload()
    await expect(page.locator('.clock')).toBeVisible()
    await openSettings(page)

    // Profile A shows its own stored CSS; the typed marker is a draft.
    await openStyle(page)
    await expect(page.locator('.cm-content')).toContainText('rgb(10, 20, 30)')
    await appendDraft(page, A_DRAFT, 'rgb(7, 8, 9)')

    // Profile B must show its own stylesheet, without A's draft.
    await switchProfile(page, 'profile-b')
    await openStyle(page)
    await expect(page.locator('.cm-content')).toContainText('rgb(40, 50, 60)')
    await expect(page.locator('.cm-content')).not.toContainText('rgb(7, 8, 9)')

    // Back in A the draft is still there.
    await switchProfile(page, aId)
    await openStyle(page)
    await expect(page.locator('.cm-content')).toContainText('rgb(7, 8, 9)')

    // Applying in A writes A only.
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect.poll(() => page.locator('#mnt-user-css').textContent()).toContain('rgb(7,8,9)')
    let css = await storedCss(page)
    expect(css[aId]).toContain('rgb(7, 8, 9)')
    expect(css['profile-b']).toBe(B_CSS)

    // Applying in B writes B only.
    await switchProfile(page, 'profile-b')
    await openStyle(page)
    await expect(page.locator('.cm-content')).not.toContainText('rgb(7, 8, 9)')
    await appendDraft(page, B_DRAFT, 'rgb(70, 80, 90)')
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect.poll(() => page.locator('#mnt-user-css').textContent()).toContain('rgb(70,80,90)')
    css = await storedCss(page)
    expect(css['profile-b']).toContain('rgb(70, 80, 90)')
    expect(css[aId]).toContain('rgb(7, 8, 9)')
    expect(css[aId]).not.toContain('rgb(70, 80, 90)')

    expect(errors).toEqual([])
  } finally {
    await session.close()
  }
})
