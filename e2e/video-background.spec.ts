import { expect, test } from '@playwright/test'
import { openTab, seedTemplateUser } from './helpers'

async function createWebm(page: import('@playwright/test').Page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160; canvas.height = 90
    const context = canvas.getContext('2d')!
    const stream = canvas.captureStream(10)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    const chunks: Blob[] = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve() })
    recorder.start(100)
    for (let frame = 0; frame < 8; frame++) {
      context.fillStyle = frame % 2 ? '#193c54' : '#80c9bd'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    recorder.stop()
    await stopped
    stream.getTracks().forEach(track => track.stop())
    const blob = new Blob(chunks, { type: 'video/webm' })
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return { name: 'ambient.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) }
}

async function prepareBanner(page: import('@playwright/test').Page) {
  await page.route('**/favicon.ico', route => route.abort())
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedTemplateUser(page, 'en')
  await page.goto('/')
  await expect(page.locator('.clock')).toBeVisible()
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'layout')
  await page.getByRole('combobox', { name: 'Layout', exact: true }).click()
  await page.getByRole('option', { name: 'Top banner', exact: true }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', 'banner')
}

test('Template B plays a local video after its poster is visible', async ({ page }) => {
  await prepareBanner(page)
  const file = await createWebm(page)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await page.getByLabel('Upload a video (MP4 or WebM, up to 30 MB)').setInputFiles(file)
  const video = page.locator('.wallpaper-video-element')
  await expect(video).toBeVisible()
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('loop', true)
  await expect(video).toHaveJSProperty('playsInline', true)
  await expect(video).toHaveAttribute('data-first-frame-ms', /\d+/)
  const firstFrameMs = Number(await video.getAttribute('data-first-frame-ms'))
  expect(firstFrameMs).toBeLessThan(3000)
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', 'banner')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.screenshot({ path: 'store/video-background.png', animations: 'disabled', style: '.undo-toast { visibility: hidden !important; }' })
  console.log(`Video wallpaper first frame: ${firstFrameMs} ms`)
})

test('reduced motion keeps the local video paused on its poster', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await prepareBanner(page)
  const file = await createWebm(page)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'background')
  await page.getByLabel('Upload a video (MP4 or WebM, up to 30 MB)').setInputFiles(file)
  const video = page.locator('.wallpaper-video-element')
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true)
  await expect(video).not.toHaveAttribute('src', /.+/)
})
