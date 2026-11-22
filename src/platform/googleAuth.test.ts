import { describe, expect, it, vi } from 'vitest'
import { DRIVE_SCOPE, DriveAuthError } from '../core/gdrive'
import { DriveScopeError, authUrl, createGoogleAuth, parseAuthRedirect } from './googleAuth'

const redirect = (fields: Record<string, string>) => `https://abc.chromiumapp.org/#${new URLSearchParams(fields)}`

describe('Google sign-in redirect', () => {
  it('asks for the Drive app folder only, silently or with an account picker', () => {
    const silent = new URL(authUrl('client', 'https://abc.chromiumapp.org/', 's1', false))
    expect(Object.fromEntries(silent.searchParams)).toMatchObject({ client_id: 'client', response_type: 'token', scope: DRIVE_SCOPE, state: 's1', prompt: 'none' })
    expect(new URL(authUrl('client', 'r', 's1', true)).searchParams.get('prompt')).toBe('select_account')
  })

  it('accepts only its own state, with a token and Drive access', () => {
    expect(parseAuthRedirect(redirect({ access_token: 't', expires_in: '3599', scope: DRIVE_SCOPE, state: 's' }), 's', 1000)).toEqual({ token: 't', expiresAt: 3_600_000 })
    expect(() => parseAuthRedirect(redirect({ access_token: 't', expires_in: '3599', scope: DRIVE_SCOPE, state: 'other' }), 's', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect({ error: 'interaction_required', state: 's' }), 's', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect({ access_token: 't', expires_in: '0', scope: DRIVE_SCOPE, state: 's' }), 's', 0)).toThrow(DriveAuthError)
    expect(() => parseAuthRedirect(redirect({ access_token: 't', expires_in: '3599', scope: 'openid', state: 's' }), 's', 0)).toThrow(DriveScopeError)
  })
})

describe('Google token cache', () => {
  function identity() {
    const launches: { url: string; interactive: boolean }[] = []
    return {
      launches,
      getRedirectURL: () => 'https://abc.chromiumapp.org/',
      launchWebAuthFlow: vi.fn(async (details: { url: string; interactive: boolean }) => {
        launches.push(details)
        const state = new URL(details.url).searchParams.get('state')!
        return redirect({ access_token: `t${launches.length}`, expires_in: '3600', scope: DRIVE_SCOPE, state })
      }),
    }
  }
  const session = () => { const data: Record<string, unknown> = {}; return { data, get: async (key: string) => (key in data ? { [key]: data[key] } : {}), set: async (items: Record<string, unknown>) => { Object.assign(data, items) }, remove: async (key: string) => { delete data[key] } } }
  const lock = <T,>(task: () => Promise<T>) => task()

  it('reuses a session token until a minute before expiry, then renews silently', async () => {
    const id = identity(), store = session()
    let time = 0
    const auth = createGoogleAuth(id, store, { clientId: 'client', now: () => time, lock, firefox: false })
    await auth.signIn()
    expect(id.launches[0].interactive).toBe(true)
    expect(await auth.token()).toBe('t1')
    // Another tab of the same browser session reads the shared session cache instead of signing in again.
    expect(await createGoogleAuth(id, store, { clientId: 'client', now: () => time, lock }).token()).toBe('t1')
    time = 3_540_001
    expect(await auth.token()).toBe('t2')
    expect(id.launches[1]).toMatchObject({ interactive: false, abortOnLoadForNonInteractive: false })
    await auth.invalidate('t2')
    expect(store.data['mnt.gdrive.token']).toBeUndefined()
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
