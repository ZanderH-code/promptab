import { DRIVE_ORIGIN, DRIVE_SCOPE, DriveAuthError, type DriveAuth } from '../core/gdrive'
import { extensionApi, isFirefoxExtension } from './extension'

type FlowDetails = { url: string; interactive: boolean; abortOnLoadForNonInteractive?: boolean; timeoutMsForNonInteractive?: number }
type Identity = { launchWebAuthFlow(details: FlowDetails): Promise<string | undefined>; getRedirectURL(path?: string): string }
type SessionArea = { get(keys: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string): Promise<void> }
declare const browser: { identity?: Identity; storage?: { session?: SessionArea } } | undefined
declare const chrome: { identity?: Identity; storage?: { session?: SessionArea } } | undefined

/** Public OAuth client ID for the implicit grant (there is no secret). Empty in builds made without one. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID ?? ''

/**
 * The identity API, spelled out as `browser.identity` / `chrome.identity` so store review sees the API behind the
 * `identity` permission. launchWebAuthFlow is the one sign-in flow Chrome, Edge and Firefox all implement.
 */
export function extensionIdentity(): Identity | undefined {
  if (typeof browser !== 'undefined' && browser?.identity) return browser.identity
  if (typeof chrome !== 'undefined' && chrome?.identity) return { launchWebAuthFlow: details => chrome!.identity!.launchWebAuthFlow(details), getRedirectURL: path => chrome!.identity!.getRedirectURL(path) }
  return undefined
}

/** Memory-only extension storage: the token is gone when the browser closes and never reaches backups or sync. */
export function extensionSession(): SessionArea | undefined {
  if (typeof browser !== 'undefined' && browser?.storage?.session) return browser.storage.session
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) return chrome.storage.session
  return undefined
}

/** Google signed in but the person unticked Drive access on the consent screen. */
export class DriveScopeError extends Error { constructor() { super('Google Drive access was not granted'); this.name = 'DriveScopeError' } }

const TOKEN_KEY = 'mnt.gdrive.token'
const ACCOUNT_KEY = 'mnt.gdrive.account'
type Cached = { token: string; expiresAt: number }
type Grant = Cached & { account: string }
type Flow = { state: string; nonce: string; account?: string }

/** `openid` adds an ID token naming the Google account, so renewal can stay on that account when several are signed in. */
export function authUrl(clientId: string, redirectUri: string, flow: Flow, interactive: boolean): string {
  const params = new URLSearchParams({ client_id: clientId, response_type: 'token id_token', redirect_uri: redirectUri, scope: `openid ${DRIVE_SCOPE}`, state: flow.state, nonce: flow.nonce })
  params.set('prompt', interactive ? 'select_account' : 'none')
  if (!interactive && flow.account) params.set('login_hint', flow.account)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/** The `sub` (stable account ID) of an ID token that this sign-in asked for. The token arrived from Google over TLS on the redirect, so its claims are only checked, not its signature. */
function accountOf(idToken: string | null, clientId: string, nonce: string): string {
  let claims: { sub?: unknown; aud?: unknown; iss?: unknown; nonce?: unknown }
  try { claims = JSON.parse(atob(idToken!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { throw new DriveAuthError() }
  const issuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com'
  if (!issuer || claims.aud !== clientId || claims.nonce !== nonce || typeof claims.sub !== 'string' || !claims.sub) throw new DriveAuthError()
  return claims.sub
}

/** Read the implicit-grant redirect fragment. Rejects a foreign state, an error, or a grant without Drive app-folder access. */
export function parseAuthRedirect(redirect: string, flow: Flow, clientId: string, now: number): Grant {
  let hash: string
  try { hash = new URL(redirect).hash.slice(1) } catch { throw new DriveAuthError() }
  const fragment = new URLSearchParams(hash)
  if (fragment.get('state') !== flow.state || fragment.get('error')) throw new DriveAuthError()
  const token = fragment.get('access_token')
  const expiresIn = Number(fragment.get('expires_in'))
  if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) throw new DriveAuthError()
  if (!(fragment.get('scope') ?? '').split(' ').includes(DRIVE_SCOPE)) throw new DriveScopeError()
  return { token, expiresAt: now + expiresIn * 1000, account: accountOf(fragment.get('id_token'), clientId, flow.nonce) }
}

type Lock = <T>(task: () => Promise<T>) => Promise<T>
// Several new tabs can find the token expired at once; one renews it and the rest reuse the result.
const tokenLock: Lock = task => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('mnt.gdrive.token', task) as ReturnType<typeof task> : task()

export type GoogleAuth = DriveAuth & { signIn(): Promise<void>; signOut(): Promise<void> }

type AuthOptions = {
  clientId?: string; now?: () => number; lock?: Lock; firefox?: boolean
  /** Device-local storage for the signed-in account ID; it survives restarts so renewal keeps using that account. */
  local?: SessionArea
  /** Google returned a different account than the one this device synced with. */
  onAccountChange?: () => Promise<void>
}

export function createGoogleAuth(identity: Identity, session: SessionArea | undefined, { clientId = GOOGLE_CLIENT_ID, now = () => Date.now(), lock = tokenLock, firefox = isFirefoxExtension(), local, onAccountChange }: AuthOptions = {}): GoogleAuth {
  let memory: Cached | null = null
  const save = async (value: Cached | null) => {
    memory = value
    if (!session) return
    if (value) await session.set({ [TOKEN_KEY]: value })
    else await session.remove(TOKEN_KEY)
  }
  const cached = async (): Promise<Cached | null> => {
    const raw = session ? (await session.get(TOKEN_KEY))[TOKEN_KEY] as Partial<Cached> | undefined : memory
    return raw && typeof raw.token === 'string' && typeof raw.expiresAt === 'number' ? { token: raw.token, expiresAt: raw.expiresAt } : null
  }
  // Renew a minute early so a request never starts with a token about to lapse.
  const fresh = (value: Cached | null) => value && value.expiresAt - 60_000 > now() ? value.token : null
  const launch = async (interactive: boolean) => {
    if (!clientId) throw new Error('Google Drive sync is not configured in this build')
    const known = local ? (await local.get(ACCOUNT_KEY))[ACCOUNT_KEY] : undefined
    const flow: Flow = { state: crypto.randomUUID(), nonce: crypto.randomUUID(), account: typeof known === 'string' ? known : undefined }
    const details: FlowDetails = { url: authUrl(clientId, identity.getRedirectURL(), flow, interactive), interactive }
    // Google's silent page may redirect from script; Chromium would otherwise abort it on load. Firefox rejects these keys.
    if (!interactive && !firefox) Object.assign(details, { abortOnLoadForNonInteractive: false, timeoutMsForNonInteractive: 10_000 })
    let redirect: string | undefined
    try { redirect = await identity.launchWebAuthFlow(details) } catch { throw new DriveAuthError() }
    if (!redirect) throw new DriveAuthError()
    const { account, ...value } = parseAuthRedirect(redirect, flow, clientId, now())
    // A different account has a different Drive folder: what this device last agreed with no longer applies.
    if (flow.account && flow.account !== account) await onAccountChange?.()
    if (local && flow.account !== account) await local.set({ [ACCOUNT_KEY]: account })
    await save(value)
    return value.token
  }
  return {
    async token() {
      const current = fresh(await cached())
      if (current) return current
      return lock(async () => fresh(await cached()) ?? launch(false))
    },
    async invalidate(token) { if ((await cached())?.token === token) await save(null) },
    async signIn() { await launch(true) },
    async signOut() { await save(null) },
  }
}

/**
 * Ask for Drive network access, then sign in. The permission request is the first thing this does because browsers
 * only show it during the click; Firefox also asks for the matching data-collection consent.
 */
export function connectGoogleDrive(auth: Pick<GoogleAuth, 'signIn'>): Promise<boolean> {
  const permissions = extensionApi()?.permissions
  if (!permissions) return Promise.resolve(false)
  const request: Parameters<typeof permissions.request>[0] = { origins: [`${DRIVE_ORIGIN}/*`] }
  if (isFirefoxExtension()) request.data_collection = ['bookmarksInfo', 'authenticationInfo']
  return permissions.request(request).then(async granted => {
    if (!granted) return false
    try { await auth.signIn() } catch (error) { if (error instanceof DriveAuthError) return false; throw error }
    return true
  })
}
