import { test, expect, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { openTab, seedExistingUser, templateBookmarks } from './helpers'

const galleryRoot = resolve('docs/gallery')
const gallery = JSON.parse(readFileSync(resolve(galleryRoot, 'index.json'), 'utf8')) as { packs: { id: string; file: string }[] }
const presets = readdirSync(resolve('src/presets')).filter(file => file.endsWith('.json')).map(file =>
  JSON.parse(readFileSync(resolve('src/presets', file), 'utf8')) as { id: string; name: { en: string } },
)
const viewports = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }]

async function checkLayout(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame) })
  await expect(page.locator('.mnt-widget-frame').first()).toBeVisible()
  const issues = await page.evaluate(() => {
    const issues: string[] = []
    const tolerance = 1
    const areas = Array.from(document.querySelectorAll<HTMLElement>('.mnt-area'))
    if (!areas.length) issues.push('No layout areas rendered')
    for (const area of areas) {
      const name = area.dataset.area
      const bounds = area.getBoundingClientRect()
      if (area.scrollWidth > area.clientWidth) {
        issues.push(`area ${name} horizontal overflow: ${area.scrollWidth} vs ${area.clientWidth}`)
      }
      for (const widget of area.querySelectorAll<HTMLElement>('.mnt-widget-frame, .mnt-clock > span, .mnt-date, .search, .mnt-group-title')) {
        const rect = widget.getBoundingClientRect()
        const outsideVertical = !widget.matches('.mnt-clock > span') && (rect.top < bounds.top - tolerance || rect.bottom > bounds.bottom + tolerance)
        if (rect.left < bounds.left - tolerance || rect.right > bounds.right + tolerance || outsideVertical) {
          issues.push(`widget ${widget.dataset.widgetId} outside area ${name}: ${JSON.stringify({ left: rect.left - bounds.left, right: rect.right - bounds.right, top: rect.top - bounds.top, bottom: rect.bottom - bounds.bottom })}`)
        }
      }
    }
    return issues
  })
  expect.soft(issues, `layout at ${page.viewportSize()?.width}x${page.viewportSize()?.height}`).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await seedExistingUser(page, { language: 'en', shortcuts: templateBookmarks.filter(item => item.id !== 'film'), iconSize: 64 })
  await page.clock.setFixedTime(new Date('2026-11-02T19:24:00Z'))
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
})

for (const item of gallery.packs) {
  test(`gallery ${item.id} layout at desktop sizes`, async ({ page }) => {
    await page.locator('.mnt-settings-entry').first().click()
    await openTab(page, 'ai')
    const pack = readFileSync(resolve(galleryRoot, item.file), 'utf8')
    const bookmarkLimits = Object.fromEntries((JSON.parse(pack) as { widgets: { id: string; type: string; props: { maxColumns?: number } }[] }).widgets
      .filter(widget => widget.type === 'bookmarks').map(widget => [widget.id, widget.props.maxColumns ?? 6]))
    await page.getByRole('textbox', { name: "The AI's reply" }).fill(`\`\`\`json\n${pack}\n\`\`\``)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const banner = page.locator('.mnt-banner[data-kind="preview"]')
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.evaluate(() => window.scrollTo(0, 0))
      await checkLayout(page)
      const edgeIssues = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.mnt-layout .mnt-widget-frame')].flatMap(element => {
        const rect = element.getBoundingClientRect()
        return rect.left < 15.5 || rect.right > innerWidth - 15.5
          ? [`${element.dataset.widget} is too close to the viewport edge: ${Math.round(rect.left)}..${Math.round(rect.right)}`] : []
      }))
      expect.soft(edgeIssues, `${item.id}: viewport margins at ${viewport.width}px`).toEqual([])
      const columnIssues = await page.evaluate(limits => [...document.querySelectorAll<HTMLElement>('.mnt-widget[data-widget="bookmarks"]')].flatMap(widget => {
        const limit = limits[widget.dataset.widgetId ?? '']
        if (!limit) return [`missing column limit for ${widget.dataset.widgetId}`]
        return [...widget.querySelectorAll<HTMLElement>('.grid')].flatMap(grid => {
          const rows = new Map<number, number>()
          for (const child of grid.querySelectorAll<HTMLElement>(':scope > .shortcut-wrap, :scope > .add-shortcut')) {
            const top = Math.round(child.getBoundingClientRect().top)
            rows.set(top, (rows.get(top) ?? 0) + 1)
          }
          return [...rows.values()].filter(count => count > limit).map(count => `${widget.dataset.widgetId}: ${count} columns exceeds ${limit}`)
        })
      }), bookmarkLimits)
      expect.soft(columnIssues, `${item.id}: bookmark columns at ${viewport.width}px`).toEqual([])
      if (viewport.width === 1280) {
        const issues = await page.evaluate(() => {
          const elements = [...document.querySelectorAll<HTMLElement>('.mnt-layout .mnt-widget-frame')]
          const problems = elements.flatMap(element => {
            const rect = element.getBoundingClientRect()
            return rect.top < -1 || rect.bottom > innerHeight + 1 || rect.left < -1 || rect.right > innerWidth + 1
              ? [`${element.dataset.widget} extends outside the first screen: ${Math.round(rect.top)}..${Math.round(rect.bottom)}`] : []
          })
          const clock = document.querySelector<HTMLElement>('.mnt-widget[data-widget="clock"]')?.getBoundingClientRect()
          const date = document.querySelector<HTMLElement>('.mnt-widget[data-widget="date"]')?.getBoundingClientRect()
          if (clock && date) {
            const dx = Math.max(0, clock.left - date.right, date.left - clock.right)
            const dy = Math.max(0, clock.top - date.bottom, date.top - clock.bottom)
            // Allow generous visual separation while keeping both elements in one perceived group.
            if (Math.hypot(dx, dy) > 160) problems.push(`clock and date are ${Math.round(Math.hypot(dx, dy))}px apart`)
          }
          return problems
        })
        expect.soft(issues, `${item.id}: first-screen layout`).toEqual([])
      }
    }
  })
}

for (const preset of presets) {
  test(`preset ${preset.id} layout at desktop sizes`, async ({ page }) => {
    await page.locator('.mnt-settings-entry').first().click()
    await openTab(page, 'appearance')
    const button = page.getByRole('button', { name: preset.name.en, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Close settings' }).click()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.evaluate(() => window.scrollTo(0, 0))
      await checkLayout(page)
    }
  })
}
