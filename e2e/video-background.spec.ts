import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
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
      context.fillStyle = '#f4c46a'
      context.beginPath()
      context.arc(25 + frame * 15, 45, 18, 0, Math.PI * 2)
      context.fill()
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
  await expect.poll(() => video.evaluate(element => getComputedStyle(element).opacity)).toBe('1')
  const colors = await video.evaluate(async element => {
    const player = element as HTMLVideoElement
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    const samples: number[][] = []
    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      context.drawImage(player, 0, 0, 1, 1)
      samples.push(Array.from(context.getImageData(0, 0, 1, 1).data))
    }
    return samples
  })
  expect(new Set(colors.map(color => color.slice(0, 3).join(','))).size).toBeGreaterThan(1)
  const firstFrameMs = Number(await video.getAttribute('data-first-frame-ms'))
  expect(firstFrameMs).toBeLessThan(3000)
  await expect(page.locator('.mnt-layout')).toHaveAttribute('data-layout-template', 'banner')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.screenshot({ path: 'store/video-background.png', animations: 'disabled', style: '.undo-toast { visibility: hidden !important; }' })
  console.log(`Video wallpaper first frame after upload: ${firstFrameMs} ms`)
  await page.addInitScript(() => {
    const times: Record<string, number> = {}
    ;(window as unknown as { wallpaperTimes: Record<string, number> }).wallpaperTimes = times
    const observe = () => {
      const app = document.querySelector('.app .clock')
      const poster = document.querySelector('.wallpaper-video-poster') as HTMLElement | null
      const player = document.querySelector('video.wallpaper-video-element') as HTMLVideoElement | null
      if (app && times.app === undefined) times.app = performance.now()
      if (poster && getComputedStyle(poster).opacity !== '0' && times.poster === undefined) times.poster = performance.now()
      if (player && player.dataset.firstFrameMs && times.video === undefined) times.video = performance.now()
      if (times.video === undefined) requestAnimationFrame(observe)
    }
    requestAnimationFrame(observe)
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.clearBrowserCache')
  await page.reload()
  await expect(video).toHaveAttribute('data-first-frame-ms', /\d+/)
  const times = await page.evaluate(() => (window as unknown as { wallpaperTimes: Record<string, number> }).wallpaperTimes)
  expect(times.app).toBeGreaterThan(0)
  expect(times.poster).toBeGreaterThan(0)
  expect(times.video).toBeGreaterThanOrEqual(times.poster)
  console.log(`Video cold-cache reload observations from navigation start: ${JSON.stringify(times)} ms`)
  // Headless Chromium does not hide the previous page when another tab is foregrounded.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true)
  await expect(page.locator('.wallpaper-video-poster')).toHaveCSS('opacity', '1')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false)
  await page.locator('.mnt-settings-entry').click()
  await openTab(page, 'data')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const download = await downloading
  const backup = await readFile((await download.path())!)
  const content = JSON.parse(backup.toString())
  expect(content.assets.some((item: { mime: string }) => item.mime === 'video/webm')).toBe(true)
  expect(content.assets.some((item: { mime: string }) => item.mime === 'image/jpeg')).toBe(true)
  page.once('dialog', dialog => void dialog.accept())
  const reloaded = page.waitForEvent('load')
  await page.getByLabel('Import backup', { exact: true }).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup })
  await reloaded
  await expect(video).toHaveAttribute('data-first-frame-ms', /\d+/)
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
