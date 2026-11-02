import { chromium } from '@playwright/test'
import { generateKeyPairSync, createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = await mkdtemp(join(tmpdir(), 'promptab-mv3-'))
const extension = join(root, 'extension')
let browser
try {
  await cp(resolve('dist'), extension, { recursive: true })
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'der' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
  const hash = createHash('sha256').update(publicKey).digest().subarray(0, 16)
  const id = Array.from(hash, byte => String.fromCharCode(97 + (byte >> 4), 97 + (byte & 15))).join('')
  const manifestPath = join(extension, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.key = publicKey.toString('base64')
  // Exercise the request path with a pre-granted origin in this temporary fixture.
  // The actual extension keeps these origins optional and requests them at runtime.
  manifest.host_permissions = ['https://api.openai.com/*', 'https://api.anthropic.com/*']
  manifest.optional_host_permissions = []
  await writeFile(manifestPath, JSON.stringify(manifest))
  browser = await chromium.launchPersistentContext(join(root, 'profile'), { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--auto-confirm-extension-dialogs'] })
  let calls = 0
  await browser.route('https://**/*', async route => {
    const url = route.request().url()
    if (url !== 'https://api.openai.com/v1/chat/completions' && url !== 'https://api.anthropic.com/v1/messages') return route.abort()
    calls++
    const text = '```json\n{"kind":"mnt.theme-pack","css":"@import url(https://example.com/x.css);"}\n```'
    const body = url.includes('anthropic.com') ? { id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } } : { choices: [{ finish_reason: 'stop', message: { content: text } }] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  const page = await browser.newPage()
  page.on('console', msg => console.log('MV3 console:', msg.type(), msg.text()))
  page.on('pageerror', err => console.log('MV3 pageerror:', err.message))
  await page.goto(`chrome-extension://${id}/index.html`)
  if (await page.evaluate(() => chrome.runtime.id) !== id) throw new Error('Extension did not load')
  await page.locator('.mnt-settings-entry').click()
  await page.getByRole('tab', { name: 'AI', exact: true }).click()
  await page.locator('#byok-provider').selectOption('openai')
  await page.locator('#byok-model').fill('test-model')
  await page.locator('#byok-key').fill('fake-test-key')
  const button = page.locator('#byok-send-button')
  console.log('Button state before click:', JSON.stringify({ disabled: await button.isDisabled(), text: await button.textContent() }))
  await button.click()
  try { await page.locator('.sd-ai-group[data-kind="problem"]').waitFor({ timeout: 15000 }) }
  catch {
    console.log('MV3 diagnostic:', JSON.stringify({ calls, alerts: await page.locator('[role="alert"]').allTextContents(), granted: await page.evaluate(() => chrome.permissions.contains({ origins: ['https://api.openai.com/*'] })) }))
    throw new Error('MV3 provider path did not reach validation')
  }
  if (calls !== 1) throw new Error(`Expected one intercepted provider request, got ${calls}`)
  const granted = await page.evaluate(() => chrome.permissions.contains({ origins: ['https://api.openai.com/*'] }))
  if (!granted) throw new Error('Provider permission was not granted')
  await page.locator('#byok-provider').selectOption('anthropic')
  await button.click()
  await page.waitForFunction(() => !document.querySelector('#byok-send-button')?.hasAttribute('disabled'), null, { timeout: 15000 })
  if (calls !== 2) throw new Error(`Expected two intercepted provider requests, got ${calls}`)
  console.log('MV3 extension with pre-granted fixture origins: both intercepted provider requests passed')
} finally {
  await browser?.close()
  await rm(root, { recursive: true, force: true })
}
