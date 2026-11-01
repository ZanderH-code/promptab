import { test, expect, type Page } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const templates = [
  ['上下排列', '"overview" "bookmarks"'],
  ['左右分区', '"bookmarks overview"'],
  ['顶栏 + 网格', '"overview overview" "bookmarks bookmarks"'],
  ['仅网站', '"bookmarks"'],
  ['仅时钟/禅模式', '"overview"'],
  ['仪表盘三栏', '"clock date links" "search search links"'],
  ['左右分区 · 纯图标', '"bookmarks divider overview"'],
  ['顶栏横幅', '"banner" "websites"'],
] as const

async function chooseTemplate(page: Page, name: string) {
  await page.getByRole('combobox', { name: '布局方式', exact: true }).click()
  await page.getByRole('option', { name, exact: true }).click()
}

async function expectGrid(page: Page, areas: string) {
  await expect(page.locator('.mnt-layout')).toHaveCSS('grid-template-areas', areas)
}

test.beforeEach(async ({ page }) => {
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedExistingUser(page)
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'layout')
})

for (const [name, grid] of templates) {
  test(`applies and undoes the ${name} template`, async ({ page }) => {
    // Start from a different template so every selection creates an undo snapshot.
    const [initialName, initialGrid] = name === '上下排列' ? templates[1] : templates[0]
    if (name === '上下排列') await chooseTemplate(page, initialName)
    await expectGrid(page, initialGrid)
    await chooseTemplate(page, name)
    await expectGrid(page, grid)
    await page.getByRole('button', { name: '关闭设置' }).click()
    await page.locator('.undo-toast').getByRole('button', { name: '撤销' }).click()
    await expectGrid(page, initialGrid)
    await page.reload()
    await expectGrid(page, initialGrid)
  })
}

test('icon split and banner templates match their 1440 by 900 baselines', async ({ page }) => {
  await chooseTemplate(page, '左右分区 · 纯图标')
  await page.getByRole('button', { name: '关闭设置' }).click()
  await expect(page.locator('.mnt-layout')).toHaveScreenshot('layout-icon-split-1440x900.png')
  await page.locator('.settings-button').click()
  await openTab(page, 'layout')
  await chooseTemplate(page, '顶栏横幅')
  await page.getByRole('button', { name: '关闭设置' }).click()
  await expect(page.locator('.mnt-layout')).toHaveScreenshot('layout-banner-1440x900.png')
})

test('layout controls can refine icon split and banner templates', async ({ page }) => {
  const layout = page.locator('.mnt-layout')
  await chooseTemplate(page, '左右分区 · 纯图标')
  const baseAreas = page.getByRole('textbox', { name: '区域网格' })
  const baseColumns = page.getByRole('textbox', { name: '列规格' }).first()
  await baseAreas.fill('bookmarks divider overview')
  await expectGrid(page, '"bookmarks divider overview"')
  await baseColumns.fill('minmax(0, 1fr)\n1px\nminmax(280px, 0.7fr)')
  const bookmarksControls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: '快捷方式' }) }).first()
  await bookmarksControls.getByRole('combobox', { name: '组件区域' }).click()
  await page.getByRole('option', { name: '快捷方式', exact: true }).click()
  await openTab(page, 'shortcuts')
  await page.getByRole('combobox', { name: '网站样式' }).click()
  await page.getByRole('option', { name: '仅图标', exact: true }).click()
  await openTab(page, 'layout')
  await expect(layout.locator('[data-area="divider"]')).toHaveCSS('width', '1px')
  await expect(layout.locator('[data-area="bookmarks"] .grid')).toHaveCSS('grid-template-columns', '84px 84px 84px')

  await chooseTemplate(page, '顶栏横幅')
  const bannerControls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: 'banner' }) })
  await bannerControls.getByRole('spinbutton', { name: '区域模糊' }).fill('18')
  await bannerControls.getByRole('spinbutton', { name: '区域透明度' }).fill('68')
  await bannerControls.getByLabel('区域通栏').check()
  await bannerControls.getByRole('spinbutton', { name: '下边强调线' }).fill('1')
  const dateControls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: '显示日期' }) })
  await dateControls.getByRole('combobox', { name: '组件区域' }).click()
  await page.getByRole('option', { name: 'banner', exact: true }).click()
  await expect(layout.locator('[data-area="banner"]')).toHaveCSS('backdrop-filter', 'blur(18px)')
  await expect(layout.locator('[data-area="banner"]')).toHaveCSS('border-bottom-width', '1px')
})

test('stacked, split and dashboard arrangements respond to viewport width', async ({ page }) => {
  await expectGrid(page, '"overview" "bookmarks"')
  const stackedOverview = await page.locator('[data-area="overview"]').boundingBox()
  const stackedBookmarks = await page.locator('[data-area="bookmarks"]').boundingBox()
  expect(stackedOverview!.y).toBeLessThan(stackedBookmarks!.y)
  await chooseTemplate(page, '左右分区')
  await expectGrid(page, '"bookmarks overview"')
  const bookmarks = page.locator('[data-area="bookmarks"]')
  const overview = page.locator('[data-area="overview"]')
  expect((await bookmarks.boundingBox())!.x).toBeLessThan((await overview.boundingBox())!.x)
  await chooseTemplate(page, '仪表盘三栏')
  await expectGrid(page, '"clock date links" "search search links"')
  await page.setViewportSize({ width: 400, height: 800 })
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-breakpoint', 'narrow')
  await expectGrid(page, '"clock" "date" "search" "links"')
})

test('area controls update computed styles', async ({ page }) => {
  const controls = page.locator('.sd-note').filter({ has: page.locator('strong', { hasText: '概览' }) })
  const area = page.locator('.mnt-area[data-area="overview"]')
  await controls.getByRole('combobox', { name: '区域背景' }).click()
  await page.getByRole('option', { name: '强调色', exact: true }).click()
  for (const [label, value] of [['区域透明度', '50'], ['区域模糊', '8'], ['区域内边距', '24'], ['上边强调线', '3']] as const) {
    const input = controls.getByRole('spinbutton', { name: label })
    await input.fill(value)
    await input.press('Enter')
  }
  await controls.getByRole('combobox', { name: '区域对齐' }).click()
  await page.getByRole('option', { name: '左上', exact: true }).click()
  await expect(area).toHaveCSS('align-items', 'start')
  await expect(area).toHaveCSS('justify-items', 'start')
  await expect(area).toHaveCSS('padding', '24px')
  await expect(area).toHaveCSS('backdrop-filter', 'blur(8px)')
  await expect(area).toHaveCSS('border-top-width', '3px')
  await expect(area).toHaveCSS('border-top-style', 'solid')
  const background = await area.evaluate(el => getComputedStyle(el).backgroundColor)
  expect(background).toMatch(/(?:0\.5|50%)/)
  await controls.getByLabel('区域通栏').check()
  await expect(area).toHaveCSS('width', '1440px')
  const bounds = await area.boundingBox()
  expect(Math.abs(bounds!.x)).toBeLessThan(1)
})
