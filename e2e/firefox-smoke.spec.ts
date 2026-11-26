import { expect, test } from '@playwright/test'
import { openTab, seedExistingUser } from './helpers'

const pack = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Firefox smoke theme' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
}

test('Firefox build opens, settings work and AI replies preview', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'browser', {
      configurable: true,
      value: { permissions: { request: async () => true } },
    })
  })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.mnt-settings-entry')).toBeVisible()
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'ai')
  await page.getByRole('textbox', { name: "The AI's reply" }).fill(`\`\`\`json\n${JSON.stringify(pack)}\n\`\`\``)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await page.locator('.sd-ai .sd-button', { hasText: /^(Preview|预览)$/ }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Firefox smoke theme')
  await expect(page.locator('.undo-toast')).toHaveCount(0)
})

test('backup files can be dropped and backup JSON pasted in Firefox', async ({ page }) => {
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'data')
  // The backup section is a lazy chunk; dispatching before it renders finds nothing.
  await expect(page.locator('.backup-section .backup-drop')).toBeVisible()
  const profile = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem('profiles:v2:generation:' + index.generation)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  })
  const backup = JSON.stringify({ kind: 'mnt.backup', backupVersion: 2, exportedAt: '2026-10-31T10:24:00Z', activeProfileId: profile.meta.id, profiles: [profile], assets: [] })
  await page.evaluate(body => {
    const section = document.querySelector('.backup-section')!
    const data = new DataTransfer()
    data.items.add(new File([body], 'backup.json', { type: 'application/json' }))
    for (const type of ['dragenter', 'dragover', 'drop']) section.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }))
  }, backup)
  await expect(page.getByLabel('Add after current websites', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  // Gecko ignores ClipboardEventInit.clipboardData, so attach the payload the way a real paste handler receives it.
  await page.evaluate(body => {
    const zone = document.querySelector('.backup-drop')!
    const data = new DataTransfer()
    data.setData('text/plain', body)
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: data })
    zone.dispatchEvent(event)
  }, backup)
  await expect(page.getByLabel('Replace current websites', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})
