import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { openTab, seedExistingUser } from './helpers'

const GOOD_PACK = {
  kind: 'mnt.theme-pack',
  meta: { name: 'Web Preview' },
  theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } },
  css: '.mnt-clock { letter-spacing: 0.1em; }',
}
const reply = `\n\`\`\`json\n${JSON.stringify(GOOD_PACK, null, 2)}\n\`\`\``
const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim().toLowerCase())

async function openApp(page: Page, settings: Record<string, unknown> = {}) {
  await seedExistingUser(page, { language: 'en', ...settings })
  await page.goto('./')
  await expect(page.locator('.mnt-settings-entry').first()).toBeVisible()
}

test('fresh web visitors start in English while saved language is respected', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('New Tab')
})

test('saved Chinese language updates the web document title and language', async ({ page }) => {
  await openApp(page, { language: 'zh-CN' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page).toHaveTitle('新标签页')
})

test('web first screen has no chrome errors and stays under 500 KB', async ({ page }) => {
  const chromeErrors: string[] = []
  const scripts: Promise<number>[] = []
  page.on('console', message => { if (message.type() === 'error' && /chrome/i.test(message.text())) chromeErrors.push(message.text()) })
  page.on('pageerror', error => { if (/chrome/i.test(error.message)) chromeErrors.push(error.message) })
  page.on('response', response => {
    if (new URL(response.url()).pathname.endsWith('.js')) scripts.push(response.body().then(body => body.byteLength))
  })
  await openApp(page, { shortcuts: [] })
  await expect(page.locator('.clock')).toBeVisible()
  await expect(page.locator('.onboarding-card')).toContainText('Web data is separate')
  await page.waitForLoadState('networkidle')
  expect(chromeErrors).toEqual([])
  const total = (await Promise.all(scripts)).reduce((sum, bytes) => sum + bytes, 0)
  console.log(`web startup JavaScript: ${total} bytes`)
  expect(total).toBeGreaterThan(0)
  expect(total).toBeLessThanOrEqual(500_000)
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon-180\.png/)
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Promptab')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'default')
  const manifest = await page.locator('link[rel="manifest"]').evaluate(async link => fetch((link as HTMLLinkElement).href).then(response => response.json()))
  expect(manifest.description).toBe('A customizable new tab with AI-assisted themes, shortcuts, widgets, optional weather, and browser sync.')
  expect(manifest.icons.slice(0, 3).map((icon: { src: string }) => icon.src)).toEqual(['icons/pwa-192.png', 'icons/pwa-512.png', 'icons/pwa-maskable-512.png'])
  expect(manifest.icons.slice(3).every((icon: { sizes: string }) => icon.sizes === 'any')).toBe(true)
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("font-src 'self' data: blob:")
  expect(csp).toContain("img-src 'self' data: blob: https:")
  expect(csp).toContain("media-src 'self' blob:")
  expect(csp).not.toMatch(/connect-src[^;]*blob:/)
  const policyBeforeBootstrap = await page.locator('meta[http-equiv="Content-Security-Policy"]').evaluate(policy => {
    const bootstrap = document.querySelector('script[src$="theme-bootstrap.js"]')
    return Boolean(bootstrap && (policy.compareDocumentPosition(bootstrap) & Node.DOCUMENT_POSITION_FOLLOWING))
  })
  expect(policyBeforeBootstrap).toBe(true)
})

test('settings, theme switching, and pasted AI preview work on the web', async ({ page }) => {
  await openApp(page)
  await page.locator('.mnt-settings-entry').first().click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await openTab(page, 'appearance')
  await page.getByRole('button', { name: 'Moss', exact: true }).click()
  const before = await accent(page)
  await openTab(page, 'ai')
  await page.locator('.sd-ai textarea:not(.sd-ai-request)').fill(reply)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await page.locator('.sd-ai .sd-button', { hasText: /^(预览|Preview)$/ }).click()
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toContainText('Web Preview')
  await expect.poll(() => accent(page)).toBe('#7ee0c3')
  expect(before).not.toBe('#7ee0c3')
})

test('theme export can be copied or imported on the web and undone', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openApp(page)
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'appearance')
  const originalAccent = await accent(page)
  await openTab(page, 'ai')
  await page.getByRole('button', { name: 'Export theme pack' }).click()
  await expect(page.getByText(/Local wallpapers, videos and uploaded fonts are left out/)).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .json' }).click()
  const download = await downloadPromise
  const bytes = await readFile((await download.path())!)
  const pack = JSON.parse(bytes.toString())
  expect(pack.kind).toBe('mnt.theme-pack')
  expect(pack.packVersion).toBe(2)

  await page.getByRole('button', { name: 'Copy as AI reply' }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('```json')
  expect(copied.match(/```/g)).toHaveLength(2)
  const submissionLink = page.getByRole('link', { name: 'Submit to gallery' })
  await expect(submissionLink).toBeVisible()
  const submission = new URL(await submissionLink.getAttribute('href')!)
  expect(submission.searchParams.get('template')).toBe('theme_submission.yml')
  expect(submission.searchParams.get('title')).toContain('Exported theme')
  expect(await submissionLink.getAttribute('href')).not.toContain('mnt.theme-pack')

  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.locator('.sd-ai textarea:not(.sd-ai-request)').fill(copied)
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await openTab(page, 'appearance')
  const accentValue = page.getByLabel('Accent color hex value', { exact: true })
  await accentValue.fill('#223344')
  await accentValue.press('Enter')
  await expect.poll(() => accent(page)).toBe('#223344')
  await openTab(page, 'ai')
  await page.locator('.sd-ai input[type="file"]').setInputFiles({ name: 'theme-pack.json', mimeType: 'application/json', buffer: bytes })
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  await page.locator('.sd-ai .sd-button', { hasText: /^(预览|Preview)$/ }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toBeVisible()
  await expect.poll(() => accent(page)).toBe(originalAccent)
  await banner.getByRole('button', { name: /^(应用|Apply)$/ }).click()
  await expect(page.locator('.undo-toast')).toBeVisible()
  await page.locator('.undo-toast').getByRole('button', { name: /^(撤销|Undo)$/i }).click()
  await expect.poll(() => accent(page)).toBe('#223344')
})

test('backup export can be imported back into web storage', async ({ page }) => {
  await openApp(page)
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'data')
  await expect(page.locator('[data-testid="browser-bookmark-import"]')).toContainText('Browser bookmark import needs extension APIs')
  await expect(page.getByRole('note')).toContainText('Browser sync is available in the installed extension.')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export backup|导出备份/ }).click()
  const download = await downloadPromise
  const backup = await download.path()
  expect(backup).toBeTruthy()
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(backup!)
  const parsed = JSON.parse(bytes.toString())
  expect(parsed.kind).toBe('mnt.backup')
  page.once('dialog', dialog => dialog.accept())
  await page.getByLabel(/Import backup|导入备份/).setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: bytes })
  await page.getByRole('button', { name: /^(Restore|恢复)$/ }).click()
  await expect(page.getByText(/^(Backup imported\.|备份已导入。)$/)).toBeVisible()
  await expect(page.locator('.clock')).toBeVisible()
  const restored = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  })
  expect(restored).toEqual(parsed.profiles[0])
})

test('service worker keeps the app shell available offline', async ({ page, context }) => {
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.mnt-settings-entry').first()).toBeVisible()
  await expect(page.locator('.clock')).toBeVisible()
})

test('a waiting service worker prompts in the saved language and preserves the profile', async ({ page }) => {
  await openApp(page, { accent: '#abcdef', language: 'zh-CN' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  const version = () => page.evaluate(() => new Promise<string>(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = event => resolve(event.data)
    navigator.serviceWorker.controller!.postMessage({ type: 'TEST_VERSION' }, [channel.port2])
  }))
  expect(await version()).toBe('A')
  const profile = () => page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('profiles:v2:index')!)
    const snapshot = JSON.parse(localStorage.getItem(`profiles:v2:generation:${index.generation}`)!)
    return snapshot.profiles.profiles[snapshot.profiles.activeProfileId]
  })
  const before = await profile()
  expect((await page.request.post('./__test__/worker-version')).status()).toBe(204)
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update())
  await expect(page.locator('.pwa-update-prompt')).toHaveText('新版本可用 · 刷新')
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'about')
  await page.getByRole('combobox', { name: '语言', exact: true }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('New Tab')
  await expect(page.locator('.pwa-update-prompt')).toHaveText('New version available · Refresh')
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  const reloaded = page.waitForEvent('load')
  await page.locator('.pwa-update-prompt').click()
  await reloaded
  await expect(page.locator('.clock')).toBeVisible()
  expect(await version()).toBe('B')
  const withoutLanguageMetadata = (value: ReturnType<typeof JSON.parse>) => {
    const { updatedAt: _updatedAt, ...meta } = value.meta
    const { language: _language, ...prefs } = value.prefs
    return { ...value, meta, prefs }
  }
  expect(withoutLanguageMetadata(await profile())).toEqual(withoutLanguageMetadata(before))
})

test('phone viewport has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openApp(page)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})

test('public gallery supports filters, copying and previewing a theme', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const index = JSON.parse(await readFile('docs/gallery/index.json', 'utf8'))
  await page.route('https://zanderh-code.github.io/promptab/gallery/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/promptab/gallery/', '')
    await route.fulfill({ body: await readFile(`docs/gallery/${path}`), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } })
  })
  await seedExistingUser(page, { language: 'en' })
  await page.goto('../gallery/')
  await expect(page.locator('.card')).toHaveCount(index.packs.length)
  await page.getByRole('button', { name: '中文' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  expect(await page.evaluate(() => localStorage.getItem('promptab_lang'))).toBe('zh-CN')
  await page.getByRole('button', { name: 'English' }).click()
  await page.locator('#mode').selectOption('light')
  await expect(page.locator('.card')).toHaveCount(index.packs.filter((item: { mode: string }) => item.mode === 'light').length)
  await page.locator('#mode').selectOption('')
  const layout = await page.locator('#layout option').nth(1).getAttribute('value')
  await page.locator('#layout').selectOption(layout!)
  expect(await page.locator('.card').count()).toBeGreaterThan(0)
  await page.locator('#layout').selectOption('')
  await page.locator('#search').fill(index.packs[0].name)
  await expect(page.locator('.card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Copy prompt' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(index.packs[0].prompt.en)
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.filter(item => item.impact === 'critical' || item.impact === 'serious' || item.impact === 'moderate')).toEqual([])
  expect(errors).toEqual([])
  await page.getByRole('link', { name: 'Try in web app' }).click()
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toContainText(index.packs[0].name)
  const before = await page.evaluate(() => localStorage.getItem('profiles:v2:index'))
  await banner.getByRole('button', { name: 'Discard', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('profiles:v2:index'))).toBe(before)
})

test('gallery deep links preview safely and discard without saving', async ({ page }) => {
  const base = 'https://zanderh-code.github.io/promptab/gallery/'
  const index = JSON.parse(await readFile('docs/gallery/index.json', 'utf8'))
  const item = index.packs[0]
  const pack = JSON.parse(await readFile(`docs/gallery/${item.file}`, 'utf8'))
  await page.route(`${base}**`, route => route.fulfill({ json: route.request().url().endsWith('index.json') ? index : pack, headers: { 'access-control-allow-origin': '*' } }))
  await seedExistingUser(page, { language: 'en' })
  await page.goto(`./#try=${item.id}`)
  const banner = page.locator('.mnt-banner[data-kind="preview"]')
  await expect(banner).toContainText(item.name)
  expect(new URL(page.url()).hash).toBe('')
  const before = await page.evaluate(() => localStorage.getItem('profiles:v2:index'))
  await banner.getByRole('button', { name: 'Discard', exact: true }).click()
  await expect(banner).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('profiles:v2:index'))).toBe(before)
})

test('gallery deep links reject unknown and unsafe packs', async ({ page }) => {
  const base = 'https://zanderh-code.github.io/promptab/gallery/'
  const index = JSON.parse(await readFile('docs/gallery/index.json', 'utf8'))
  await page.route(`${base}**`, route => route.fulfill({ json: route.request().url().endsWith('index.json') ? index : { kind: 'mnt.theme-pack', css: '@import "https://evil.example/style.css";' }, headers: { 'access-control-allow-origin': '*' } }))
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./#try=unknown-id')
  await expect(page.getByRole('alert')).toContainText('invalid or unsafe')
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toHaveCount(0)
  await page.goto(`./#try=${index.packs[0].id}`)
  await expect(page.getByRole('alert')).toContainText('invalid or unsafe')
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toHaveCount(0)
  expect(new URL(page.url()).hash).toBe('')
})

test('gallery deep links report network failures without previewing', async ({ page }) => {
  await page.route('https://zanderh-code.github.io/promptab/gallery/**', route => route.abort())
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./#try=arctic-day')
  await expect(page.getByRole('alert')).toContainText('Could not load')
  await expect(page.locator('.mnt-banner[data-kind="preview"]')).toHaveCount(0)
  expect(new URL(page.url()).hash).toBe('')
})

test('weather and gallery support cross-origin browser fetches', async ({ page }) => {
  await openApp(page)
  const results = await page.evaluate(async () => {
    const urls = [
      'https://zanderh-code.github.io/promptab/gallery/index.json',
      'https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74&current=temperature_2m&timezone=UTC',
    ]
    return Promise.all(urls.map(async url => {
      try { const response = await fetch(url); return { status: response.status, ok: response.ok } }
      catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
    }))
  })
  expect(results[0]).toMatchObject({ ok: true })
  expect(results[1]).toMatchObject({ ok: true })
})

async function checkWebByok(page: Page, provider: 'anthropic' | 'openai', key: string) {
  const origin = provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com'
  let preflightHeaders = ''
  let preflightCount = 0
  let observedOptions: Record<string, string> = {}
  let requestHeaders: Record<string, string> = {}
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${origin}/*`, requestStage: 'Request' }] })
  cdp.on('Network.requestWillBeSent', event => {
    if (event.request.url.startsWith(origin) && event.request.method === 'OPTIONS') observedOptions = event.request.headers
  })
  cdp.on('Fetch.requestPaused', event => {
    const respond = async () => {
      const headers = event.request.headers as Record<string, string>
      const findHeader = (name: string) => Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? ''
      if (event.request.method === 'OPTIONS') {
        preflightCount++
        preflightHeaders = findHeader('access-control-request-headers')
        await cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 204, responseHeaders: [
          { name: 'Access-Control-Allow-Origin', value: '*' },
          { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { name: 'Access-Control-Allow-Headers', value: preflightHeaders },
        ] })
        return
      }
      requestHeaders = headers
      const body = provider === 'anthropic'
        ? { id: 'msg_mock', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: reply }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }
        : { choices: [{ finish_reason: 'stop', message: { content: reply } }] }
      await cdp.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: 200, responseHeaders: [
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Content-Type', value: 'application/json' },
      ], body: Buffer.from(JSON.stringify(body)).toString('base64') })
    }
    void respond()
  })
  await seedExistingUser(page, { language: 'en' })
  await page.goto('./')
  await page.locator('.mnt-settings-entry').first().click()
  await openTab(page, 'ai')
  if (provider === 'openai') await page.locator('#byok-provider').selectOption('openai')
  await page.locator('#byok-model').fill('test-model')
  await page.locator('#byok-key').fill(key)
  await page.locator('#byok-send-button').click()
  await expect(page.locator('.sd-ai-ok')).toBeVisible()
  expect(preflightCount).toBe(1)
  const observedHeader = (name: string) => Object.entries(observedOptions).find(([header]) => header.toLowerCase() === name.toLowerCase())?.[1] ?? ''
  expect(observedHeader('Access-Control-Request-Method')).toBe('POST')
  const requested = preflightHeaders.split(',').map(header => header.trim().toLowerCase())
  if (provider === 'anthropic') {
    expect(requested).toEqual(expect.arrayContaining(['anthropic-dangerous-direct-browser-access', 'anthropic-version', 'authorization', 'content-type']))
    expect(requestHeaders['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(requestHeaders.authorization).toBe(`Bearer ${key}`)
  } else {
    expect(requested).toEqual(expect.arrayContaining(['authorization', 'content-type']))
    expect(requestHeaders.authorization).toBe(`Bearer ${key}`)
  }
  const persisted = await page.evaluate(async () => {
    const local = JSON.stringify(localStorage)
    const serialize = async (value: unknown): Promise<unknown> => {
      if (value instanceof Blob) return await value.text()
      if (Array.isArray(value)) return await Promise.all(value.map(serialize))
      if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await serialize(item)])))
      return value
    }
    const databases = await indexedDB.databases()
    const contents: unknown[] = []
    for (const { name } of databases) {
      if (!name) continue
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      for (const store of Array.from(database.objectStoreNames)) {
        const records = await new Promise<unknown[]>((resolve, reject) => {
          const request = database.transaction(store, 'readonly').objectStore(store).getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        contents.push(await serialize(records))
      }
      database.close()
    }
    return { local, indexedDb: JSON.stringify(contents) }
  })
  expect(persisted.local).not.toContain(key)
  expect(persisted.indexedDb).not.toContain(key)
  await openTab(page, 'data')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup', exact: true }).click()
  const backup = await readFile((await (await download).path())!, 'utf8')
  expect(backup).not.toContain(key)
}

test('Anthropic BYOK uses direct browser headers without persisting its key', async ({ page }) => {
  await checkWebByok(page, 'anthropic', 'anthropic-mock-secret')
})

test('OpenAI BYOK handles browser CORS without persisting its key', async ({ page }) => {
  await checkWebByok(page, 'openai', 'openai-mock-secret')
})
