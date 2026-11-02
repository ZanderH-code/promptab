import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { siYoutube, siReddit, siGmail, siGithub, siGoogledrive, siGooglecalendar } from 'simple-icons'

const root = resolve('.')
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

// Start preview server
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4199', '--strictPort'], {
  cwd: root, stdio: 'ignore', shell: true,
})

await new Promise(r => setTimeout(r, 3500))

const browser = await chromium.launch()
const themesToCapture = [
  { id: 'warm-study', name: 'Warm Study', pack: 'warm-study', promptEn: 'An amber-lit study with literary type and warm paper tones', promptZh: '琥珀灯光下的书房，文字带有书卷气' },
  { id: 'cyber-grid', name: 'Cyber Grid', pack: 'cyber-grid', promptEn: 'Dark terminal-inspired page with cyan details and sharp monospace clock', promptZh: '深色终端风格页面，以青色荧光与利落等宽时钟为主' },
  { id: 'swiss-minimal', name: 'Swiss Minimal', pack: 'swiss-minimal', promptEn: 'Swiss graphic design: high-contrast layout, crisp borders and modern sans', promptZh: '瑞士平面设计风格：现代无衬线体、克制留白与利落线条' },
  { id: 'plum-night', name: 'Plum Night', pack: 'plum-night', promptEn: 'Quiet midnight desk: deep plum palette, soft glow on clock, and rounded cards', promptZh: '静谧梅紫夜色：深邃紫调、柔和时钟光晕与精致圆角' },
]

const captured = {}

for (const item of themesToCapture) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.clock.install({ time: new Date('2026-11-02T19:24:00Z') })
  await page.route('**/favicon.ico', route => route.abort())

  // Seed with realistic shortcuts
  await page.addInitScript(shortcuts => {
    localStorage.setItem('settings', JSON.stringify({
      schemaVersion: 1, language: 'zh-CN', theme: 'dark', accent: '#90d5cd', background: '#102932',
      showClock: true, showDate: true, showSearch: true, hour12: false,
      searchTemplate: 'https://www.google.com/search?q={query}',
      shortcuts, columns: 6, iconSize: 64, iconShape: 'circle', alignment: 'center', layout: 'stacked', reverse: false, overlay: 35,
    }))
  }, templateShortcuts)

  const packData = galleryPack(item.pack)
  await page.goto('http://127.0.0.1:4199/')
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

  const screenshotBuf = await page.screenshot({ fullPage: false })
  captured[item.id] = `data:image/png;base64,${screenshotBuf.toString('base64')}`
  console.log(`Captured ${item.name}`)
  await page.close()
}

const logoSvg = `data:image/svg+xml;base64,${readFileSync(resolve(root, 'docs/brand/logo.svg')).toString('base64')}`

// 1. Social Preview (1280x640)
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
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
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
    font-size: 42px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    margin-bottom: 12px;
  }
  h1 span {
    background: linear-gradient(135deg, #90d5cd 0%, #bbf0e9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .tagline-cn {
    font-size: 19px;
    color: #adc4cc;
    font-weight: 400;
    margin-bottom: 10px;
  }
  .description {
    font-size: 13.5px;
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
      <span class="brand-tag">v0.9.0</span>
    </div>
    <div class="headline-group">
      <h1>Your New Tab,<br><span>Designed by AI</span></h1>
      <p class="tagline-cn">一句话，让 AI 为你设计新标签页</p>
      <p class="description">Bring your own AI — ChatGPT, Claude, Kimi or DeepSeek. Free, local-first, zero tracking, and infinitely customizable.</p>
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

// 2. Showcase Grid (1280x800) featuring 4 original Promptab themes with their exact prompts
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 800px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #0a1317;
    color: #eeeae5;
    padding: 36px 40px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 18px;
  }
  .title-group h2 {
    font-size: 24px;
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
    margin-top: 4px;
  }
  .header-badge {
    font-size: 12px;
    color: #90d5cd;
    background: rgba(144, 213, 205, 0.12);
    border: 1px solid rgba(144, 213, 205, 0.3);
    padding: 5px 12px;
    border-radius: 999px;
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 24px;
    flex: 1;
  }
  .cell {
    border-radius: 14px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    background: #121c22;
    display: flex;
    flex-direction: column;
  }
  .cell-preview {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  .cell-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }
  .cell-footer {
    padding: 12px 16px;
    background: rgba(12, 22, 27, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cell-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cell-title {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cell-pill {
    font-size: 10.5px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    color: #90d5cd;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .cell-prompt {
    font-size: 11.5px;
    color: #92a8b0;
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
      <p>每一套外观都对应一句自然的 AI 提示词，即说即用，完全本地渲染。</p>
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
          <span class="cell-title">Warm Study · 书卷暖调</span>
          <span class="cell-pill">Cormorant Serif</span>
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
          <span class="cell-title">Cyber Grid · 极客终端</span>
          <span class="cell-pill">Mono Terminal</span>
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
          <span class="cell-title">Swiss Minimal · 瑞士极简</span>
          <span class="cell-pill">Outfit Sans</span>
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
          <span class="cell-title">Plum Night · 静谧梅紫</span>
          <span class="cell-pill">Soft Glow</span>
        </div>
        <div class="cell-prompt"><span class="prompt-quote">AI Prompt:</span> "${themesToCapture[3].promptEn}"</div>
      </div>
    </div>
  </div>
</body>
</html>`
  await page.setContent(html)
  await page.screenshot({ path: resolve(root, 'docs/assets/showcase-grid.png') })
  console.log('Saved docs/assets/showcase-grid.png')
  await page.close()
}

await browser.close()
preview.kill()
console.log('Done rendering original showcase!')
