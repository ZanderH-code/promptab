import { test, expect, type Page } from '@playwright/test'
import { openTab } from './helpers'

const templates = [
  ['上下排列', '"overview" "bookmarks"'],
  ['左右分区', '"bookmarks overview"'],
  ['顶栏 + 网格', '"overview overview" "bookmarks bookmarks"'],
  ['仅网站', '"bookmarks"'],
  ['仅时钟/禅模式', '"overview"'],
  ['仪表盘三栏', '"clock date links" "search search links"'],
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
