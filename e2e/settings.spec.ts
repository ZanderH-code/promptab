import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { seedExistingUser } from './helpers'

const MARKER = '.mnt-clock { color: rgb(1, 2, 3); }'

async function launch(page: Page) {
  await seedExistingUser(page, { language: 'en' })
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
}

async function openDrawer(page: Page) {
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function openStyle(page: Page) {
  await page.getByRole('tab', { name: 'Custom CSS', exact: true }).click()
  await expect(page.locator('.cm-content')).toBeVisible()
}

async function openLayout(page: Page) {
  await page.getByRole('tab', { name: 'Areas & grid', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Area grid' })).toBeVisible()
}

/** The committed base areas, read from the v2 snapshot the page persists after every change. */
async function storedAreas(page: Page) {
  return await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId].layout.areas as string[]
  })
}

/** Types into the CSS editor at the end of the current document. */
async function typeDraft(page: Page, text: string) {
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(text)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')
}

test('an unapplied custom CSS draft survives navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await openStyle(page)
  await typeDraft(page, MARKER)

  // Another section unmounts and remounts the editor; the draft must come back with it.
  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Custom CSS', exact: true })).toBeVisible()
  await openStyle(page)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  // Same within the page when the whole drawer closes and reopens.
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await openDrawer(page)
  await openStyle(page)
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  // Not applied: the app's user stylesheet layer does not exist yet.
  await expect(page.locator('#mnt-user-css')).toHaveCount(0)

  // Page-lifetime only: a reload starts from the stored (empty) stylesheet.
  await page.reload()
  await expect(page.locator('.mnt-layout')).toBeVisible()
  await openDrawer(page)
  await openStyle(page)
  await expect(page.locator('.cm-content')).not.toContainText('rgb(1, 2, 3)')

  // Apply persists the draft, and the rule reaches the app's CSS layer only now.
  await typeDraft(page, MARKER)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  // `<style>` has no box, so its innerText is empty; read the stylesheet text itself. The sanitizer
  // re-prints the rule without spaces, so match its compact form.
  await expect.poll(() => page.locator('#mnt-user-css').textContent()).toContain('rgb(1,2,3)')
  await expect(page.locator('.cm-content')).toContainText('rgb(1, 2, 3)')

  expect(errors).toEqual([])
})

const SHOTS = '/tmp/magpie-claude-work-1001/settingsprobe/shots'

type Rgb = { r: number; g: number; b: number; a: number }

async function editorColors(page: Page) {
  return await page.evaluate(() => {
    // Canvas normalizes any computed CSS colour (rgb, oklab, color-mix result) to 8-bit sRGB.
    const toRgb = (value: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return { r, g, b, a }
    }
    const read = (selector: string, property: 'backgroundColor' | 'color') => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`missing ${selector}`)
      return toRgb(getComputedStyle(element)[property])
    }
    return {
      editorBg: read('.cm-editor', 'backgroundColor'),
      gutterBg: read('.cm-gutters', 'backgroundColor'),
      gutterText: read('.cm-gutters', 'color'),
      contentText: read('.cm-content', 'color'),
    }
  })
}

const luminance = ({ r, g, b }: Rgb) => [r, g, b]
  .map(value => value / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
const ratio = (a: Rgb, b: Rgb) => {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05)
}

async function expectEditorReadable(page: Page) {
  const colors = await editorColors(page)
  // The gutter may be transparent over the editor, but it must never sit on a different colour.
  if (colors.gutterBg.a !== 0) expect(colors.gutterBg).toEqual(colors.editorBg)
  expect(ratio(colors.gutterText, colors.gutterBg.a === 0 ? colors.editorBg : colors.gutterBg), 'gutter text contrast').toBeGreaterThanOrEqual(4.5)
  expect(ratio(colors.contentText, colors.editorBg), 'editor text contrast').toBeGreaterThanOrEqual(4.5)
}

/** The empty editor's placeholder colour and the surface it is painted on. */
async function placeholderColors(page: Page) {
  return await page.evaluate(() => {
    const toRgb = (value: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return { r, g, b, a }
    }
    const placeholder = document.querySelector('.cm-placeholder')
    const editor = document.querySelector('.cm-editor')
    if (!placeholder || !editor) throw new Error('missing CSS editor placeholder')
    return {
      placeholder: toRgb(getComputedStyle(placeholder).color),
      editorBg: toRgb(getComputedStyle(editor).backgroundColor),
    }
  })
}

async function expectPlaceholderReadable(page: Page) {
  await expect(page.locator('.cm-placeholder')).toBeVisible()
  const colors = await placeholderColors(page)
  expect(ratio(colors.placeholder, colors.editorBg), 'placeholder contrast').toBeGreaterThanOrEqual(4.5)
}

test('the custom CSS editor follows the active theme', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)

  // Dark is the seeded theme. A rule makes the syntax colours and the gutter visible in the shot.
  await openStyle(page)
  await typeDraft(page, MARKER)
  await expectEditorReadable(page)
  await page.screenshot({ path: `${SHOTS}/style-dark.png` })

  // A light preset stores the light palette; the default profile has no separate light colours.
  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('button', { name: 'Paper', exact: true }).click()
  await openStyle(page)
  await expectEditorReadable(page)
  await page.screenshot({ path: `${SHOTS}/style-light.png` })

  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('button', { name: 'Contrast', exact: true }).click()
  await openStyle(page)
  await expectEditorReadable(page)
  await page.screenshot({ path: `${SHOTS}/style-contrast.png` })

  expect(errors).toEqual([])
})

test('the empty custom CSS editor placeholder is readable in every theme', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)

  // Dark is the seeded theme; the placeholder is the first thing shown in an empty editor.
  await openStyle(page)
  await expectPlaceholderReadable(page)

  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('button', { name: 'Paper', exact: true }).click()
  await openStyle(page)
  await expectPlaceholderReadable(page)

  expect(errors).toEqual([])
})

test('the custom CSS status reflects the enable switch', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await openStyle(page)
  await typeDraft(page, MARKER)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()

  const status = page.locator('.sd-css-status')
  await expect(status).toContainText('Applied')

  const toggle = page.getByRole('checkbox', { name: 'Enable custom CSS' })
  await toggle.click()
  await expect(status).toContainText('Disabled')
  await expect(status).not.toContainText('Applied')

  await toggle.click()
  await expect(status).toContainText('Applied')

  // A valid change with the switch on is a draft, not an applied stylesheet.
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' .mnt-date { color: rgb(4, 5, 6); }')
  await expect(status).toContainText('Unapplied changes')

  expect(errors).toEqual([])
})

test('wallpaper uploads are offered only for image and video backgrounds', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()

  const group = page.getByRole('radiogroup', { name: 'Background type' })
  const hint = page.getByText('Upload an image to adjust blur, grayscale, zoom and focal point.')
  const visibleInputs = () => page.locator('input[type=file]:visible').count()

  for (const [type, expected] of [['Theme', 0], ['Solid color', 0], ['Gradient', 0], ['Accent', 0], ['Image', 2], ['Video', 2]] as const) {
    await group.getByRole('radio', { name: type, exact: true }).click()
    await expect.poll(visibleInputs, { message: `${type} file inputs` }).toBe(expected)
    if (expected === 0) await expect(hint, `${type} shows no upload hint`).toHaveCount(0)
  }

  // The hint stays with the pickers it explains.
  await group.getByRole('radio', { name: 'Image', exact: true }).click()
  await expect(hint).toBeVisible()

  expect(errors).toEqual([])
})

test('the area grid rejects duplicate entries and removal of the shortcuts area', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await openLayout(page)

  const area = page.getByRole('textbox', { name: 'Area grid' })
  const alert = page.getByRole('alert')
  expect(await storedAreas(page)).toEqual(['overview', 'bookmarks'])

  // Repeating a name on a second row is a duplicate entry, not a taller area: the text stays, nothing commits.
  await area.fill('overview\noverview')
  await expect(alert).toContainText('used in more than one row')
  await expect(area).toHaveValue('overview\noverview')
  expect(await storedAreas(page)).toEqual(['overview', 'bookmarks'])

  // Removing the area the shortcuts widget lives in is refused as well.
  await area.fill('overview')
  await expect(alert).toContainText('is required')
  await expect(area).toHaveValue('overview')
  expect(await storedAreas(page)).toEqual(['overview', 'bookmarks'])

  // Revert restores the last committed grid.
  await page.getByRole('button', { name: 'Revert', exact: true }).click()
  await expect(area).toHaveValue('overview\nbookmarks')
  await expect(alert).toHaveCount(0)

  // Correcting the draft clears the alert and commits the new grid.
  await area.fill('bookmarks\noverview')
  await expect(alert).toHaveCount(0)
  await expect.poll(() => storedAreas(page)).toEqual(['bookmarks', 'overview'])
  await expect(area).toHaveValue('bookmarks\noverview')

  expect(errors).toEqual([])
})

test('the websites section opens desktop editing', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Websites', exact: true }).click()

  const edit = page.getByRole('button', { name: 'Edit websites', exact: true })
  await expect(edit).toBeVisible()
  await expect(edit).toHaveClass(/sd-primary/)
  await edit.click()

  // The drawer closes and the desktop enters the existing edit mode.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.edit-toolbar')).toBeVisible()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-edit-mode', '')

  // Focus lands on a visible control in the page rather than on the body.
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    return { tag: active?.tagName ?? '', visible: !!active && active.getClientRects().length > 0, inPage: !!active?.closest('main') }
  })
  expect(focus).toEqual({ tag: 'BUTTON', visible: true, inPage: true })

  // Leaving edit mode works as it does everywhere else today.
  await page.getByRole('navigation', { name: 'Desktop editing tools' }).getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)

  expect(errors).toEqual([])
})

/** The mark's own colour and its translucent tint composited over the first opaque ancestor. */
async function markColors(page: Page) {
  return page.evaluate(() => {
    const toRgb = (value: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      return { r, g, b, a: a / 255 }
    }
    const mark = document.querySelector('.sd-mark')
    if (!(mark instanceof HTMLElement)) throw new Error('missing mark')
    const color = toRgb(getComputedStyle(mark).color)
    const tint = toRgb(getComputedStyle(mark).backgroundColor)
    let element = mark.parentElement
    let surface = { r: 255, g: 255, b: 255 }
    while (element) {
      const background = toRgb(getComputedStyle(element).backgroundColor)
      if (background.a === 1) { surface = background; break }
      element = element.parentElement
    }
    return { color, background: { r: tint.r * tint.a + surface.r * (1 - tint.a), g: tint.g * tint.a + surface.g * (1 - tint.a), b: tint.b * tint.a + surface.b * (1 - tint.a) } }
  })
}

test('settings search highlights the matched text', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  const search = page.getByRole('searchbox', { name: 'Search settings' })

  await search.fill('blur')
  const mark = page.locator('.sd-mark').first()
  await expect(mark).toBeVisible()
  expect((await mark.textContent())?.toLowerCase()).toBe('blur')
  // Built from a single text node, not from normalized HTML.
  expect(await mark.evaluate(node => node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE)).toBe(true)

  const dark = await markColors(page)
  expect(ratio(dark.color, dark.background), 'dark mark contrast').toBeGreaterThanOrEqual(4.5)

  // The same marks stay readable on the light paper theme.
  await search.fill('')
  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('button', { name: 'Paper', exact: true }).click()
  await search.fill('blur')
  await expect(mark).toBeVisible()
  const light = await markColors(page)
  expect(ratio(light.color, light.background), 'light mark contrast').toBeGreaterThanOrEqual(4.5)

  // Every result explains itself: a mark in the visible label, or the hidden keyword that matched.
  await search.fill('opacity')
  const items = page.locator('.sd-item')
  await expect(items.first()).toBeVisible()
  for (let index = 0; index < await items.count(); index++) {
    const item = items.nth(index)
    if (!(await item.isVisible())) continue
    const marks = await item.locator('.sd-mark').count()
    const matches = await item.locator('.sd-matches').count()
    expect(marks + matches, await item.innerText()).toBeGreaterThan(0)
  }

  expect(errors).toEqual([])
})

test('the settings rail groups sections and navigates with the keyboard', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await openDrawer(page)
  const rail = page.getByRole('tablist', { name: 'Settings sections' })
  const tabs = rail.getByRole('tab')
  await expect(tabs).toHaveCount(10)
  await expect(rail.locator('.sd-rail-title')).toHaveText(['Look', 'Layout', 'Content', 'Advanced', 'System'])
  await expect(tabs).toHaveText(['Theme', 'Background', 'Areas & grid', 'Widgets', 'Websites', 'Search', 'Custom CSS', 'AI assistant', 'Backup & import', 'About'])

  const box = await rail.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(180)
  expect(box!.width).toBeLessThanOrEqual(200)
  const fit = await rail.evaluate(element => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }))
  expect(fit.scrollHeight).toBeLessThanOrEqual(fit.clientHeight)

  // One roving tab stop and a panel labelled by the active tab.
  expect(await rail.locator('[role=tab][tabindex="0"]').count()).toBe(1)
  expect(await page.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(await tabs.first().getAttribute('id'))

  await tabs.first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: 'Background' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab', { name: 'Theme' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('tab', { name: 'Backup & import' })).toHaveAttribute('aria-selected', 'true')

  // No new axe violations with the rail open, in dark and light themes.
  const violations = async () => (await new AxeBuilder({ page }).include('.sd').analyze()).violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')
  expect(await violations()).toEqual([])
  await page.getByRole('tab', { name: 'Theme' }).click()
  await page.getByRole('button', { name: 'Paper' }).click()
  expect(await violations()).toEqual([])
  await page.screenshot({ path: `${SHOTS}/rail.png` })

  expect(errors).toEqual([])
})

/** Alpha of the scrim over the page, 0 (transparent) to 1 (opaque). */
async function scrimAlpha(page: Page) {
  return await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    context.fillStyle = getComputedStyle(document.querySelector('.scrim')!).backgroundColor
    context.fillRect(0, 0, 1, 1)
    return context.getImageData(0, 0, 1, 1).data[3] / 255
  })
}

/** The topmost element at the page centre; the scrim must cover the page even when transparent. */
async function centreIsScrim(page: Page) {
  return await page.evaluate(() => document.elementFromPoint(200, 450)?.classList.contains('scrim') ?? false)
}

test('the page stays bright while editing and the panel can peek away', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)

  // Transparent but still click-blocking: a click on the page never reaches a tile.
  expect(await scrimAlpha(page)).toBe(0)
  expect(await centreIsScrim(page)).toBe(true)
  // Nothing dims the page through an ancestor filter, and the scrim is the only overlay.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).filter)).toBe('none')
  expect(await page.evaluate(() => getComputedStyle(document.body).filter)).toBe('none')
  await expect(page.locator('.scrim')).toHaveCount(1)
  const url = page.url()
  await page.mouse.click(200, 450)
  expect(page.url()).toBe(url)
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await expect(page.locator('[data-edit-mode]')).toHaveCount(0)

  // Reopen, pick a section, and peek: the drawer leaves the viewport but the page stays blocked.
  await openDrawer(page)
  expect(await page.evaluate(() => document.querySelector('.sd')?.contains(document.activeElement))).toBe(true)
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click()
  await page.screenshot({ path: `${SHOTS}/preview-full.png` })
  await page.getByRole('button', { name: 'Peek', exact: true }).click()
  const handle = page.getByRole('button', { name: 'Show settings', exact: true })
  await expect(handle).toBeVisible()
  await expect(handle).toBeFocused()
  await expect.poll(async () => (await page.locator('.sd').boundingBox())!.x).toBeGreaterThanOrEqual(1400)
  expect(await centreIsScrim(page)).toBe(true)
  await page.screenshot({ path: `${SHOTS}/preview-peeked.png` })

  // The handle restores the panel at the same section.
  await handle.click()
  await expect(page.getByRole('tab', { name: 'Widgets', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect.poll(async () => {
    const box = (await page.locator('.sd').boundingBox())!
    return box.x + box.width
  }).toBeLessThanOrEqual(1401)

  // Esc restores a peeked panel as well.
  await page.getByRole('button', { name: 'Peek', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Peek', exact: true })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Widgets', exact: true })).toHaveAttribute('aria-selected', 'true')

  // Under 1024 px the dimmed scrim stays and there is no Peek affordance.
  await page.setViewportSize({ width: 800, height: 900 })
  await expect(page.getByRole('button', { name: 'Peek', exact: true })).toHaveCount(0)
  const alpha = await scrimAlpha(page)
  expect(alpha).toBeGreaterThanOrEqual(.55)
  expect(alpha).toBeLessThanOrEqual(.65)

  expect(errors).toEqual([])
})
