import { describe, expect, it, vi } from 'vitest'
import { defaults } from './model'
import { migrateV1 } from './migrate/v1'
import { DriveAuthError, googleDriveBackend } from './gdrive'
import { serializeSyncPayload } from './sync'

/** In-memory Drive appDataFolder speaking the handful of REST calls the backend uses. */
function fakeDrive() {
  const files = new Map<string, { created: number; body: string }>()
  let seq = 0
  const calls: string[] = []
  const tokens: string[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET'
    const { pathname, searchParams } = new URL(url)
    calls.push(`${method} ${pathname}`)
    tokens.push(String((init.headers as Record<string, string>).Authorization))
    if ((init.headers as Record<string, string>).Authorization !== 'Bearer good') return new Response('', { status: 401 })
    if (pathname === '/drive/v3/files' && method === 'GET') {
      expect(searchParams.get('spaces')).toBe('appDataFolder')
      const ids = [...files].sort((a, b) => a[1].created - b[1].created).map(([id]) => ({ id }))
      return Response.json({ files: ids })
    }
    if (pathname === '/upload/drive/v3/files' && method === 'POST') {
      const id = `f${++seq}`
      const body = String(init.body)
      const boundary = String((init.headers as Record<string, string>)['Content-Type']).split('boundary=')[1]
      const parts = body.split(`--${boundary}`)
      expect(JSON.parse(parts[1].split('\r\n\r\n')[1])).toMatchObject({ name: 'promptab-sync.json', parents: ['appDataFolder'] })
      files.set(id, { created: seq, body: parts[2].split('\r\n\r\n')[1].replace(/\r\n$/, '') })
      return Response.json({ id })
    }
    const id = decodeURIComponent(pathname.split('/').pop()!)
    const file = files.get(id)
    if (!file) return new Response('', { status: 404 })
    if (method === 'PATCH') { file.body = String(init.body); return Response.json({ id }) }
    if (method === 'DELETE') { files.delete(id); return new Response(null, { status: 204 }) }
    return new Response(file.body)
  })
  return { files, calls, tokens, fetch, add(body: string) { const id = `f${++seq}`; files.set(id, { created: seq, body }); return id } }
}

const auth = (token = 'good') => ({ token: vi.fn(async () => token), invalidate: vi.fn(async () => {}) })
const profile = () => migrateV1(defaults, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })

describe('Google Drive backend', () => {
  it('creates one app-folder file, then updates it in place and reads it back', async () => {
    const drive = fakeDrive()
    const backend = googleDriveBackend(auth(), { fetch: drive.fetch })
    expect(await backend.read()).toBeNull()
    const local = await profile()
    await backend.write(local)
    local.theme.color.accent = '#123456'
    await backend.write(local)
    expect(drive.files.size).toBe(1)
    expect((await backend.read())?.profile.theme.color.accent).toBe('#123456')
    expect(drive.calls.filter(call => call.startsWith('POST'))).toHaveLength(1)
    expect(drive.calls.filter(call => call.startsWith('PATCH'))).toHaveLength(1)
    // Hardened requests: no cookies, no cache, no redirects, always a timeout.
    expect(drive.fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error' })
    expect(drive.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('settles duplicate copies on the oldest file and removes the strays only after a successful write', async () => {
    const drive = fakeDrive()
    const local = await profile()
    const oldest = drive.add(serializeSyncPayload(local))
    const changed = structuredClone(local)
    changed.theme.color.accent = '#abcdef'
    drive.add(serializeSyncPayload(changed))
    const backend = googleDriveBackend(auth(), { fetch: drive.fetch })
    // Reading never deletes: both devices still see the same winner.
    expect((await backend.read())?.profile.theme.color.accent).toBe(local.theme.color.accent)
    expect(drive.files.size).toBe(2)
    await backend.write(changed)
    expect([...drive.files.keys()]).toEqual([oldest])
    expect((await backend.read())?.profile.theme.color.accent).toBe('#abcdef')
  })

  it('deletes every copy', async () => {
    const drive = fakeDrive()
    drive.add('{}'); drive.add('{}')
    await googleDriveBackend(auth(), { fetch: drive.fetch }).remove()
    expect(drive.files.size).toBe(0)
  })

  it('renews a rejected token once, then asks the person to sign in', async () => {
    const drive = fakeDrive()
    let token = 'stale'
    const renewing = { token: vi.fn(async () => token), invalidate: vi.fn(async () => { token = 'good' }) }
    expect(await googleDriveBackend(renewing, { fetch: drive.fetch }).read()).toBeNull()
    expect(renewing.invalidate).toHaveBeenCalledWith('stale')

    const rejected = auth('revoked')
    await expect(googleDriveBackend(rejected, { fetch: drive.fetch }).read()).rejects.toBeInstanceOf(DriveAuthError)
    expect(rejected.invalidate).toHaveBeenCalledTimes(2)
  })

  it('refuses a profile above the size cap without uploading', async () => {
    const drive = fakeDrive()
    const local = await profile()
    local.bookmarks.groups[0].name = 'x'.repeat(1_000_001)
    await expect(googleDriveBackend(auth(), { fetch: drive.fetch }).write(local)).rejects.toThrow('quota')
    expect(drive.calls.some(call => call.startsWith('POST') || call.startsWith('PATCH'))).toBe(false)
  })

  it('checks again when the tab becomes visible, at most every 30 seconds', () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    let time = 0
    const backend = googleDriveBackend(auth(), { fetch: fakeDrive().fetch, events: { document: doc }, now: () => time })
    const onChange = vi.fn()
    const stop = backend.watch!(onChange)
    time = 10_000; doc.dispatchEvent(new Event('visibilitychange'))
    expect(onChange).not.toHaveBeenCalled()
    time = 31_000; doc.dispatchEvent(new Event('visibilitychange'))
    expect(onChange).toHaveBeenCalledTimes(1)
    stop()
    time = 90_000; doc.dispatchEvent(new Event('visibilitychange'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
