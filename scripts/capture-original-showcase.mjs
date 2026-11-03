import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { siYoutube, siReddit, siGmail, siGithub, siGoogledrive, siGooglecalendar } from 'simple-icons'

const root = resolve('.')
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
const galleryPack = name => JSON.parse(readFileSync(resolve(root, `docs/gallery/packs/${name}.json`), 'utf8'))

const templateShortcuts = [
  { id: 'youtube', name: 'YouTube', url: 'https://youtube.com', color: '#ff0000', icon: 'Y', iconMode: 'brand', iconName: 'youtube', brand: { slug: siYoutube.slug, title: siYoutube.title, path: siYoutube.path, hex: siYoutube.hex } },
  { id: 'reddit', name: 'Reddit', url: 'https://reddit.com', color: '#ff4500', icon: 'R', iconMode: 'brand', iconName: 'reddit', brand: { slug: siReddit.slug, title: siReddit.title, path: siReddit.path, hex: siReddit.hex } },
  { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', color: '#ea4335', icon: 'G', iconMode: 'brand', iconName: 'gmail', brand: { slug: siGmail.slug, title: siGmail.title, path: siGmail.path, hex: siGmail.hex } },
  { id: 'github', name: 'GitHub', url: 'https://github.com', color: '#181717', icon: 'G', iconMode: 'brand', iconName: 'github', brand: { slug: siGithub.slug, title: siGithub.title, path: siGithub.path, hex: siGithub.hex } },
  { id: 'drive', name: 'Google Drive', url: 'https://drive.google.com', color: '#4285f4', icon: 'D', iconMode: 'brand', iconName: 'googledrive', brand: { slug: siGoogledrive.slug, title: siGoogledrive.title, path: siGoogledrive.path, hex: siGoogledrive.hex } },
  { id: 'code', name: 'Code', url: 'https://example.com/code', color: '#3a5a80', icon: 'C', iconMode: 'lucide', iconName: 'code' },
  { id: 'calendar', name: 'Calendar', url: 'https://calendar.google.com', color: '#4285f4', icon: 'C', iconMode: 'brand', iconName: 'googlecalendar', brand: { slug: siGooglecalendar.slug, title: siGooglecalendar.title, path: siGooglecalendar.path, hex: siGooglecalendar.hex } },
]

// Start a fresh preview server and wait until it is ready.
const previewPort = 4299
const previewUrl = `http://127.0.0.1:${previewPort}/`
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
  cwd: root, stdio: 'ignore', shell: true,
})

let previewReady = false
for (let attempt = 0; attempt < 60; attempt++) {
  if (preview.exitCode !== null) throw new Error(`Preview server exited with code ${preview.exitCode}`)
  try {
    if ((await fetch(previewUrl)).ok) {
      previewReady = true
      break
    }
  } catch {}
  await new Promise(r => setTimeout(r, 250))
}
if (!previewReady) {
  preview.kill()
  throw new Error(`Preview server did not become ready at ${previewUrl}`)
}

const browser = await chromium.launch()
const themesToCapture = [
  { id: 'warm-study', name: 'Warm Study', badge: 'Cormorant Serif · Amber Paper', pack: 'warm-study', promptEn: 'An amber-lit study with literary type, warm paper tones, and minimal links' },
  { id: 'cyber-grid', name: 'Cyber Grid', badge: 'Mono Terminal · Cyan Glow', pack: 'cyber-grid', promptEn: 'Dark terminal-inspired page with cyan details, sharp clock, and compact shortcuts' },
  { id: 'swiss-minimal', name: 'Swiss Minimal', badge: 'Modern Sans · Crisp Alignment', pack: 'swiss-minimal', promptEn: 'Swiss graphic design: high-contrast layout, crisp borders and modern sans' },
  { id: 'plum-night', name: 'Plum Night', badge: 'Soft Glow · Deep Purple', pack: 'plum-night', promptEn: 'Quiet midnight desk: deep plum palette, soft glow on clock, and rounded cards' },
]

const captured = {}

for (const item of themesToCapture) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  await page.clock.install({ time: new Date('2026-11-02T19:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())

  // Seed with realistic shortcuts in English
  await page.addInitScript(shortcuts => {
    localStorage.setItem('settings', JSON.stringify({
      schemaVersion: 1, language: 'en', theme: 'dark', accent: '#90d5cd', background: '#102932',
      showClock: true, showDate: true, showSearch: true, hour12: false,
      searchTemplate: 'https://www.google.com/search?q={query}',
      shortcuts, columns: 6, iconSize: 64, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35,
    }))
  }, templateShortcuts)

  const packData = galleryPack(item.pack)
  await page.goto(previewUrl)
  await page.locator('.clock').waitFor()

  // Apply theme pack via AI paste
  await page.locator('.mnt-settings-entry').first().click()
  await page.getByRole('tab', { name: /AI/i }).click()
  const replyBox = page.getByRole('textbox', { name: /AI.*reply|AI.*回复/i })
  await replyBox.fill('```json\n' + JSON.stringify(packData) + '\n```')

  const previewBtn = page.getByRole('button', { name: /Preview|预览/i }).first()
  await previewBtn.click()

  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await banner.waitFor()
  await banner.getByRole('button', { name: /Apply|应用/i }).click()

  const closeBtn = page.getByRole('button', { name: /Close settings|关闭设置/i })
  if (await closeBtn.isVisible()) await closeBtn.click()

  await page.waitForTimeout(500)
  await page.addStyleTag({ content: '.undo-toast { display: none !important; }' })

  // Save individual full-resolution screenshots in English
  const screenshotBuf = await page.screenshot({ fullPage: false })
  writeFileSync(resolve(root, `docs/assets/theme-${item.id}.png`), screenshotBuf)
  captured[item.id] = `data:image/png;base64,${screenshotBuf.toString('base64')}`
  console.log(`Saved individual screenshot: docs/assets/theme-${item.id}.png`)
  await page.close()
}

const logoSvg = `data:image/svg+xml;base64,${readFileSync(resolve(root, 'docs/brand/logo.svg')).toString('base64')}`

// 1. Social Preview (1280x640) - English First
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } })
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 640px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at 75% 25%, #183842 0%, #0d2127 50%, #061216 100%);
    color: #eeeae5;
    position: relative;
    overflow: hidden;
    display: flex;
  }
  .bg-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(to right, rgba(144, 213, 205, 0.06) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(144, 213, 205, 0.06) 1px, transparent 1px);
    background-size: 36px 36px;
    mask-image: radial-gradient(circle at 65% 50%, black 45%, transparent 85%);
  }
  .left {
    width: 530px;
    padding: 64px 0 64px 72px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 2;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-name {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #fff;
  }
  .brand-tag {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #90d5cd;
    background: rgba(144, 213, 205, 0.12);
    border: 1px solid rgba(144, 213, 205, 0.3);
    padding: 3px 9px;
    border-radius: 999px;
    font-weight: 600;
  }
  h1 {
    font-size: 44px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    margin-bottom: 14px;
  }
  h1 span {
    background: linear-gradient(135deg, #90d5cd 0%, #bbf0e9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .tagline {
    font-size: 20px;
    color: #adc4cc;
    font-weight: 500;
    margin-bottom: 10px;
  }
  .description {
    font-size: 14px;
    color: #819ea8;
    line-height: 1.6;
    max-width: 440px;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    color: #d2dee3;
    font-weight: 500;
  }
  .badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #90d5cd;
  }
  .right {
    flex: 1;
    position: relative;
    z-index: 1;
  }
  .card {
    position: absolute;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.12);
    background: #142026;
  }
  .card img { display: block; width: 100%; height: auto; }
  .card-back {
    top: 50px;
    right: -30px;
    width: 680px;
    transform: rotate(2.5deg);
    opacity: 0.92;
  }
  .card-front {
    top: 155px;
    left: 20px;
    width: 670px;
    transform: rotate(-3deg);
    border-color: rgba(144, 213, 205, 0.4);
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(144, 213, 205, 0.4);
  }
  .prompt-bubble {
    position: absolute;
    bottom: 34px;
    right: 44px;
    background: rgba(13, 33, 39, 0.94);
    border: 1px solid rgba(144, 213, 205, 0.45);
    backdrop-filter: blur(14px);
    border-radius: 14px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    z-index: 5;
    max-width: 520px;
  }
  .prompt-sparkle { color: #90d5cd; font-size: 18px; flex: none; }
  .prompt-text {
    font-size: 13px;
    color: #e5f3f2;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    line-height: 1.4;
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="left">
    <div class="brand-row">
      <img src="${logoSvg}" width="42" height="42" alt="Promptab Logo">
      <span class="brand-name">PROMPTAB</span>
      <span class="brand-tag">v${version}</span>
    </div>
    <div class="headline-group">
      <h1>Your New Tab,<br><span>Designed by AI</span></h1>
      <p class="tagline">Describe it. Paste it. Done.</p>
      <p class="description">Bring any AI you already use — ChatGPT, Claude, Kimi or DeepSeek. Free, local-first, zero tracking, and infinitely customizable.</p>
    </div>
    <div class="badges">
      <div class="badge"><span class="badge-dot"></span> Bring Your Own AI</div>
      <div class="badge"><span class="badge-dot"></span> 12+ Curated Themes</div>
      <div class="badge"><span class="badge-dot"></span> Local-First & MIT</div>
      <div class="badge"><span class="badge-dot"></span> Ambient Video & CSS</div>
    </div>
  </div>
  <div class="right">
    <div class="card card-back">
      <img src="${captured['cyber-grid']}" alt="Cyber Grid Theme">
    </div>
    <div class="card card-front">
      <img src="${captured['warm-study']}" alt="Warm Study Theme">
    </div>
    <div class="prompt-bubble">
      <span class="prompt-sparkle">✦</span>
      <span class="prompt-text">AI Prompt: "An amber-lit study with literary type, warm paper tones, and minimal links"</span>
    </div>
  </div>
</body>
</html>`
  await page.setContent(html)
  await page.screenshot({ path: resolve(root, 'docs/assets/social-preview.png') })
  console.log('Saved docs/assets/social-preview.png')
  await page.close()
}

// 2. Showcase Grid (1280x1180) - English First, Perfectly Proportioned, Zero Truncation
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1180 } })
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 1180px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #091216;
    color: #eeeae5;
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 26px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 18px;
  }
  .title-group h2 {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .title-group h2 span { color: #90d5cd; }
  .title-group p {
    font-size: 14px;
    color: #8da4ad;
    margin-top: 6px;
  }
  .header-badge {
    font-size: 12px;
    color: #90d5cd;
    background: rgba(144, 213, 205, 0.12);
    border: 1px solid rgba(144, 213, 205, 0.3);
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 26px;
  }
  .cell {
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    background: #121c22;
    display: flex;
    flex-direction: column;
  }
  .cell-preview {
    width: 100%;
    height: 366px;
    overflow: hidden;
    position: relative;
    background: #000;
  }
  .cell-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }
  .cell-footer {
    padding: 16px 20px;
    background: #0d161b;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cell-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cell-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cell-pill {
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    color: #90d5cd;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .cell-prompt {
    font-size: 12.5px;
    color: #96adb5;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .prompt-quote { color: #90d5cd; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h2><span>✦</span> PROMPTAB ORIGINAL SHOWCASE</h2>
      <p>Every layout corresponds to a natural-language AI prompt, rendered 100% locally in your browser.</p>
    </div>
    <div class="header-badge">AI-NATIVE THEMES</div>
  </div>
  <div class="grid">
    <div class="cell">
      <div class="cell-preview">
        <img src="${captured['warm-study']}" alt="Warm Study">
      </div>
      <div class="cell-footer">
        <div class="cell-meta">
          <span class="cell-title">Warm Study</span>
          <span class="cell-pill">Cormorant Serif · Amber Paper</span>
        </div>
        <div class="cell-prompt"><span class="prompt-quote">AI Prompt:</span> "${themesToCapture[0].promptEn}"</div>
      </div>
    </div>
    <div class="cell">
      <div class="cell-preview">
        <img src="${captured['cyber-grid']}" alt="Cyber Grid">
      </div>
      <div class="cell-footer">
        <div class="cell-meta">
          <span class="cell-title">Cyber Grid</span>
          <span class="cell-pill">Mono Terminal · Cyan Glow</span>
        </div>
        <div class="cell-prompt"><span class="prompt-quote">AI Prompt:</span> "${themesToCapture[1].promptEn}"</div>
      </div>
    </div>
    <div class="cell">
      <div class="cell-preview">
        <img src="${captured['swiss-minimal']}" alt="Swiss Minimal">
      </div>
      <div class="cell-footer">
        <div class="cell-meta">
          <span class="cell-title">Swiss Minimal</span>
          <span class="cell-pill">Modern Sans · Crisp Alignment</span>
        </div>
        <div class="cell-prompt"><span class="prompt-quote">AI Prompt:</span> "${themesToCapture[2].promptEn}"</div>
      </div>
    </div>
    <div class="cell">
      <div class="cell-preview">
        <img src="${captured['plum-night']}" alt="Plum Night">
      </div>
      <div class="cell-footer">
        <div class="cell-meta">
          <span class="cell-title">Plum Night</span>
          <span class="cell-pill">Soft Glow · Deep Purple</span>
        </div>
        <div class="cell-prompt"><span class="prompt-quote">AI Prompt:</span> "${themesToCapture[3].promptEn}"</div>
      </div>
    </div>
  </div>
</body>
</html>`
  await page.setContent(html)
  await page.screenshot({ path: resolve(root, 'docs/assets/showcase-grid.png') })
  console.log('Saved uncropped docs/assets/showcase-grid.png')
  await page.close()
}

await browser.close()
preview.kill()
console.log('All promotional assets generated successfully!')
