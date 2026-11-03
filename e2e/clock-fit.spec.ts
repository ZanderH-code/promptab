import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openTab, seedExistingUser } from './helpers'

test('seconds clock keeps its resize observer across ticks', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.ResizeObserver
    let count = 0
    Object.defineProperty(window, '__clockObservers', { get: () => count })
    window.ResizeObserver = class extends Native {
      observe(target: Element, options?: ResizeObserverOptions) {
        if (target.classList.contains('mnt-clock')) count++
        super.observe(target, options)
      }
    }
  })
  await page.clock.install({ time: new Date('2026-11-02T19:24:00Z') })
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'ai')
  const pack = JSON.parse(readFileSync('docs/gallery/packs/nocturne-signal.json', 'utf8'))
  pack.widgets.find((widget: { type: string }) => widget.type === 'clock').props.seconds = true
  await page.getByRole('textbox', { name: "The AI's reply" }).fill(`\`\`\`json\n${JSON.stringify(pack)}\n\`\`\``)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await banner.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  const text = page.locator('.mnt-clock')
  await expect(text).toHaveText(/\d{2}:\d{2}:\d{2}/)
  const initial = await text.textContent()
  const before = await page.evaluate(() => (window as unknown as { __clockObservers: number }).__clockObservers)
  await page.clock.fastForward(3000)
  await expect(text).not.toHaveText(initial!)
  expect(await page.evaluate(() => (window as unknown as { __clockObservers: number }).__clockObservers)).toBe(before)
})
