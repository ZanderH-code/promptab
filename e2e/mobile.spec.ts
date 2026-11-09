import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { openTab, seedExistingUser, templateBookmarks } from './helpers'
import { seedBookmarkFolders } from './bookmark-folder-fixture'
import { assertFollow, installFollowSampler, startFollow, stopFollow, waitForDragStart, waitForOver } from './drag-follow-fixture'

test('bookmark folders open on a phone and close without horizontal overflow', async ({ page }) => {
  await seedBookmarkFolders(page)
  const folder = page.getByRole('button', { name: 'Open folder Work Folder with 2 bookmarks' })
  await folder.tap()
  const dialog = page.getByRole('dialog', { name: 'Work Folder' })
  await expect(dialog.getByRole('link', { name: 'Second Link' })).toBeVisible()
  const rect = await dialog.boundingBox()
  expect(rect).not.toBeNull()
  expect(rect!.x).toBeGreaterThanOrEqual(0)
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await dialog.getByRole('button', { name: 'Close folder' }).tap()
  await expect(dialog).toHaveCount(0)
  const position = (await folder.boundingBox())!
  await folder.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, clientX: position.x + 10, clientY: position.y + 10 })
  await expect(page.getByRole('menuitem', { name: 'Open all' })).toBeVisible()
  await folder.dispatchEvent('pointerup', { pointerType: 'touch', button: 0 })
  await folder.dispatchEvent('click')
  await expect(dialog).toHaveCount(0)
})

test('touch: a held bookmark follows the finger and reorders', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 412, height: 915 })
  await seedExistingUser(page, { language: 'en', shortcuts: templateBookmarks, columns: 6 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
  await installFollowSampler(page)
  // Start and finish one touch gesture: the grid swaps to the drag layer only after the gesture ends.
  const grid = page.locator('.bookmarks')
  await grid.dispatchEvent('touchstart')
  await grid.dispatchEvent('touchend')
  await expect(page.locator('.bookmarks[data-display-drag]')).toBeVisible({ timeout: 5000 })
  const order = await page.locator('.bookmarks [data-sortable-id]').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.sortableId!))
  expect(order.length).toBeGreaterThan(3)
  const fromId = order[order.length - 1], toId = order[0]
  const box = (await page.locator(`.bookmarks [data-sortable-id="${fromId}"]`).boundingBox())!
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const targetBox = (await page.locator(`.bookmarks [data-sortable-id="${toId}"]`).boundingBox())!
  const to = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 }
  const cdp = await page.context().newCDPSession(page)
  const point = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1 }]
  await startFollow(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) })
  // Move as soon as activation is proven; a held finger long enough (550 ms) opens the app menu,
  // which cancels the drag.
  await waitForDragStart(page)
  for (let step = 1; step <= 12; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from.x + (to.x - from.x) * step / 12, from.y + (to.y - from.y) * step / 12) })
    await page.waitForTimeout(16)
  }
  await waitForOver(page, fromId, toId)
  await page.waitForTimeout(100)
  const frames = await stopFollow(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  assertFollow(frames, 10)
  await expect.poll(() => page.locator('.bookmarks [data-sortable-id]').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.sortableId!)))
    .toEqual([fromId, toId, ...order.slice(1, -1)])
})

const viewports = [  { width: 360, height: 740 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
] as const

const templates = [
  ['stacked', 'Stacked'],
  ['split', 'Side by side'],
  ['top-grid', 'Top bar and grid'],
  ['websites', 'Websites only'],
  ['zen', 'Clock and date only'],
  ['dashboard', 'Three-column dashboard'],
  ['icon-split', 'Side split · icons only'],
  ['banner', 'Top banner'],
] as const

const presets = ['Tide', 'Paper', 'Graphite', 'Mist', 'Moss', 'Dusk', 'Terminal', 'Glass', 'Contrast']

async function launch(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 412, height: 915 })
  await seedExistingUser(page, { language: 'en', shortcuts: templateBookmarks, columns: 6 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
}

async function chooseTemplate(page: Page, label: string) {
  await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

async function expectFirstScreenFits(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  const geometry = await page.locator('.mnt-layout').evaluate(layout => {
    const areas = [...layout.querySelectorAll<HTMLElement>(':scope > .mnt-area')]
      .map(area => { const rect = area.getBoundingClientRect(); return { name: area.dataset.area, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } })
      .filter(area => area.width > 1 && area.height > 1)
    const clipped = areas.filter(area => area.left < -1 || area.right > window.innerWidth + 1)
    const overlaps: string[] = []
    for (let i = 0; i < areas.length; i++) for (let j = i + 1; j < areas.length; j++) {
      const a = areas[i], b = areas[j]
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps.push(`${a.name}/${b.name}`)
    }
    return { clipped, overlaps }
  })
  expect(geometry.clipped, 'layout areas stay inside the viewport').toEqual([])
  expect(geometry.overlaps, 'layout areas do not overlap').toEqual([])
  const tracks = await page.locator('.mnt-layout').evaluate(layout => getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).length)
  expect(tracks, 'mobile and tablet widget cards use a single column').toBe(1)
}

async function openSettings(page: Page) {
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
}

test('all built-in templates fit narrow, phone and tablet viewports', async ({ page }) => {
  await launch(page)
  await openSettings(page)
  await openTab(page, 'layout')

  for (const [id, label] of templates) {
    await chooseTemplate(page, label)
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', id)
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expectFirstScreenFits(page)
    }
    await openSettings(page)
    await openTab(page, 'layout')
  }
})

test('every built-in preset fits the supported narrow and tablet widths', async ({ page }) => {
  await launch(page)
  await openSettings(page)
  await openTab(page, 'appearance')

  for (const preset of presets) {
    await page.getByRole('button', { name: preset, exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expectFirstScreenFits(page)
    }
    await openSettings(page)
    await openTab(page, 'appearance')
  }
})

test('settings drawer fills the phone viewport and its close control stays reachable', async ({ page }) => {
  await launch(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await openSettings(page)
  const drawer = page.locator('.sd')
  const box = await drawer.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBe(0)
  expect(box!.y).toBe(0)
  expect(box!.width).toBe(360)
  expect(box!.height).toBe(740)
  const close = page.getByRole('button', { name: 'Close settings' })
  await expect(close).toBeVisible()
  const closeBox = await close.boundingBox()
  expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(360)
  await close.click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
})

test('AI settings tab is directly reachable with a touch tap', async ({ page }) => {
  await launch(page)
  await openSettings(page)
  const aiTab = page.getByRole('tab', { name: 'AI', exact: true })
  await expect(aiTab).toBeVisible()
  await aiTab.tap()
  await expect(aiTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Copy prompt pack' })).toBeVisible()
})

test('touch controls meet the 44 pixel target size', async ({ page }) => {
  await launch(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await openSettings(page)
  await openTab(page, 'layout')
  await chooseTemplate(page, 'Side split · icons only')
  await page.getByRole('button', { name: 'Close settings' }).click()
  for (const target of await page.locator('.mnt-widget-toolbar button').all()) {
    const box = await target.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await openSettings(page)
  const settingsTargets = page.locator('.sd-head-actions button, .sd-tabs button, .sd .sd-button')
  for (const target of await settingsTargets.all()) {
    if (!(await target.isVisible())) continue
    const box = await target.boundingBox()
    expect(box!.width, await target.getAttribute('aria-label')).toBeGreaterThanOrEqual(44)
    expect(box!.height, await target.textContent()).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Edit desktop' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('.shortcut-actions').first()).toHaveCSS('opacity', '1')
  await expect(page.locator('.drag-handle').first()).toBeEnabled()
  const shortcutControls = page.locator('.shortcut-actions button, .drag-handle')
  const controlCount = await shortcutControls.count()
  let visibleControlCount = 0
  for (let index = 0; index < controlCount; index++) {
    const target = shortcutControls.nth(index)
    if (!(await target.isVisible())) continue
    visibleControlCount++
    await expect(target).toBeVisible()
    const box = await target.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  expect(visibleControlCount).toBeGreaterThan(0)
})

test('a long press opens a shortcut menu and reaches its edit action', async ({ page }) => {
  await launch(page)
  const shortcut = page.locator('.shortcut').first()
  const box = await shortcut.boundingBox()
  expect(box).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await page.waitForTimeout(600)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Edit website' }).click()
  await expect(page.getByRole('heading', { name: 'Edit website' })).toBeVisible()
})

test('a long press on a group title opens its menu', async ({ page }) => {
  await launch(page)
  const heading = page.locator('.shortcuts-heading').first()
  const box = await heading.boundingBox()
  expect(box).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
  await page.waitForTimeout(600)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Open all' })).toBeVisible()
})

test('touch drag sorts shortcuts after a long press on the drag handle', async ({ page }) => {
  await launch(page)
  await openSettings(page)
  await page.getByRole('button', { name: 'Edit desktop' }).click()
  const before = await page.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))
  const handles = page.locator('.drag-handle:not([disabled])')
  const source = await handles.nth(0).boundingBox()
  const target = await handles.nth(1).boundingBox()
  expect(source).not.toBeNull()
  expect(target).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  const start = { x: source!.x + source!.width / 2, y: source!.y + source!.height / 2 }
  const end = { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] })
  await page.waitForTimeout(400)
  for (let i = 1; i <= 4; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * i / 4, y: start.y + (end.y - start.y) * i / 4, id: 1 }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.locator('[data-sortable-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-sortable-id')))).not.toEqual(before)
})

test('AI workbench and CSS editor remain usable on a narrow screen', async ({ page }) => {
  await launch(page)
  await page.setViewportSize({ width: 360, height: 740 })
  await openSettings(page)
  for (const tab of ['style', 'ai'] as const) {
    await openTab(page, tab)
    const editor = page.locator('.sd .sd-code').first()
    await expect(editor).toBeVisible()
    const box = await editor.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(360)
    await expect(page.locator('.sd-panel')).toHaveJSProperty('scrollWidth', await page.locator('.sd-panel').evaluate(panel => panel.clientWidth))
  }
})

test('narrow and tablet first-screen baselines', async ({ page }) => {
  await launch(page)
  for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 1024 }] as const) {
    await page.setViewportSize(viewport)
    await expectFirstScreenFits(page)
    await expect(page).toHaveScreenshot(`mobile-home-${viewport.width}x${viewport.height}.png`)
  }
})

test('favicon upgrades preserve a 360px phone tile size', async ({ page }) => {
  const low = await readFile(new URL('../public/icons/icon16.png', import.meta.url))
  const site = 'https://mobile-icons.example.test'
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== site) { await route.continue(); return }
    const pathname = url.pathname
    if (pathname === '/favicon.svg') {
      await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="60" fill="#3a7"/></svg>' })
    } else if (pathname === '/favicon.ico' || pathname === '/apple-touch-icon.png' || pathname === '/apple-touch-icon-precomposed.png' || pathname === '/favicon-32x32.png') {
      await route.fulfill({ status: 200, contentType: 'image/png', body: low })
    } else await route.fulfill({ status: 404, body: 'missing' })
  })
  await page.setViewportSize({ width: 360, height: 740 })
  await seedExistingUser(page, { language: 'en', iconSize: 72, shortcuts: [{ id: 'phone-icon', name: 'Phone', url: site, color: '#345678', icon: 'P', iconMode: 'auto' }] })
  await page.goto('/')
  await expect(page.locator('.shortcut').first()).toBeVisible()
  const tile = page.locator('.shortcut-icon').first()
  const before = await tile.boundingBox()
  await expect(tile.locator('img')).toHaveAttribute('src', `${site}/favicon.svg`)
  const after = await tile.boundingBox()
  expect(after).not.toBeNull()
  expect(after!.width).toBe(before!.width)
  expect(after!.height).toBe(before!.height)
  expect(after!.x).toBeGreaterThanOrEqual(0)
  expect(after!.x + after!.width).toBeLessThanOrEqual(360)
})
