import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openTab, seedExistingUser, seedTemplateUser, templateBookmarks } from '../e2e/helpers'

const output = resolve(process.cwd(), 'store/screenshots')

test('generate five store screenshots', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-08-01T19:17:00Z') })
  await seedExistingUser(page, { language: 'en', theme: 'light', accent: '#3a5a80', shortcuts: templateBookmarks.slice(0, 3), columns: 2 })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await mkdir(output, { recursive: true })

  async function capture(name: string) {
    await page.mouse.move(0, 0)
    await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled', style: '.undo-toast { visibility: hidden !important }' })
  }
  async function settings() {
    await page.locator('.mnt-settings-entry').first().click()
    await expect(page.locator('.drawer')).toBeVisible()
  }
  async function template(name: string, id: string) {
    await settings()
    await openTab(page, 'layout')
    await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
    await page.getByRole('option', { name, exact: true }).click()
    await page.getByRole('button', { name: 'Close settings' }).click()
    await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', id)
  }

  await settings()
  await openTab(page, 'ai')
  await expect(page.locator('.sd-ai-request')).toBeVisible()
  await page.locator('.sd-ai-request').fill('A calm paper-inspired page with a warm terracotta accent.')
  await page.getByRole('textbox', { name: "The AI's reply" }).fill(JSON.stringify({ kind: 'mnt.theme-pack', packVersion: 2, theme: { mode: 'light', colorLight: { bg: '#f3ecdf', surface: '#faf5ea', text: '#2f2a24', accent: '#9a4a28' }, font: { display: 'cormorant', ui: 'system' }, radius: 6 } }, null, 2))
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.locator('.drawer').evaluate(element => { element.scrollTop = 0 })
  const splitView = await page.addStyleTag({ content: '.scrim { background: transparent !important; } .drawer { left: 0 !important; right: auto !important; width: 50vw !important; overflow: hidden !important; } .drawer .sd-ai { height: calc(100vh - 190px); overflow: auto; } .drawer .sd-ai-step[aria-labelledby="ai-step3"] { display: none !important; } .app { width: 50vw !important; margin-left: 50vw !important; overflow: hidden !important; } .desktop { width: calc(50vw - 48px) !important; } .app header { display: none !important; } .mnt-banners { left: 50vw !important; width: 50vw !important; }' })
  await capture('01-default')
  await splitView.evaluate(element => element.remove())
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  await template('Side split · icons only', 'icon-split')
  await capture('02-template-a')
  // Reset storage and reuse the existing locally generated wallpaper fixture for the banner.
  await page.evaluate(() => localStorage.clear())
  await seedTemplateUser(page, 'en', true)
  await page.reload()
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.wallpaper-image')).toBeVisible()
  await expect.poll(() => page.locator('.wallpaper-image').evaluate(el => el instanceof HTMLImageElement ? el.complete && el.naturalWidth > 0 : getComputedStyle(el).backgroundImage !== 'none')).toBe(true)
  await template('Top banner', 'banner')
  await capture('03-template-b')
  await settings()
  await openTab(page, 'appearance')
  await capture('04-settings')
  await openTab(page, 'ai')
  await expect(page.locator('.sd-ai-request')).toBeVisible()
  await capture('05-ai')
  expect(errors).toEqual([])
})
