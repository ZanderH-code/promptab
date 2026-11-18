import { expect, test, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

async function openApp(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./')
  await expect(page.locator('.clock')).toBeVisible()
}

async function openSettings(page: Page, tab: Parameters<typeof openTab>[1]) {
  await page.locator('.mnt-settings-entry').first().click()
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
  // Groups show as headed sections, as in nightTab, with the brand icon drawn from the bundled Font Awesome subset.
  await expect(page.locator('.mnt-group-name', { hasText: 'Imported' })).toBeVisible()
  const github = page.locator('.mnt-bookmark-block .shortcut[data-link-host="github.com"]')
  await expect(github).toBeVisible()
  await expect(github.locator('.shortcut-icon svg')).toBeVisible()
})

test('an imported nightTab look keeps following the settings', async ({ page }) => {
  await openApp(page)
  const backup = {
    nightTab: true, version: '7.6.0',
    state: {
      layout: { alignment: 'center-center', size: 100, width: 60, padding: 40, gutter: 20, direction: 'vertical', order: 'header-bookmark' },
      header: { order: ['clock', 'search', 'toolbar'], clock: { hour: { show: true, display: 'number' }, minute: { show: true, display: 'number' }, second: { show: false }, separator: { show: true, text: ':' }, hour24: { show: true }, size: 100 }, search: { show: true, size: 100, engine: { selected: 'google' } } },
      toolbar: { location: 'header', accent: { show: true }, add: { show: false }, edit: { show: false } },
      bookmark: { style: 'block', size: 100, url: { show: true }, line: { show: true }, shadow: { show: true }, hoverScale: { show: false } },
      group: { name: { size: 100 }, openAll: { size: 100 } },
      theme: { accent: { rgb: { r: 0, g: 68, b: 255 } }, style: 'dark', radius: 25, shadow: 75, color: { range: { primary: { h: 222, s: 14 } }, contrast: { start: 8, end: 88 }, shades: 14 }, header: { search: { opacity: 100 } }, toolbar: { opacity: 100 }, group: { openAll: { opacity: 100 } } },
    },
    bookmark: [{ name: { show: true, text: 'Daily' }, collapse: false, toolbar: { openAll: { show: true } }, items: [
      { url: 'https://example.org/', display: { name: { show: true, text: 'Example' }, visual: { type: 'letter', letter: { text: 'EX' } } }, color: { by: 'theme' }, accent: { by: 'theme' } },
    ] }],
  }
  await openSettings(page, 'data')
  await page.getByLabel('Choose nightTab backup', { exact: true }).setInputFiles({ name: 'nighttab.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('nightTab data imported.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings' }).click()

  const plate = page.locator('.mnt-bookmark-block .shortcut .mnt-link-backdrop').first()
  const layout = page.locator('.mnt-layout')
  const style = (locator: typeof plate, property: string) => locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property)
  const width = () => layout.evaluate(element => Math.round(element.getBoundingClientRect().width))
  const viewport = page.viewportSize()!.width
  await expect(page.locator('.mnt-group-open-all', { hasText: 'Open all' })).toBeVisible()
  expect(await style(plate, 'border-radius')).toBe('4px')
  expect(await width()).toBe(Math.round(viewport * 0.6))

  // Promptab's own settings drive the look: corner radius and the surface colour.
  await openSettings(page, 'appearance')
  const radius = page.getByLabel('Corner radius value', { exact: true })
  await radius.fill('12')
  await radius.press('Enter')
  // nightTab-only values are options under Theme.
  const ntWidth = page.getByLabel('nightTab layout width (% of window) value', { exact: true })
  await ntWidth.fill('80')
  await ntWidth.press('Enter')
  await page.getByLabel('nightTab accent line under websites', { exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect.poll(() => style(plate, 'border-radius')).toBe('12px')
  await expect.poll(width).toBe(Math.round(viewport * 0.8))
  await expect.poll(() => style(plate, 'bottom')).toBe('0px')

  // Hiding the address under websites removes nightTab's address strip.
  const link = page.locator('.mnt-bookmark-block .mnt-link').first()
  await link.hover()
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').content)).toBe('"example.org"')
  await page.mouse.move(0, 0)
  await openSettings(page, 'shortcuts')
  await page.getByLabel('Show the address on hover', { exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await link.hover()
  await expect.poll(() => link.evaluate(element => getComputedStyle(element, '::after').content)).toBe('none')
})
