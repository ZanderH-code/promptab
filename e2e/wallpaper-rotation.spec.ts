import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { openTab, seedExistingUser } from './helpers'

async function imageFiles(page: Page) {
  const images = await page.evaluate(() => ['#e32b2b', '#2856e8', '#32d35d'].map(color => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 16
    const context = canvas.getContext('2d')!
    context.fillStyle = color
    context.fillRect(0, 0, 16, 16)
    return canvas.toDataURL('image/png').split(',')[1]
  }))
  return images.map((image, i) => ({ name: `${i}.png`, mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }))
}

async function currentImage(page: Page) {
  return page.locator('.wallpaper-image').evaluate(async element => {
    const url = getComputedStyle(element).backgroundImage.slice(5, -2)
    const blob = await fetch(url).then(response => response.blob())
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0, 1, 1)
    return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
  })
}

async function waitImage(page: Page) {
  await expect(page.locator('.wallpaper-image')).toHaveCount(1)
  await expect.poll(() => page.locator('.wallpaper-image').evaluate(element => getComputedStyle(element).backgroundImage)).toContain('blob:')
  return currentImage(page)
}

test('rotates local images on opening, hour and day and restores them from backup', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-01-15T12:00:00Z'))
  await seedExistingUser(page, { language: 'en' })
  await page.goto('/')
  const files = await imageFiles(page)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await page.getByLabel('Upload images (PNG, JPEG, WebP, up to 5 MB each)').setInputFiles(files)
  await expect(page.getByRole('radio', { name: 'Every new tab' })).toBeChecked()
  const first = await waitImage(page)
  await page.reload()
  const second = await waitImage(page)
  expect(second).not.toEqual(first)
  const another = await page.context().newPage()
  await another.goto('/')
  expect(await waitImage(another)).not.toEqual(second)
  await another.close()
  const parallel = await Promise.all([page.context().newPage(), page.context().newPage()])
  await Promise.all(parallel.map(tab => tab.goto('/')))
  const parallelImages = await Promise.all(parallel.map(waitImage))
  expect(new Set(parallelImages.map(image => image.join(','))).size).toBe(2)
  await Promise.all(parallel.map(tab => tab.close()))
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await page.getByRole('radio', { name: 'Every hour' }).click()
  await expect.poll(() => page.evaluate(() => Object.values(localStorage).some(value => value.includes('"interval":"hour"')))).toBe(true)
  const hour = await waitImage(page)
  await page.clock.setFixedTime(new Date('2026-01-15T13:00:00Z'))
  await page.reload()
  expect(await waitImage(page)).not.toEqual(hour)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await page.getByRole('radio', { name: 'Every day' }).click()
  await expect.poll(() => page.evaluate(() => Object.values(localStorage).some(value => value.includes('"interval":"day"')))).toBe(true)
  const day = await waitImage(page)
  await page.clock.setFixedTime(new Date('2026-01-16T13:00:00Z'))
  await page.reload()
  expect(await waitImage(page)).not.toEqual(day)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'data')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const backup = await readFile((await (await downloading).path())!)
  expect(JSON.parse(backup.toString()).assets.filter((item: { mime: string }) => item.mime === 'image/png')).toHaveLength(3)
  page.once('dialog', dialog => void dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('Import backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup })
  await reloaded
  await waitImage(page)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await expect(page.getByRole('radio', { name: 'Every day' })).toBeChecked()
})
