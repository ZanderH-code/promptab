import type { ProfileV2 } from './schema/profile'
import { parseSyncPayload, serializeSyncPayload, type CloudBackend, type SyncPayload } from './sync'

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const DRIVE_ORIGIN = 'https://www.googleapis.com'
const FILE_NAME = 'promptab-sync.json'
const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 15_000
const WATCH_COOLDOWN_MS = 30_000

/** Supplies a Drive access token; `invalidate` drops one Google rejected so the next call fetches a fresh one. */
export type DriveAuth = { token(): Promise<string>; invalidate(token: string): Promise<void> }
type Fetch = (url: string, init: RequestInit) => Promise<Response>
type Events = { addEventListener(type: string, fn: () => void): void; removeEventListener(type: string, fn: () => void): void }

/** The person has to sign in to Google again; silent token renewal failed or Google rejected the token twice. */
export class DriveAuthError extends Error { constructor() { super('Google Drive sign-in required'); this.name = 'DriveAuthError' } }

type Options = {
  fetch?: Fetch
  /** Runs the browser sign-in; must start inside the click that enables sync. */
  connect?: () => Promise<boolean>
  disconnect?: () => Promise<void>
  /** Where to listen for "the person came back to this tab" and "the network is back". */
  events?: { document?: Events; window?: Events }
  now?: () => number
}

/** The synced profile as one JSON file in the user's hidden Drive app folder, readable only by this OAuth client. */
export function googleDriveBackend(auth: DriveAuth, options: Options = {}): CloudBackend {
  const fetcher: Fetch = options.fetch ?? ((url, init) => fetch(url, init))
  const now = options.now ?? (() => Date.now())
  const call = async (url: string, init: RequestInit = {}, retry = true): Promise<Response> => {
    const token = await auth.token()
    const response = await fetcher(url, {
      ...init,
      headers: { ...init.headers as Record<string, string>, Authorization: `Bearer ${token}` },
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.status === 401) {
      await auth.invalidate(token)
      if (retry) return call(url, init, false)
      throw new DriveAuthError()
    }
    if (!response.ok && response.status !== 404) throw new Error(`Google Drive request failed (${response.status})`)
    return response
  }
  /** Every copy, oldest first. Two devices that both created the file before seeing each other settle on the oldest. */
  const list = async (): Promise<string[]> => {
    const query = new URLSearchParams({ spaces: 'appDataFolder', q: `name = '${FILE_NAME}' and trashed = false`, orderBy: 'createdTime', fields: 'files(id)', pageSize: '100' })
    const response = await call(`${DRIVE_ORIGIN}/drive/v3/files?${query}`)
    if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`)
    const { files } = await response.json() as { files?: { id?: unknown }[] }
    return (files ?? []).map(file => file.id).filter((id): id is string => typeof id === 'string')
  }
  const fileUrl = (id: string, upload = false) => `${DRIVE_ORIGIN}/${upload ? 'upload/' : ''}drive/v3/files/${encodeURIComponent(id)}`
  const backend: CloudBackend = {
    async read(): Promise<SyncPayload | null> {
      // Listed on every read: another device may have created, replaced or deleted the file since.
      for (const id of await list()) {
        const response = await call(`${fileUrl(id)}?alt=media`)
        if (response.status === 404) continue
        if (Number(response.headers.get('Content-Length')) > MAX_BYTES) throw new Error('Sync quota exceeded')
        const text = await response.text()
        if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('Sync quota exceeded')
        return parseSyncPayload(text)
      }
      return null
    },
    async write(profile: ProfileV2) {
      const body = serializeSyncPayload(profile)
      if (new TextEncoder().encode(body).length > MAX_BYTES) throw new Error('Sync quota exceeded')
      const [id, ...duplicates] = await list()
      if (id) {
        const response = await call(`${fileUrl(id, true)}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body })
        if (response.ok) {
          // The winning copy now holds the latest profile, so stray copies from a concurrent first upload can go.
          for (const extra of duplicates) await call(fileUrl(extra), { method: 'DELETE' })
          return
        }
      }
      const boundary = `promptab-${crypto.randomUUID()}`
      const metadata = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' })
      const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`
      const response = await call(`${DRIVE_ORIGIN}/upload/drive/v3/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart })
      if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`)
    },
    async remove() {
      // Delete every copy, including duplicates a concurrent first upload may have left behind.
      for (const id of await list()) await call(fileUrl(id), { method: 'DELETE' })
    },
    connect: options.connect,
    disconnect: options.disconnect,
  }
  const { document: doc, window: win } = options.events ?? {}
  if (doc || win) {
    backend.watch = onChange => {
      // Drive cannot push changes, so check when the person returns to the tab or the network comes back.
      let last = now()
      const check = () => {
        if (doc && (doc as Events & { visibilityState?: string }).visibilityState === 'hidden') return
        if (now() - last < WATCH_COOLDOWN_MS) return
        last = now()
        onChange()
      }
      doc?.addEventListener('visibilitychange', check)
      win?.addEventListener('online', check)
      return () => { doc?.removeEventListener('visibilitychange', check); win?.removeEventListener('online', check) }
    }
  }
  return backend
}
