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

async function openLayout(page: Page, advanced = true) {
  await page.getByRole('tab', { name: 'Areas & grid', exact: true }).click()
  if (!advanced) return
  await page.locator('.sd-advanced summary').click()
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

/** The topmost element in the strip left of the 640 px drawer at 800 px width. */
async function leftIsScrim(page: Page) {
  return await page.evaluate(() => document.elementFromPoint(80, 450)?.classList.contains('scrim') ?? false)
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
  // The scrim absorbs the click, then dismisses settings.
  await expect(page.getByRole('dialog')).toHaveCount(0)
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

test('the settings scrim blocks page clicks at every width', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 800, height: 900 })
  await openDrawer(page)
  const violations = async () => (await new AxeBuilder({ page }).analyze()).violations.filter(issue => issue.impact === 'serious' || issue.impact === 'critical')
  expect(await violations()).toEqual([])

  // The drawer is 640 px wide; the strip left of it is the dimmed scrim.
  const shortcuts = await page.locator('.shortcut').count()
  const pages = page.context().pages().length
  const url = page.url()
  const alpha = await scrimAlpha(page)
  expect(alpha).toBeGreaterThanOrEqual(.55)
  expect(alpha).toBeLessThanOrEqual(.65)
  expect(await leftIsScrim(page)).toBe(true)

  await page.mouse.click(80, 450)
  expect(page.url()).toBe(url)
  expect(await page.locator('.shortcut').count()).toBe(shortcuts)
  expect(page.context().pages().length).toBe(pages)
  await expect(page.locator('.edit-toolbar')).toHaveCount(0)
  await expect(page.locator('[data-edit-mode]')).toHaveCount(0)
  // The click is absorbed by the scrim, then dismisses settings.
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // At 1400 px the scrim is transparent but still blocks and dismisses.
  await openDrawer(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  expect(await scrimAlpha(page)).toBe(0)
  expect(await centreIsScrim(page)).toBe(true)
  await page.mouse.click(200, 450)
  expect(page.url()).toBe(url)
  expect(await page.locator('.shortcut').count()).toBe(shortcuts)
  expect(page.context().pages().length).toBe(pages)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // The generic widget scrim keeps passing clicks through; only the settings one blocks.
  expect(await page.evaluate(() => {
    const element = document.createElement('div')
    element.className = 'scrim'
    document.body.append(element)
    const value = getComputedStyle(element).pointerEvents
    element.remove()
    return value
  })).toBe('none')

  expect(errors).toEqual([])
})

test('the section header stays in view with the reset action', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page)

  const panel = page.getByRole('tabpanel')
  const header = page.locator('.sd-section-head')
  await expect(header).toBeVisible()
  await expect(header.getByRole('heading', { name: 'Areas & grid', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Restore section defaults', exact: true })).toBeVisible()
  // Only the header owns the reset; the old panel footer is gone.
  await expect(page.getByRole('button', { name: 'Restore section defaults', exact: true })).toHaveCount(1)
  await expect(page.locator('.sd-restore')).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/header-top.png` })

  const panelBox = (await panel.boundingBox())!
  const before = (await header.boundingBox())!
  await panel.evaluate(element => { element.scrollTop = 600 })
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBe(600)

  const after = (await header.boundingBox())!
  // Sticky: the header stays at the panel's top edge (the 8 px content padding included) while scrolling.
  expect(after.y).toBeGreaterThanOrEqual(panelBox.y)
  expect(after.y).toBeLessThanOrEqual(panelBox.y + 10)
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
  await expect(header.getByRole('heading', { name: 'Areas & grid', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Restore section defaults', exact: true })).toBeInViewport()
  await page.screenshot({ path: `${SHOTS}/header-scrolled.png` })

  expect(errors).toEqual([])
})

test('the layout diagram previews the committed area grid', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page)

  const preview = page.locator('.sd-grid-preview')
  const blocks = preview.locator('.sd-grid-block')
  await expect(preview).toBeVisible()
  await expect(blocks).toHaveText(['Overview', 'Shortcuts'])
  await expect(preview).toHaveAttribute('role', 'group')
  await expect(preview).toHaveAttribute('aria-label', 'Current area grid preview: Overview, Shortcuts')
  // Read-only: nothing in the diagram is focusable or editable.
  await expect(preview.locator('input, textarea, select, button, [contenteditable]')).toHaveCount(0)

  const geometry = () => page.evaluate(() => {
    const read = (rootSelector: string) => {
      const root = document.querySelector<HTMLElement>(rootSelector)!
      const box = root.getBoundingClientRect()
      const left = box.left + root.clientLeft
      const width = root.clientWidth
      return {
        areas: getComputedStyle(root).gridTemplateAreas,
        blocks: Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-area]')].map(element => {
          const rect = element.getBoundingClientRect()
          return [element.dataset.area!, { left: (rect.left - left) / width, right: (rect.right - left) / width }]
        })),
      }
    }
    return { preview: read('.sd-grid-preview'), page: read('.mnt-layout') }
  })

  // Stacked: the diagram mirrors the page's rows.
  await expect.poll(async () => (await geometry()).page.areas).toBe('"overview" "bookmarks"')
  await expect.poll(async () => (await geometry()).preview.areas).toBe('"overview" "bookmarks"')
  await page.screenshot({ path: `${SHOTS}/grid-preview.png` })

  // Side by side: the page and the diagram keep the same column proportions.
  await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
  await page.getByRole('option', { name: 'Side by side', exact: true }).click()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', 'split')
  await expect.poll(async () => (await geometry()).page.areas).toBe('"bookmarks overview"')
  await expect.poll(async () => (await geometry()).preview.areas).toBe('"bookmarks overview"')
  await expect(blocks).toHaveText(['Shortcuts', 'Overview'])
  await expect(preview).toHaveAttribute('aria-label', 'Current area grid preview: Shortcuts, Overview')
  const split = await geometry()
  const previewWidth = await preview.evaluate(element => element.clientWidth)
  for (const area of ['bookmarks', 'overview']) {
    const previewBlock = split.preview.blocks[area]
    const pageBlock = split.page.blocks[area]
    expect(Math.abs(previewBlock.left - pageBlock.left) * previewWidth, `${area} left edge`).toBeLessThanOrEqual(2)
    expect(Math.abs(previewBlock.right - pageBlock.right) * previewWidth, `${area} right edge`).toBeLessThanOrEqual(2)
  }
  // Side by side puts the shortcuts on the left and the overview on the right, on both.
  const pageBoxes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('.mnt-layout .mnt-area[data-area]')].map(element => [element.dataset.area!, element.getBoundingClientRect().left])))
  expect(pageBoxes.bookmarks).toBeLessThan(pageBoxes.overview)
  expect(split.preview.blocks.bookmarks.left).toBeLessThan(split.preview.blocks.overview.left)

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  // An invalid draft leaves the diagram on the committed grid; a valid edit moves it.
  const committed = await preview.evaluate(element => element.innerHTML)
  const areas = page.getByRole('textbox', { name: 'Area grid' })
  await areas.fill('bookmarks overview\nbookmarks overview')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await preview.evaluate(element => element.innerHTML)).toBe(committed)
  expect((await geometry()).preview.areas).toBe('"bookmarks overview"')

  await areas.fill('overview bookmarks')
  await expect.poll(async () => (await geometry()).preview.areas).toBe('"overview bookmarks"')
  await expect(blocks).toHaveText(['Overview', 'Shortcuts'])

  expect(errors).toEqual([])
})

test('the grid preview names its areas in the current locale', async ({ page }) => {
  await seedExistingUser(page, { language: 'zh-CN' })
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  await expect(page.locator('.mnt-layout')).toBeVisible()
  await page.locator('.mnt-settings-entry').first().click()
  await page.getByRole('tab', { name: '区域与网格', exact: true }).click()
  const preview = page.locator('.sd-grid-preview')
  await expect(preview).toBeVisible()
  await expect(preview.locator('.sd-grid-block')).toHaveText(['概览', '快捷方式'])
  await expect(preview).toHaveAttribute('aria-label', '当前区域网格预览：概览、快捷方式')
})

test('a custom area can be renamed from the layout diagram', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page)

  // Two custom areas: the preview names them and only they are renameable.
  const areas = page.getByRole('textbox', { name: 'Area grid' })
  await areas.fill('overview bookmarks\ntop side')
  const preview = page.locator('.sd-grid-preview')
  await expect.poll(async () => preview.locator('.sd-grid-block').allTextContents()).toEqual(['Overview', 'Shortcuts', 'top', 'side'])
  await expect(preview.locator('button.sd-grid-block')).toHaveCount(2)
  await expect(preview.locator('button[data-area="overview"], button[data-area="bookmarks"]')).toHaveCount(0)

  // The narrow grid must know the area too: widgets may only live in areas every grid has.
  const narrowAreas = page.getByRole('textbox', { name: 'Narrow layout' })
  await narrowAreas.fill('overview\nbookmarks\nside')
  await expect.poll(async () => preview.locator('.sd-grid-block').allTextContents()).toEqual(['Overview', 'Shortcuts', 'top', 'side'])

  // Put a widget in the area, so the rename has to carry it across.
  const clockItem = page.locator('.sd-note').filter({ hasText: 'Show clock' })
  await clockItem.getByRole('combobox', { name: 'Widget area' }).click()
  await page.getByRole('option', { name: 'side', exact: true }).click()
  await expect(page.locator('.mnt-layout .mnt-area[data-area="side"] .clock')).toBeVisible()

  await preview.locator('[data-area="side"]').click()
  const field = page.getByRole('textbox', { name: 'Rename area' })
  await expect(field).toBeVisible()
  await expect(field).toHaveValue('side')
  await field.fill('aside')
  await field.press('Enter')
  await expect(field).toHaveCount(0)

  // Grid text, preview, widget area and the rendered page all follow the rename.
  await expect(areas).toHaveValue('overview bookmarks\ntop aside')
  await expect(narrowAreas).toHaveValue('overview\nbookmarks\naside')
  await expect(preview.locator('[data-area="side"]')).toHaveCount(0)
  await expect(preview.locator('[data-area="aside"]')).toHaveText('aside')
  await expect(clockItem.getByRole('combobox', { name: 'Widget area' })).toContainText('aside')
  await expect(page.locator('.mnt-layout .mnt-area[data-area="aside"] .clock')).toBeVisible()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('style', /aside/)

  // The whole rename is one undo step.
  await page.keyboard.press('Control+z')
  await expect(preview.locator('[data-area="aside"]')).toHaveCount(0)
  await expect(preview.locator('[data-area="side"]')).toHaveText('side')
  await expect(areas).toHaveValue('overview bookmarks\ntop side')
  await expect(narrowAreas).toHaveValue('overview\nbookmarks\nside')
  await expect(page.locator('.mnt-layout .mnt-area[data-area="side"] .clock')).toBeVisible()
  await expect(clockItem.getByRole('combobox', { name: 'Widget area' })).toContainText('side')

  // A duplicate name shows the alert and commits nothing.
  await preview.locator('[data-area="side"]').click()
  await field.fill('top')
  await field.press('Enter')
  await expect(page.getByRole('alert')).toContainText('“top”')
  await expect(preview.locator('[data-area="side"]')).toHaveText('side')
  await expect(areas).toHaveValue('overview bookmarks\ntop side')
  await expect(page.locator('.mnt-layout .mnt-area[data-area="side"] .clock')).toBeVisible()

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('the preview explains which areas can be renamed', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page)

  const figure = page.locator('.sd-grid-figure')
  const hint = figure.locator('.sd-hint')
  await expect(hint).toHaveText('Click a custom area to rename it. Overview and Shortcuts are built in.')
  await expect(hint).toHaveClass(/\bsd-hint\b/)
  // It follows the diagram, outside the group that carries the diagram's name.
  expect(await figure.evaluate(element => {
    const preview = element.querySelector('.sd-grid-preview')!
    const note = element.querySelector('.sd-hint')!
    return !preview.contains(note) && (preview.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  })).toBe(true)
  // Muted hint style, not a second section description.
  const colors = await page.evaluate(() => ['.sd-hint', '.sd-section-desc'].map(selector => getComputedStyle(document.querySelector(selector)!).color))
  expect(colors[0]).toBe(colors[1])
  await expect(page.locator('.sd-section-desc')).not.toHaveText(/custom area to rename/)
  await page.screenshot({ path: `${SHOTS}/layout-hint.png` })

  // The hint is translated with the rest of the drawer.
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  await page.getByRole('combobox', { name: 'Language', exact: true }).click()
  await page.getByRole('option', { name: '简体中文', exact: true }).click()
  await page.getByRole('tab', { name: '区域与网格', exact: true }).click()
  await expect(page.locator('.sd-grid-figure .sd-hint')).toHaveText('点击自定义区域即可重命名。概览和快捷方式是内置区域。')

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('the raw layout DSL sits behind an advanced disclosure', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page, false)

  const advanced = page.locator('.sd-advanced')
  const summary = advanced.locator('summary')
  await expect(summary).toHaveText('Advanced')
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(false)
  await expect(page.locator('.sd-panel textarea:visible')).toHaveCount(0)
  await expect(page.locator('.sd-grid-preview')).toBeVisible()
  // The visual path — template, preview, hint — plus the Advanced entry fit above the fold.
  const summaryBox = (await summary.boundingBox())!
  expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(900)
  await page.screenshot({ path: `${SHOTS}/layout-collapsed.png` })

  await summary.click()
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(true)
  const fields = advanced.locator('textarea')
  await expect(fields).toHaveCount(6)
  await expect(page.locator('.sd-panel textarea:visible')).toHaveCount(6)
  expect(await fields.evaluateAll(elements => elements.map(element => (element as HTMLTextAreaElement).placeholder))).toEqual([
    'overview bookmarks\ntop side', '1fr 240px minmax(0, 1fr)', 'auto 1fr',
    'overview bookmarks\ntop side', '1fr 240px minmax(0, 1fr)', 'auto 1fr',
  ])
  await page.screenshot({ path: `${SHOTS}/layout-expanded.png` })

  // A custom area gives the preview a rename control; it precedes Advanced in the tab order.
  await fields.nth(0).fill('overview bookmarks\nside side')
  await summary.click()
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(false)
  await page.getByRole('combobox', { name: 'Layout', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('.sd-grid-preview button[data-area="side"]')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(summary).toBeFocused()

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('search opens the advanced layout fields it matches', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await openLayout(page, false)

  const advanced = page.locator('.sd-advanced')
  const summary = advanced.locator('summary')
  await expect(summary).toHaveText('Advanced')
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(false)

  const search = page.getByRole('searchbox', { name: 'Search settings' })
  await search.fill('Column sizes')
  // The matched field is reachable while the query is alive.
  await expect(summary).toBeVisible()
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(true)
  const columns = page.getByRole('textbox', { name: 'Column sizes' }).first()
  await expect(columns).toBeVisible()
  // Editing still commits as it does outside search.
  await columns.fill('1fr')
  await expect.poll(async () => await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId].layout.columns ?? null
  })).toEqual(['1fr'])

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  // Clearing the query returns the disclosure to its normal collapsed state.
  await search.fill('')
  await expect(summary).toBeVisible()
  expect(await advanced.evaluate(element => (element as HTMLDetailsElement).open)).toBe(false)
  await expect(page.locator('.sd-panel textarea:visible')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('the gradient editor previews the rendered background', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('radio', { name: 'Gradient', exact: true }).click()

  const strip = page.locator('.sd-gradient-preview')
  await expect(strip).toBeVisible()
  const box = (await strip.boundingBox())!
  expect(box.width).toBeGreaterThan(400)
  expect(box.height).toBeGreaterThanOrEqual(72)
  await expect(strip).toHaveAttribute('data-angle', '135')
  await expect(page.locator('.sd-gradient-angle')).toHaveText('135°')
  await expect(page.locator('.sd-gradient-stop')).toHaveCount(2)
  await expect(page.locator('.sd-gradient-stop[data-position="0"], .sd-gradient-stop[data-position="100"]')).toHaveCount(2)

  // The strip and the page's background layer render the same gradient, not a placeholder bar.
  const backgrounds = () => page.evaluate(() => ({
    strip: getComputedStyle(document.querySelector('.sd-gradient-preview')!).backgroundImage,
    page: getComputedStyle(document.querySelector('.app')!).backgroundImage,
  }))
  await expect.poll(async () => { const value = await backgrounds(); return value.strip === value.page && value.strip !== 'none' }).toBe(true)
  const corners = async () => {
    const rect = (await strip.boundingBox())!
    return {
      topLeft: await page.screenshot({ clip: { x: rect.x + 4, y: rect.y + 4, width: 1, height: 1 } }),
      bottomRight: await page.screenshot({ clip: { x: rect.x + rect.width - 5, y: rect.y + rect.height - 5, width: 1, height: 1 } }),
    }
  }
  await page.screenshot({ path: `${SHOTS}/gradient-135.png` })
  const before = await corners()
  expect(before.topLeft.equals(before.bottomRight)).toBe(false)

  await page.getByRole('spinbutton', { name: 'Angle value' }).fill('45')
  await page.getByRole('spinbutton', { name: 'Angle value' }).press('Enter')
  await expect(strip).toHaveAttribute('data-angle', '45')
  await expect(page.locator('.sd-gradient-angle')).toHaveText('45°')
  await expect.poll(async () => { const value = await backgrounds(); return value.strip === value.page }).toBe(true)
  const after = await corners()
  // Rotating from 135° to 45° swaps the colour at each corner.
  expect(after.topLeft.equals(before.topLeft)).toBe(false)
  expect(after.bottomRight.equals(before.bottomRight)).toBe(false)
  await page.screenshot({ path: `${SHOTS}/gradient-45.png` })

  // The border separates the strip from the panel in both modes.
  const contrast = () => page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    const rgb = (value: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
        const s = channel / 255
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4
      })
    }
    const luminance = (channels: number[]) => .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
    const strip = document.querySelector('.sd-gradient-preview')!
    const drawer = document.querySelector('.drawer.sd')!
    const a = luminance(rgb(getComputedStyle(strip).borderTopColor))
    const b = luminance(rgb(getComputedStyle(drawer).backgroundColor))
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
  })
  expect(await contrast()).toBeGreaterThanOrEqual(3)

  // Light mode never renders the gradient, so the strip says so instead of pretending.
  await page.getByRole('tab', { name: 'Theme', exact: true }).click()
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await expect(page.locator('.sd-gradient')).toContainText('Gradients are only shown in dark mode.')
  const modes = await backgrounds()
  expect(modes.strip).not.toBe('none')
  expect(modes.page).toBe('none')
  expect(await contrast()).toBeGreaterThanOrEqual(3)

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('the focal point preview shares the stored position', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('radio', { name: 'Image', exact: true }).click()
  await page.locator('input[type=file]').first().setInputFiles('e2e/fixtures/upscaled-32-to-128.png')

  const preview = page.locator('.sd-focal-preview')
  await expect(preview).toBeVisible()
  // Pointer-only: keyboard users keep the sliders, with nothing new in the tab order.
  await expect(preview).not.toHaveAttribute('tabindex')
  await expect(preview).not.toHaveAttribute('role')

  const stored = () => page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId].background.image?.position ?? null
  })
  const parsed = async () => {
    const value = String(await stored())
    const match = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(value)
    return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 50, y: 50 }
  }
  const centre = () => page.evaluate(() => {
    const box = document.querySelector('.sd-focal-preview')!.getBoundingClientRect()
    const cross = document.querySelector('.sd-focal-crosshair')!.getBoundingClientRect()
    return { x: (cross.left + cross.width / 2 - box.left) / box.width * 100, y: (cross.top + cross.height / 2 - box.top) / box.height * 100 }
  })

  expect(await parsed()).toEqual({ x: 50, y: 50 })
  const initial = await centre()
  expect(Math.abs(initial.x - 50)).toBeLessThanOrEqual(2)
  expect(Math.abs(initial.y - 50)).toBeLessThanOrEqual(2)

  // Clicking at 25 % / 75 % writes the same value the sliders and named buttons write.
  await preview.scrollIntoViewIfNeeded()
  const box = (await preview.boundingBox())!
  await page.mouse.click(box.x + box.width * .25, box.y + box.height * .75)
  await expect.poll(parsed).toEqual({ x: 25, y: 75 })
  const clicked = await centre()
  expect(Math.abs(clicked.x - 25)).toBeLessThanOrEqual(2)
  expect(Math.abs(clicked.y - 75)).toBeLessThanOrEqual(2)
  await expect(page.getByRole('radiogroup', { name: 'Focal point' }).getByRole('radio', { checked: true })).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/focal.png` })

  // Dragging keeps the same source of truth.
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2, { steps: 4 })
  await page.mouse.up()
  await expect.poll(async () => {
    const value = await parsed()
    return Math.abs(value.x - 80) <= 2 && Math.abs(value.y - 20) <= 2
  }).toBe(true)

  // Keyboard navigation stays on the existing controls; the preview never enters the tab order.
  await page.getByRole('slider', { name: 'Horizontal position' }).focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.classList.contains('sd-focal-preview'))).toBe(false)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('slider', { name: 'Vertical position' })).toBeFocused()

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

const DROP_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('the wallpaper pickers are styled, labelled controls', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('radio', { name: 'Image', exact: true }).click()

  const zones = page.locator('.sd-file')
  await expect(zones).toHaveCount(2)
  // The visible control is a localized button; the native input is clipped and out of the tab order.
  await expect(page.getByRole('button', { name: 'Upload images (PNG, JPEG, WebP, up to 5 MB each)', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload a video (MP4 or WebM, up to 30 MB)', exact: true })).toBeVisible()
  const inputs = page.locator('.sd-file input[type=file]')
  await expect(inputs).toHaveCount(2)
  for (const input of await inputs.all()) {
    await expect(input).toHaveClass(/visually-hidden/)
    await expect(input).toHaveCSS('clip-path', 'inset(50%)')
    await expect(input).toHaveAttribute('tabindex', '-1')
  }
  await expect(page.getByText('No file chosen', { exact: true })).toHaveCount(2)
  await page.screenshot({ path: `${SHOTS}/upload.png` })

  // Picking a file still runs the wallpaper flow and shows the chosen name.
  await inputs.first().setInputFiles('e2e/fixtures/upscaled-32-to-128.png')
  await expect(zones.first().locator('.sd-file-name')).toHaveText('upscaled-32-to-128.png')
  await expect(page.locator('.sd-focal-preview')).toBeVisible()

  // Dropping a file adds the drag-over state, clears it, and uploads the dropped file.
  await page.evaluate(data => {
    const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'drop.png', { type: 'image/png' }))
    ;(window as Window & { __transfer?: DataTransfer }).__transfer = transfer
    document.querySelector('.sd-file')!.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  }, DROP_PNG)
  await expect(zones.first()).toHaveAttribute('data-dragover', 'true')
  await page.evaluate(() => {
    const transfer = (window as Window & { __transfer?: DataTransfer }).__transfer
    document.querySelector('.sd-file')!.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })
  await expect(zones.first()).not.toHaveAttribute('data-dragover')
  await expect(zones.first().locator('.sd-file-name')).toHaveText('drop.png')
  await expect(page.locator('.sd-focal-preview')).toBeVisible()

  let scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  // The same control in zh-CN.
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  await page.getByRole('combobox', { name: 'Language', exact: true }).click()
  await page.getByRole('option', { name: '简体中文', exact: true }).click()
  await page.getByRole('tab', { name: '背景', exact: true }).click()
  await expect(page.getByRole('button', { name: '上传本地图片（PNG、JPEG、WebP，每张最大 5 MB）', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '上传本地视频（MP4 或 WebM，最大 30 MB）', exact: true })).toBeVisible()
  await expect(page.getByText('未选择文件', { exact: true })).toHaveCount(2)
  await page.screenshot({ path: `${SHOTS}/upload-zh.png` })

  scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('background and layout controls explain their effect', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('radio', { name: 'Image', exact: true }).click()

  // The image hint is part of the upload block, directly after the image picker.
  const imageHint = page.getByText('Upload an image to adjust blur, grayscale, zoom and focal point.')
  await expect(imageHint).toBeVisible()
  expect(await imageHint.evaluate(element => element.parentElement?.classList.contains('sd-upload'))).toBe(true)
  expect(await imageHint.evaluate(element => element.previousElementSibling?.classList.contains('sd-file'))).toBe(true)
  await page.getByRole('radio', { name: 'Video', exact: true }).click()
  await expect(imageHint).toHaveCount(0)
  await page.getByRole('radio', { name: 'Image', exact: true }).click()
  await page.locator('.sd-file input[type=file]').first().setInputFiles('e2e/fixtures/upscaled-32-to-128.png')
  await expect(imageHint).toHaveCount(0)
  await expect(page.locator('.sd-focal-preview')).toBeVisible()

  const hint = async (name: string) => {
    const row = page.locator('.sd-row').filter({ has: page.getByText(name, { exact: true }) }).first()
    const small = row.locator('.sd-range-hint')
    await expect(small, `${name} hint`).toHaveCount(1)
    const text = (await small.innerText()).trim()
    expect(text, `${name} hint is not empty`).not.toBe('')
    expect(text, `${name} hint is not the label`).not.toBe(name)
    return text
  }
  const overflow = async () => page.locator('.sd-panel').evaluate(element => element.scrollWidth <= element.clientWidth)

  for (const label of ['Overlay opacity', 'Vignette', 'Grayscale', 'Image zoom']) await hint(label)
  expect(await overflow(), 'background panel').toBe(true)

  await page.getByRole('tab', { name: 'Areas & grid', exact: true }).click()
  for (const label of ['Area opacity', 'Area blur', 'Area padding', 'Top accent divider', 'Right accent divider', 'Bottom accent divider', 'Left accent divider', 'Max columns']) await hint(label)
  expect(await overflow(), 'layout panel at 1400').toBe(true)
  await page.setViewportSize({ width: 420, height: 800 })
  expect(await overflow(), 'layout panel at 420').toBe(true)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  expect(await overflow(), 'background panel at 420').toBe(true)
  await page.setViewportSize({ width: 1400, height: 900 })

  // The same hints in zh-CN.
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  await page.getByRole('combobox', { name: 'Language', exact: true }).click()
  await page.getByRole('option', { name: '简体中文', exact: true }).click()
  await page.getByRole('tab', { name: '背景', exact: true }).click()
  for (const label of ['遮罩浓度', '晕影', '灰度', '图片缩放']) await hint(label)
  await page.getByRole('tab', { name: '区域与网格', exact: true }).click()
  for (const label of ['区域透明度', '区域模糊', '区域内边距', '上边强调线', '右边强调线', '下边强调线', '左边强调线', '每行最多列数']) await hint(label)
  expect(await overflow(), 'zh layout panel').toBe(true)

  expect(errors).toEqual([])
})

test('range hints describe their sliders for screen readers', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('radio', { name: 'Image', exact: true }).click()
  await page.locator('.sd-file input[type=file]').first().setInputFiles('e2e/fixtures/upscaled-32-to-128.png')

  const rowFor = (label: string) => page.locator('.sd-row').filter({ has: page.getByText(label, { exact: true }) }).first()
  const slider = (label: string) => page.getByRole('slider', { name: label, exact: true }).first()
  const describe = async (label: string, description: string) => {
    await expect(slider(label), label).toHaveAccessibleDescription(description)
  }

  // No visual change: the hint still sits under the label inside the range head.
  const overlayRow = rowFor('Overlay opacity')
  const small = overlayRow.locator('.sd-range-hint')
  await expect(small).toHaveCount(1)
  const labelBox = await overlayRow.locator('.sd-label').boundingBox()
  const hintBox = await small.boundingBox()
  expect(hintBox!.y, 'hint is under the label').toBeGreaterThanOrEqual(labelBox!.y + labelBox!.height)
  expect(await small.evaluate(element => element.parentElement?.classList.contains('sd-range-head'))).toBe(true)

  // Every hint-bearing slider in en, and its number input, is described by the hint.
  await describe('Overlay opacity', 'Darkens the page behind the content.')
  await expect(page.getByRole('spinbutton', { name: 'Overlay opacity value', exact: true }).first()).toHaveAccessibleDescription('Darkens the page behind the content.')
  await describe('Vignette', 'Darkens the corners of the image.')
  await describe('Grayscale', 'Removes colour from the image.')
  await describe('Image zoom', 'Scales the image inside its frame.')

  // A range without a hint has no description.
  await expect(slider('Blur')).toHaveAccessibleDescription('')
  await expect(page.getByRole('spinbutton', { name: 'Blur value', exact: true }).first()).toHaveAccessibleDescription('')

  await page.getByRole('tab', { name: 'Areas & grid', exact: true }).click()
  await describe('Area opacity', 'Fades this area’s background behind its widgets.')
  await describe('Area blur', 'Blurs what shows through this area.')
  await describe('Area padding', 'Adds space between the area edge and its widgets.')
  await describe('Top accent divider', 'Draws an accent line along the top edge.')
  await describe('Right accent divider', 'Draws an accent line along the right edge.')
  await describe('Bottom accent divider', 'Draws an accent line along the bottom edge.')
  await describe('Left accent divider', 'Draws an accent line along the left edge.')
  await describe('Max columns', 'Sets how many shortcuts fit on one row.')

  let scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  // A zh-CN sample: the description is the translated hint.
  await page.getByRole('tab', { name: 'About', exact: true }).click()
  await page.getByRole('combobox', { name: 'Language', exact: true }).click()
  await page.getByRole('option', { name: '简体中文', exact: true }).click()
  await page.getByRole('tab', { name: '背景', exact: true }).click()
  await describe('遮罩浓度', '加深内容后方的页面底色。')
  await expect(page.getByRole('spinbutton', { name: '遮罩浓度的数值', exact: true }).first()).toHaveAccessibleDescription('加深内容后方的页面底色。')
  await page.getByRole('tab', { name: '区域与网格', exact: true }).click()
  await describe('区域透明度', '调整区域背景在其组件后方的透明度。')
  await describe('每行最多列数', '设置每行可容纳的快捷方式数量。')

  scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})

test('widget settings are grouped into collapsible cards', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))

  await launch(page)
  await page.setViewportSize({ width: 1400, height: 900 })
  await openDrawer(page)
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click()

  const cards = page.locator('.sd-widget-card')
  await expect(cards).toHaveCount(4)
  // Clock and date keep their disclosure; default rows keep it closed.
  for (const id of ['widget-clock', 'widget-date']) {
    const card = page.locator(`[data-widget-card="${id}"]`)
    await expect(card.locator('.sd-widget-switch input[type=checkbox]')).toHaveCount(1)
    await expect(card.locator('summary')).toHaveAttribute('aria-expanded', 'false')
  }
  // Search and shortcuts only have a header switch: no summary and no chevron.
  const searchCard = page.locator('[data-widget-card="showSearch"]')
  const shortcutsCard = page.locator('[data-widget-card="widget-shortcuts"]')
  for (const card of [searchCard, shortcutsCard]) {
    await expect(card).toHaveClass(/sd-widget-card-plain/)
    await expect(card.locator('input[type=checkbox]')).toHaveCount(1)
    await expect(card.locator('summary')).toHaveCount(0)
    await expect(card.locator('svg')).toHaveCount(0)
  }
  await page.screenshot({ path: `${SHOTS}/widgets-cards.png` })
  // Tab moves straight from one plain switch to the next card.
  await searchCard.locator('input[type=checkbox]').focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.closest('[data-widget-card]')?.getAttribute('data-widget-card'))).toBe('widget-shortcuts')

  // One click opens the clock card; its header switch hides the clock and the card stays open.
  const clockCard = page.locator('[data-widget-card="widget-clock"]')
  const clockSummary = clockCard.locator('summary')
  await clockSummary.click()
  await expect(clockSummary).toHaveAttribute('aria-expanded', 'true')
  await expect(clockCard.getByLabel('Show hours')).toBeVisible()
  await clockCard.locator('.sd-widget-switch input[type=checkbox]').click()
  await expect(page.locator('[data-widget="clock"]')).toHaveCount(0)
  await expect(clockSummary).toHaveAttribute('aria-expanded', 'true')
  await clockCard.locator('.sd-widget-switch input[type=checkbox]').click()
  await expect(page.locator('[data-widget="clock"]')).toHaveCount(1)

  // Enter and Space toggle the same disclosure; a closed card keeps its rows out of the tab order.
  await clockSummary.focus()
  await page.keyboard.press('Enter')
  await expect(clockSummary).toHaveAttribute('aria-expanded', 'false')
  await expect(clockCard.getByLabel('Show hours')).toBeHidden()
  const hoursId = await clockCard.getByLabel('Show hours').getAttribute('id')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.id)).not.toBe(hoursId)
  await clockSummary.focus()
  await page.keyboard.press('Space')
  await expect(clockSummary).toHaveAttribute('aria-expanded', 'true')
  await expect(clockCard.getByLabel('Show hours')).toBeVisible()

  // Date and search switch the rendered page immediately, and their cards stay open.
  const dateCard = page.locator('[data-widget-card="widget-date"]')
  await dateCard.locator('summary').click()
  await dateCard.locator('.sd-widget-switch input[type=checkbox]').click()
  await expect(page.locator('[data-widget="date"]')).toHaveCount(0)
  await expect(dateCard.locator('summary')).toHaveAttribute('aria-expanded', 'true')
  await searchCard.locator('input[type=checkbox]').click()
  await expect(page.locator('[data-widget="search"]')).toHaveCount(0)
  await shortcutsCard.locator('input[type=checkbox]').click()
  await expect(page.locator('[data-widget="bookmarks"]')).toHaveCount(0)

  // Open state survives leaving and re-entering the section within the same drawer.
  await page.getByRole('tab', { name: 'Background', exact: true }).click()
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click()
  await expect(clockSummary).toHaveAttribute('aria-expanded', 'true')
  await expect(dateCard.locator('summary')).toHaveAttribute('aria-expanded', 'true')

  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(scan.violations.filter(issue => issue.impact === 'critical' || issue.impact === 'serious' || (issue.impact === 'moderate' && issue.id !== 'heading-order'))).toEqual([])

  expect(errors).toEqual([])
})
