import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'
import { readFile } from 'node:fs/promises'

test('BYOK reply enters the existing safety review without applying', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'chrome', { configurable: true, value: { permissions: { request: async () => true } } })
  })
  let calls = 0
  await page.route('https://api.openai.com/**', async route => {
    calls++
    expect(route.request().postData()).not.toContain('secret-example-key')
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '```json\n{"kind":"mnt.theme-pack","css":"@import url(https://example.com/x.css);"}\n```' } }] }) })
  })
  await page.goto('/')
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  expect(calls).toBe(0)
  await page.locator('#byok-provider').selectOption('openai')
  await page.locator('#byok-model').fill('test-model')
  await page.locator('#byok-key').fill('secret-example-key')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.locator('.sd-ai-group[data-kind="problem"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toHaveCount(0)
  expect(calls).toBe(1)
  const stored = await page.evaluate(() => JSON.stringify(localStorage))
  expect(stored).not.toContain('secret-example-key')
  await openTab(page, 'data')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const backup = await readFile((await (await download).path())!, 'utf8')
  expect(backup).not.toContain('secret-example-key')
})
