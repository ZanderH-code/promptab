import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const logo = await readFile(resolve(root, 'docs/brand/logo.svg'), 'utf8')
// Keep small toolbar icons legible by removing the window controls and enlarging the color swatches.
const smallLogo = logo.replace(/\s*<circle cx="(?:352|388)" cy="164" r="11" fill="#5e9a97"\/>/g, '').replace(/r="52"/g, 'r="58"')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  await mkdir(resolve(root, 'public/icons'), { recursive: true })
  await mkdir(resolve(root, 'store'), { recursive: true })
  const images = []
  for (const size of [16, 32, 48, 128, 300]) {
    const svg = size <= 32 ? smallLogo : logo
    await page.setContent(`<style>html,body{margin:0} svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
    const path = size === 300 ? resolve(root, 'store/logo-300.png') : resolve(root, `public/icons/icon${size}.png`)
    await page.locator('svg').screenshot({ path, omitBackground: true })
    images.push({ size, data: (await readFile(path)).toString('base64') })
  }
  for (const { size, file, scale } of [
    { size: 192, file: 'pwa-192.png', scale: 1 },
    { size: 512, file: 'pwa-512.png', scale: 1 },
    { size: 512, file: 'pwa-maskable-512.png', scale: .7 },
    { size: 180, file: 'apple-touch-icon-180.png', scale: 1 },
  ]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%}.pwa{width:${size}px;height:${size}px;display:grid;place-items:center;overflow:hidden;background:#102932}.pwa svg{display:block;width:${size * scale}px;height:${size * scale}px}</style><div class="pwa">${logo}</div>`)
    await page.locator('.pwa').screenshot({ path: resolve(root, 'public/icons', file) })
  }
  await page.setViewportSize({ width: 780, height: 390 })
  await page.setContent(`<style>body{margin:0;padding:24px;font:16px system-ui;background:#f1f2f1;color:#102932} .icons{display:flex;align-items:end;gap:24px;height:310px} figure{margin:0;text-align:center} img{display:block;margin:auto} figcaption{margin-top:12px}</style><div class="icons">${images.map(({ size, data }) => `<figure><img width="${size}" height="${size}" src="data:image/png;base64,${data}"><figcaption>${size} × ${size}</figcaption></figure>`).join('')}</div>`)
  await page.screenshot({ path: resolve(root, 'store/icon-preview.png') })
} finally {
  await browser.close()
}
console.log('Rendered extension icons and store logo with Chromium')
