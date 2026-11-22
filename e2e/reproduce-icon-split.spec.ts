import { expect, test } from '@playwright/test'
import { openTab } from './helpers'

const sites = [
  { name: 'YouTube', url: 'https://youtube.com', brand: 'YouTube' },
  { name: 'Reddit', url: 'https://reddit.com', brand: 'Reddit' },
  { name: 'Gmail', url: 'https://mail.google.com', brand: 'Gmail' },
  { name: 'GitHub', url: 'https://github.com', brand: 'GitHub' },
  { name: 'Google Drive', url: 'https://drive.google.com', brand: 'Google Drive' },
  { name: 'Film', url: 'https://example.com/film', icon: 'video' },
  { name: 'Code', url: 'https://example.com/code', icon: 'code' },
  { name: 'Google Calendar', url: 'https://calendar.google.com', brand: 'Google Calendar' },
] as const

test('a fresh install can reproduce the icon-split template through the UI', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', timezoneId: 'UTC' })
  const page = await context.newPage()
  try {
    await page.goto('http://127.0.0.1:4173/')
    await expect(page.locator('.onboarding-card')).toBeVisible()
    await page.locator('.mnt-header .mnt-settings-entry').click()
    await openTab(page, 'data')
    await page.getByRole('button', { name: '移除初始网站', exact: true }).click()
    await expect(page.locator('.shortcut')).toHaveCount(0)
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()

    for (const [index, site] of sites.entries()) {
      if (index === 0) await page.getByRole('button', { name: '添加第一个网站', exact: true }).click()
      else await page.locator('.add-shortcut').first().click()
      const editor = page.locator('.shortcut-editor')
      await editor.getByLabel('网址').fill(site.url)
      await editor.getByLabel('名称', { exact: true }).fill(site.name)
      if ('brand' in site) {
        await editor.getByRole('button', { name: /品牌图标/ }).click()
        const search = editor.getByLabel('搜索品牌')
        await search.fill(site.brand)
        await editor.getByRole('button', { name: site.brand, exact: true }).click()
      } else {
        await editor.getByRole('button', { name: /通用图标/ }).click()
        await editor.getByRole('button', { name: site.icon, exact: true }).click()
      }
      await editor.getByRole('button', { name: '保存网站', exact: true }).click()
      await expect(page.locator('.shortcut')).toHaveCount(index + 1)
    }

    await page.locator('.mnt-header .mnt-settings-entry').click()
    await openTab(page, 'layout')
    await page.getByRole('combobox', { name: '布局方式', exact: true }).click()
    await page.getByRole('option', { name: '左右分区 · 纯图标', exact: true }).click()
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
    await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', 'icon-split')

    const links = page.locator('.mnt-bookmark-icon-only .shortcut')
    await expect(links).toHaveCount(8)
    await expect(page.locator('.mnt-header')).toHaveCount(0)
    await expect(page.locator('.mnt-widget-toolbar .mnt-settings-entry')).toBeVisible()
    await expect(page.locator('.add-shortcut')).toHaveCount(0)
    await expect(page.locator('[data-area="bookmarks"] .grid')).toHaveCSS('grid-template-columns', '84px 84px 84px')
    const accent = await page.locator('.mnt-root').evaluate(element => getComputedStyle(element).getPropertyValue('--mnt-accent').trim())
    for (const path of await links.locator('svg path').all()) {
      await expect(path).toHaveAttribute('d', /.+/)
      await expect.poll(() => path.evaluate(element => getComputedStyle(element).color)).toBe(accent.startsWith('#') ? `rgb(${parseInt(accent.slice(1, 3), 16)}, ${parseInt(accent.slice(3, 5), 16)}, ${parseInt(accent.slice(5, 7), 16)})` : accent)
    }
    await expect(links.locator('svg path:first-child')).toHaveCount(8)

    const toolbar = page.locator('.mnt-widget-toolbar')
    await expect(toolbar.locator('button')).toHaveCount(3)

    await toolbar.locator('.mnt-settings-entry').click()
    await openTab(page, 'shortcuts')
    await expect(page.getByRole('checkbox', { name: '所有图标使用强调色' })).toBeChecked()
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()

    // Pixel baselines for icon-split live in e2e/m3-layout.spec.ts; here verify the interactive hover strip.
    const target = links.nth(3)
    const bounds = await target.boundingBox()
    expect(bounds).not.toBeNull()
    await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
    await expect.poll(() => target.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('1')
    await expect.poll(() => target.evaluate(element => getComputedStyle(element, '::after').content)).toContain('github.com')
  } finally {
    await context.close()
  }
})
