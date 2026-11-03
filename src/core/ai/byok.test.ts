import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendByok } from './byok'

const input = { provider: 'openai' as const, model: 'test-model', key: 'secret-test-key', prompt: 'test prompt' }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('BYOK requests', () => {
  it('does not contact a provider when permission is refused', async () => {
    const request = vi.fn().mockResolvedValue(false)
    const fetch = vi.fn()
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request } })
    vi.stubGlobal('fetch', fetch)
    await expect(sendByok(input)).rejects.toThrow('permission')
    expect(request).toHaveBeenCalledWith({ origins: ['https://api.openai.com/*'] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requests Firefox data consent with the provider permission', async () => {
    const request = vi.fn().mockResolvedValue(false)
    vi.stubGlobal('browser', { runtime: { getURL: vi.fn() }, permissions: { request } })
    await expect(sendByok(input)).rejects.toThrow('permission')
    expect(request).toHaveBeenCalledWith({
      origins: ['https://api.openai.com/*'],
      data_collection: ['authenticationInfo', 'personalCommunications'],
    })
  })

  it('sends only the requested prompt and rejects key echoes', async () => {
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: vi.fn().mockResolvedValue(true) } })
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: input.key } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await expect(sendByok(input)).rejects.toThrow('response')
    const [url, options] = fetch.mock.calls[0]
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions')
    expect(options.redirect).toBe('error')
    expect(options.credentials).toBe('omit')
    expect(JSON.parse(options.body).messages).toEqual([{ role: 'user', content: input.prompt }])
  })

  it('sends Anthropic requests through its official SDK', async () => {
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: vi.fn().mockResolvedValue(true) } })
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: '{"kind":"mnt.theme-pack"}' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    expect(await sendByok({ ...input, provider: 'anthropic' })).toContain('mnt.theme-pack')
    expect(String(fetch.mock.calls[0][0])).toBe('https://api.anthropic.com/v1/messages')
    expect(fetch.mock.calls[0][1].redirect).toBe('error')
  })

  it('uses the direct-browser header and skips extension permissions on the web', async () => {
    vi.stubGlobal('chrome', undefined)
    vi.stubGlobal('browser', undefined)
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model', content: [{ type: 'text', text: '{"kind":"mnt.theme-pack"}' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    expect(await sendByok({ ...input, provider: 'anthropic' })).toContain('mnt.theme-pack')
    expect(new Headers(fetch.mock.calls[0][1].headers).get('anthropic-dangerous-direct-browser-access')).toBe('true')
  })

  it('does not send if cancelled while waiting for permission', async () => {
    let allow!: (value: boolean) => void
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: () => new Promise<boolean>(resolve => { allow = resolve }) } })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    const promise = sendByok({ ...input, signal: controller.signal })
    controller.abort()
    allow(true)
    await expect(promise).rejects.toThrow('cancelled')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('cancels an in-flight request without exposing its error', async () => {
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: vi.fn().mockResolvedValue(true) } })
    const started = vi.fn()
    vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      started()
      options.signal?.addEventListener('abort', () => reject(new Error(input.key)))
    })))
    const controller = new AbortController()
    const promise = sendByok({ ...input, signal: controller.signal })
    await vi.waitFor(() => expect(started).toHaveBeenCalled())
    controller.abort()
    await expect(promise).rejects.toThrow('cancelled')
  })

  it('blocks a request containing the API key before requesting permission', async () => {
    const request = vi.fn()
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request } })
    await expect(sendByok({ ...input, prompt: `Do not send ${input.key}` })).rejects.toThrow('input')
    expect(request).not.toHaveBeenCalled()
  })

  it('classifies authentication and rate errors without provider text', async () => {
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: vi.fn().mockResolvedValue(true) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(input.key, { status: 401 })))
    await expect(sendByok(input)).rejects.toThrow('auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(input.key, { status: 429 })))
    await expect(sendByok(input)).rejects.toThrow('rate')
  })

  it('rejects large responses and provider errors without leaking secrets', async () => {
    vi.stubGlobal('chrome', { runtime: { getURL: vi.fn() }, permissions: { request: vi.fn().mockResolvedValue(true) } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(600000))))
    await expect(sendByok(input)).rejects.toThrow('response')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(input.key, { status: 401 })))
    await expect(sendByok(input)).rejects.not.toThrow(input.key)
  })
})
