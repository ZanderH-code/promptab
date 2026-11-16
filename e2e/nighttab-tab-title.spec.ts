import { expect, test, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

async function openApp(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./')
  await expect(page.locator('.clock')).toBeVisible()
}

async function openSettings(page: Page, tab: Parameters<typeof openTab>[1]) {
  await page.locator('.settings-button').click()
  await openTab(page, tab)
}

test('a custom tab title replaces the default and survives a reload', async ({ page }) => {
  await openApp(page)
  await expect(page).toHaveTitle('New Tab')
  await openSettings(page, 'about')
  await page.getByLabel('Tab title', { exact: true }).fill('Studio')
  await expect(page).toHaveTitle('Studio')
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page).toHaveTitle('Studio')
  await openSettings(page, 'about')
  await page.getByLabel('Tab title', { exact: true }).fill('')
  await expect(page).toHaveTitle('New Tab')
})

test('the address appears under a website on hover only when enabled', async ({ page }) => {
  await openApp(page)
  const link = page.locator('.shortcut').first()
  const barOpacity = () => link.evaluate(element => getComputedStyle(element, '::after').opacity)
  const barContent = () => link.evaluate(element => getComputedStyle(element, '::after').content)
  await link.hover()
  expect(await barContent()).toBe('none')

  await openSettings(page, 'shortcuts')
  await page.getByLabel('Show the address on hover', { exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.mouse.move(0, 0)
  expect(await barOpacity()).toBe('0')
  await link.hover()
  await expect.poll(barOpacity).toBe('1')
  expect(await barContent()).toBe(`"${await link.getAttribute('data-link-host')}"`)
})

test('a nightTab backup brings its bookmarks, clock, search and page settings', async ({ page }) => {
  await openApp(page)
  const backup = {
    nightTab: true, version: '7.5.0',
    state: {
      layout: { alignment: 'center-center', size: 100, title: 'From nightTab' },
      header: {
        clock: { hour: { show: true, display: 'number' }, minute: { show: true, display: 'number' }, second: { show: false, display: 'number' }, separator: { show: true, text: '.' }, hour24: { show: true } },
        search: { show: true, engine: { selected: 'duckduckgo', custom: { name: '', url: '', queryName: '' } }, newTab: false },
      },
      bookmark: { style: 'block', url: { show: false }, hoverScale: { show: false }, newTab: false },
      theme: { accent: { rgb: { r: 255, g: 85, b: 0 } }, style: 'dark', radius: 10 },
    },
    bookmark: [{ name: { show: true, text: 'Imported' }, collapse: false, items: [
      { url: 'https://github.com/', display: { name: { show: true, text: 'GitHub' }, visual: { type: 'icon', icon: { name: 'github', prefix: 'fab', label: 'GitHub' } } }, color: { by: 'theme' }, accent: { by: 'theme' } },
    ] }],
  }
  await openSettings(page, 'data')
  await page.getByLabel('Choose nightTab backup', { exact: true }).setInputFiles({ name: 'nighttab.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('nightTab data imported.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings' }).click()

  await expect(page).toHaveTitle('From nightTab')
  await expect(page.locator('.clock')).toHaveText(/^\d{2}\.\d{2}$/)
  await expect(page.locator('#search')).toBeAttached()
  // A second group shows as a folder on the home page; its websites open in the folder dialog.
  await page.locator('.mnt-folder[title="Imported"]').click()
  const github = page.getByRole('dialog').locator('.shortcut[data-link-host="github.com"]')
  await expect(github).toBeVisible()
  // A brand icon from nightTab now resolves like an automatic icon instead of rendering empty.
  await expect(github.locator('.shortcut-icon svg, .shortcut-icon img')).toBeVisible()
})
