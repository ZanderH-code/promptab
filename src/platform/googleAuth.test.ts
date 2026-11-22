import { describe, expect, it, vi } from 'vitest'
import { DRIVE_SCOPE, DriveAuthError } from '../core/gdrive'
import { DriveScopeError, authUrl, createGoogleAuth, parseAuthRedirect } from './googleAuth'

const base64url = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const idToken = (claims: Record<string, unknown>) => `${base64url({ alg: 'RS256' })}.${base64url({ iss: 'https://accounts.google.com', aud: 'client', ...claims })}.sig`
const redirect = (fields: Record<string, string>) => `https://abc.chromiumapp.org/#${new URLSearchParams(fields)}`
const flow = { state: 's', nonce: 'n' }
const grant = (extra: Record<string, string> = {}) => ({ access_token: 't', expires_in: '3599', scope: `openid ${DRIVE_SCOPE}`, state: 's', id_token: idToken({ sub: 'user-1', nonce: 'n' }), ...extra })

describe('Google sign-in redirect', () => {
  it('asks for the account ID and the Drive app folder only, silently on the known account or with a picker', () => {
    const silent = new URL(authUrl('client', 'https://abc.chromiumapp.org/', { ...flow, account: 'user-1' }, false))
    expect(Object.fromEntries(silent.searchParams)).toMatchObject({ client_id: 'client', response_type: 'token id_token', scope: `openid ${DRIVE_SCOPE}`, state: 's', nonce: 'n', prompt: 'none', login_hint: 'user-1' })
    const interactive = new URL(authUrl('client', 'r', { ...flow, account: 'user-1' }, true)).searchParams
    expect(interactive.get('prompt')).toBe('select_account')
    expect(interactive.has('login_hint')).toBe(false)
  })

  it('accepts only its own state and nonce, with a token, an account and Drive access', () => {
    expect(parseAuthRedirect(redirect(grant()), flow, 'client', 1000)).toEqual({ token: 't', expiresAt: 3_600_000, account: 'user-1' })
    expect(() => parseAuthRedirect(redirect(grant({ state: 'other' })), flow, 'client', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect({ error: 'interaction_required', state: 's' }), flow, 'client', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect(grant({ expires_in: '0' })), flow, 'client', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect(grant({ id_token: idToken({ sub: 'user-1', nonce: 'replayed' }) })), flow, 'client', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect(grant({ id_token: idToken({ sub: 'user-1', nonce: 'n', aud: 'someone-else' }) })), flow, 'client', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect(grant({ scope: 'openid' })), flow, 'client', 0)).toThrow(DriveScopeError)
  })
})

describe('Google token cache', () => {
  function identity(accounts: string[] = []) {
    const launches: { url: string; interactive: boolean }[] = []
    return {
      launches,
      getRedirectURL: () => 'https://abc.chromiumapp.org/',
      launchWebAuthFlow: vi.fn(async (details: { url: string; interactive: boolean }) => {
        launches.push(details)
        const params = new URL(details.url).searchParams
        const sub = accounts[launches.length - 1] ?? 'user-1'
        return redirect({ access_token: `t${launches.length}`, expires_in: '3600', scope: `openid ${DRIVE_SCOPE}`, state: params.get('state')!, id_token: idToken({ sub, nonce: params.get('nonce') }) })
      }),
    }
  }
  const area = () => { const data: Record<string, unknown> = {}; return { data, get: async (key: string) => (key in data ? { [key]: data[key] } : {}), set: async (items: Record<string, unknown>) => { Object.assign(data, items) }, remove: async (key: string) => { delete data[key] } } }
  const lock = <T,>(task: () => Promise<T>) => task()

  it('reuses a session token until a minute before expiry, then renews silently on the same account', async () => {
    const id = identity(), session = area(), local = area()
    let time = 0
    const auth = createGoogleAuth(id, session, { clientId: 'client', now: () => time, lock, firefox: false, local })
    await auth.signIn()
    expect(id.launches[0].interactive).toBe(true)
    expect(local.data['mnt.gdrive.account']).toBe('user-1')
    expect(await auth.token()).toBe('t1')
    // Another tab of the same browser session reads the shared session cache instead of signing in again.
    expect(await createGoogleAuth(id, session, { clientId: 'client', now: () => time, lock }).token()).toBe('t1')
    time = 3_540_001
    expect(await auth.token()).toBe('t2')
    expect(id.launches[1]).toMatchObject({ interactive: false, abortOnLoadForNonInteractive: false })
    expect(new URL(id.launches[1].url).searchParams.get('login_hint')).toBe('user-1')
    await auth.invalidate('t2')
    expect(session.data['mnt.gdrive.token']).toBeUndefined()
  })

  it('reports a different Google account so the device does not trust its old sync base', async () => {
    const local = area()
    const onAccountChange = vi.fn(async () => {})
    const auth = createGoogleAuth(identity(['user-1', 'user-2']), area(), { clientId: 'client', lock, firefox: false, local, onAccountChange })
    await auth.signIn()
    expect(onAccountChange).not.toHaveBeenCalled()
    await auth.signOut()
    await auth.token()
    expect(onAccountChange).toHaveBeenCalledTimes(1)
    expect(local.data['mnt.gdrive.account']).toBe('user-2')
  })

  it('passes no Chromium-only options to Firefox and maps a failed silent renewal to sign-in required', async () => {
    const id = identity()
    const auth = createGoogleAuth(id, undefined, { clientId: 'client', lock, firefox: true })
    await auth.token()
    expect(Object.keys(id.launches[0]).sort()).toEqual(['interactive', 'url'])
    id.launchWebAuthFlow.mockRejectedValueOnce(new Error('User interaction required.'))
    await auth.invalidate('t1')
    await expect(auth.token()).rejects.toBeInstanceOf(DriveAuthError)
  })

  it('refuses to start without a client ID', async () => {
    await expect(createGoogleAuth(identity(), undefined, { clientId: '', lock }).signIn()).rejects.toThrow('not configured')
  })
})
