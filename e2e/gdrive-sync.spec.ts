import { test, expect, type Page, type Route } from '@playwright/test'
import { openTab } from './helpers'

/**
 * Two browsers (separate contexts) sharing one Google Drive app folder. Google sign-in and the Drive REST API are
 * faked: chrome.identity returns a token redirect, and page.route answers www.googleapis.com from memory.
 * Needs a build with VITE_GOOGLE_DRIVE_CLIENT_ID (playwright.config.ts sets a test one).
 */
type DriveFile = { id: string; body: string }

function fakeDrive() {
  const files: DriveFile[] = []
  const requests: string[] = []
  let seq = 0
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE' }
  const handle = async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    requests.push(`${request.method()} ${url.pathname}`)
    if (request.headers().authorization !== 'Bearer drive-token') return route.fulfill({ status: 401, headers: cors, body: '' })
    if (url.pathname === '/drive/v3/files' && request.method() === 'GET') return route.fulfill({ headers: cors, json: { files: files.map(({ id }) => ({ id })) } })
    if (url.pathname === '/upload/drive/v3/files' && request.method() === 'POST') {
      const boundary = request.headers()['content-type'].split('boundary=')[1]
      const body = request.postData()!.split(`--${boundary}`)[2].split('\r\n\r\n')[1].replace(/\r\n$/, '')
      const file = { id: `file-${++seq}`, body }
      files.push(file)
      return route.fulfill({ headers: cors, json: { id: file.id } })
    }
    const file = files.find(item => url.pathname.endsWith(`/${item.id}`))
    if (!file) return route.fulfill({ status: 404, headers: cors, body: '' })
    if (request.method() === 'PATCH') { file.body = request.postData()!; return route.fulfill({ headers: cors, json: { id: file.id } }) }
    if (request.method() === 'DELETE') { files.splice(files.indexOf(file), 1); return route.fulfill({ status: 204, headers: cors }) }
    return route.fulfill({ headers: cors, contentType: 'application/json', body: file.body })
  }
  return { files, requests, handle }
}

/** An extension-like page: storage areas (including storage.sync, so both providers are offered), permissions and identity. */
async function installExtensionMock(page: Page) {
  await page.addInitScript(() => {
    const area = (data: Record<string, unknown>) => ({
      async get(keys: string[] | string | null) {
        if (keys === null) return { ...data }
        const list = Array.isArray(keys) ? keys : [keys]
        return Object.fromEntries(list.filter(key => Object.hasOwn(data, key)).map(key => [key, structuredClone(data[key])]))
      },
      async set(items: Record<string, unknown>) { Object.assign(data, structuredClone(items)) },
      async remove(keys: string[] | string) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key] },
    })
    const listeners = new Set<(changes: Record<string, unknown>, area: string) => void>()
    const launches: { url: string; interactive: boolean }[] = []
    Object.defineProperty(window, 'chrome', { configurable: true, value: {
      storage: {
        local: area({ settings: { language: 'en' } }), sync: area({}), session: area({}),
        onChanged: { addListener: (fn: never) => listeners.add(fn), removeListener: (fn: never) => listeners.delete(fn) },
      },
      permissions: { request: async (details: unknown) => { (window as unknown as { __permissionRequests: unknown[] }).__permissionRequests.push(details); return true } },
      identity: {
        getRedirectURL: () => 'https://fake-extension-id.chromiumapp.org/',
        async launchWebAuthFlow(details: { url: string; interactive: boolean }) {
          launches.push(details)
          const url = new URL(details.url)
          const claims = btoa(JSON.stringify({ iss: 'https://accounts.google.com', aud: url.searchParams.get('client_id'), sub: 'google-user-1', nonce: url.searchParams.get('nonce') })).replace(/=+$/, '')
          const fragment = new URLSearchParams({ access_token: 'drive-token', expires_in: '3600', token_type: 'Bearer', scope: url.searchParams.get('scope')!, state: url.searchParams.get('state')!, id_token: `e30.${claims}.sig` })
          return `https://fake-extension-id.chromiumapp.org/#${fragment}`
        },
      },
    } })
    Object.assign(window, { __permissionRequests: [], __launches: launches })
  })
}

const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mnt-accent').trim().toLowerCase())

async function openSync(page: Page) {
  await page.goto('/')
  await expect(page.locator('.mnt-clock')).toBeVisible()
  await page.locator('.settings-button').click()
  await openTab(page, 'data')
}

test('Google Drive sync carries a profile from one browser to another', async ({ browser }) => {
  const drive = fakeDrive()
  const first = await browser.newContext()
  const second = await browser.newContext()
  for (const context of [first, second]) await context.route('https://www.googleapis.com/**', drive.handle)

  const a = await first.newPage()
  await installExtensionMock(a)
  await openSync(a)
  await a.getByLabel('Sync with').selectOption('gdrive')
  await expect(a.getByText(/hidden Promptab folder in your own Google Drive/)).toBeVisible()
  await a.getByRole('checkbox', { name: 'Sync this profile across devices' }).check()
  await expect(a.getByRole('status').filter({ hasText: 'Profile synced.' })).toBeVisible()
  // The click asked for the Drive host, then opened Google's sign-in for the app folder only.
  expect(await a.evaluate(() => (window as unknown as { __permissionRequests: unknown[] }).__permissionRequests)).toEqual([{ origins: ['https://www.googleapis.com/*'] }])
  const [launch] = await a.evaluate(() => (window as unknown as { __launches: { url: string; interactive: boolean }[] }).__launches)
  expect(launch.interactive).toBe(true)
  expect(new URL(launch.url).searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.appdata')
  expect(drive.files).toHaveLength(1)
  const uploaded = JSON.parse(drive.files[0].body)
  expect(uploaded.kind).toBe('mnt.profile-sync')
  expect(drive.files[0].body).not.toContain('mnt-asset:')
  // The token lives in memory-only session storage, never in local storage that backups read.
  expect(await a.evaluate(async () => JSON.stringify(await (window.chrome as unknown as { storage: { local: { get(k: null): Promise<unknown> } } }).storage.local.get(null)))).not.toContain('drive-token')

  // Device A's edit reaches Drive (simulated directly so the test does not depend on theme controls).
  uploaded.profile.theme.color.accent = '#123456'
  drive.files[0].body = JSON.stringify(uploaded)

  const b = await second.newPage()
  await installExtensionMock(b)
  await openSync(b)
  await b.getByLabel('Sync with').selectOption('gdrive')
  await b.getByRole('checkbox', { name: 'Sync this profile across devices' }).check()
  // An existing Drive copy always needs a choice; nothing is overwritten silently.
  await expect(b.getByRole('status').filter({ hasText: 'This device and Google Drive have different profiles.' })).toBeVisible()
  await b.getByRole('button', { name: 'Use the Google Drive copy on this device' }).click()
  await expect(b.getByRole('status').filter({ hasText: 'Google Drive setup applied.' })).toBeVisible()
  await expect.poll(() => accent(b)).toBe('#123456')
  expect(drive.files).toHaveLength(1)

  // Turning sync off and deleting the copy removes the file from Drive.
  await b.getByRole('button', { name: 'Delete Google Drive sync data' }).click()
  await b.getByRole('alertdialog').getByRole('button', { name: 'Delete Google Drive sync data' }).click()
  await expect(b.getByRole('status').filter({ hasText: 'Google Drive sync data deleted' })).toBeVisible()
  expect(drive.files).toHaveLength(0)
  await first.close()
  await second.close()
})
