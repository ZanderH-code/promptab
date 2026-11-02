import { chromium, expect } from '@playwright/test'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = process.cwd()
const output = resolve(root, 'docs/assets/demo.gif')
const videoDir = await mkdtemp(join(tmpdir(), 'promptab-demo-'))
const serverUrl = process.env.DEMO_SERVER_URL || 'http://127.0.0.1:4173'
let server
let browser

try {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) throw new Error('ffmpeg is required on PATH to create the demo GIF')
  if (!process.env.DEMO_SERVER_URL) {
    server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' })
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error('Preview server stopped before it became ready')
      try { if ((await fetch(serverUrl)).ok) { ready = true; break } } catch { /* Wait for Vite. */ }
      await delay(100)
    }
    if (!ready) throw new Error('Preview server did not become ready')
  }
  const pack = await readFile(resolve(root, 'docs/ai/examples/paper-colors-only.json'), 'utf8')
  browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', timezoneId: 'UTC', recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } } })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // A fresh profile defaults to Chinese, so select English before recording the untouched onboarding.
  const setup = await context.newPage()
  await setup.goto(serverUrl, { waitUntil: 'networkidle' })
  await setup.getByRole('button', { name: '打开设置' }).click()
  await setup.getByRole('tab', { name: '关于', exact: true }).click()
  await setup.getByRole('combobox', { name: '语言', exact: true }).click()
  await setup.getByRole('option', { name: 'English', exact: true }).click()
  await expect(setup.locator('html')).toHaveAttribute('lang', 'en')
  await setup.getByRole('button', { name: 'Close settings' }).click()
  const websites = [
    ['GitHub', 'https://github.com'], ['YouTube', 'https://youtube.com'],
    ['Gmail', 'https://mail.google.com'], ['Notion', 'https://notion.so'], ['Figma', 'https://figma.com'],
  ]
  for (const [name, url] of websites) {
    if (name === 'GitHub') await setup.getByRole('button', { name: 'Add first website' }).click()
    else await setup.locator('.add-shortcut').click()
    await setup.getByLabel('URL', { exact: true }).fill(url)
    await setup.getByLabel('Name', { exact: true }).fill(name)
    await setup.locator('.icon-choice').filter({ hasText: 'Brand' }).click()
    await setup.getByLabel('Search brands').fill(name)
    await setup.locator('.icon-picker-results').getByRole('button', { name, exact: true }).click()
    await setup.getByRole('button', { name: 'Save website', exact: true }).click()
    await expect(setup.locator('.shortcut').filter({ hasText: name })).toBeVisible()
  }
  await setup.close()
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date('2026-08-01T10:24:00Z'))
  await page.goto(serverUrl, { waitUntil: 'networkidle' })
  await expect(page.locator('.shortcut')).toHaveCount(websites.length)
  await delay(2000)
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.getByRole('tab', { name: 'AI', exact: true }).click()
  await expect(page.locator('.sd-ai')).toBeVisible()
  await delay(1300)
  const request = page.getByLabel('What kind of home page do you want (optional)')
  await request.click()
  await request.pressSequentially('A calm paper-like homepage', { delay: 55 })
  await delay(700)
  await page.getByRole('button', { name: 'Copy prompt pack' }).click()
  await expect(page.locator('.sd-ai-notice')).not.toBeEmpty()
  await delay(1600)
  const reply = page.getByRole('textbox', { name: "The AI's reply" })
  await reply.scrollIntoViewIfNeeded()
  await reply.click()
  await page.evaluate(text => navigator.clipboard.writeText(text), 'Here is your paper-like theme.\n\n```json\n' + pack.trim() + '\n```')
  await page.keyboard.press('Control+V')
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await delay(1800)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await delay(1600)
  await banner.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(banner).toHaveCount(0)
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('.drawer.sd')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await delay(4000)
  const video = page.video()
  await context.close()
  const videoPath = await video.path()
  await mkdir(resolve(root, 'docs/assets'), { recursive: true })
  const result = spawnSync('ffmpeg', ['-y', '-i', videoPath, '-filter_complex', '[0:v]fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle', '-loop', '0', output], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`ffmpeg failed (${result.status})`)
  const bytes = (await stat(output)).size
  console.log(`Demo GIF: ${output} (${bytes} bytes)`)
  if (bytes > 4_000_000) throw new Error('Demo GIF exceeds the 4 MB target')
} finally {
  if (browser) await browser.close()
  if (server) server.kill()
  await rm(videoDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }).catch(error => console.warn('Could not remove temporary video:', error.message))
}
