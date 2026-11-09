import { expect, test, type Page } from '@playwright/test'
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
  await page.getByRole('tab', { name: 'Style', exact: true }).click()
  await expect(page.locator('.cm-content')).toBeVisible()
}

async function openLayout(page: Page) {
  await page.getByRole('tab', { name: 'Layout', exact: true }).click()
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
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Style', exact: true })).toBeVisible()
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

test('the custom CSS editor follows the active theme', async ({ page }) => {
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
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await page.getByRole('button', { name: 'Paper', exact: true }).click()
  await openStyle(page)
  await expectEditorReadable(page)
  await page.screenshot({ path: `${SHOTS}/style-light.png` })

  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await page.getByRole('button', { name: 'Contrast', exact: true }).click()
  await openStyle(page)
  await expectEditorReadable(page)
  await page.screenshot({ path: `${SHOTS}/style-contrast.png` })

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
  await page.getByRole('tab', { name: 'Shortcuts', exact: true }).click()

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
