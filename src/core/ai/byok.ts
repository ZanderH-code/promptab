import Anthropic from '@anthropic-ai/sdk'
import { extensionApi, isExtensionEnvironment, isFirefoxExtension } from '../../platform/extension'

export type ByokProvider = 'anthropic' | 'openai'
type Input = { provider: ByokProvider; model: string; key: string; prompt: string; signal?: AbortSignal }
const origins: Record<ByokProvider, string> = { anthropic: 'https://api.anthropic.com', openai: 'https://api.openai.com' }
const MAX_RESPONSE = 512 * 1024

async function boundedFetch(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...options, redirect: 'error', credentials: 'omit' })
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE || !response.body) throw new Error('response')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_RESPONSE) { await reader.cancel(); throw new Error('response') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers })
}

export async function sendByok(input: Input): Promise<string> {
  const origin = origins[input.provider]
  if (!origin || !input.key.trim() || !input.model.trim() || !input.prompt.trim() || input.prompt.length > 100000 || input.prompt.includes(input.key)) throw new Error('input')
  const extension = isExtensionEnvironment()
  const permissions = extensionApi()?.permissions
  if (extension && !permissions) throw new Error('permission')
  if (permissions && extension) {
    // Keep every browser permission request in the click handler before the first await.
    const permissionRequest = { origins: [`${origin}/*`] as string[] }
    if (isFirefoxExtension()) Object.assign(permissionRequest, { data_collection: ['authenticationInfo', 'personalCommunications'] })
    let granted: boolean
    try { granted = await permissions.request(permissionRequest) }
    catch { throw new Error('permission') }
    if (!granted) throw new Error('permission')
  }
  if (input.signal?.aborted) throw new Error('cancelled')
  const controller = new AbortController()
  const cancel = () => controller.abort()
  input.signal?.addEventListener('abort', cancel, { once: true })
  if (input.signal?.aborted) controller.abort()
  let timedOut = false
  const timeout = setTimeout(() => { timedOut = true; cancel() }, 90000)
  try {
    let result: string
    if (input.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: input.key, baseURL: origin, dangerouslyAllowBrowser: true, maxRetries: 0, fetch: boundedFetch })
      const response = await client.messages.create({ model: input.model, max_tokens: 16000, messages: [{ role: 'user', content: input.prompt }] }, { signal: controller.signal })
      if (response.stop_reason !== 'end_turn') throw new Error('response')
      result = response.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
    } else {
      const response = await boundedFetch(`${origin}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${input.key}` }, body: JSON.stringify({ model: input.model, messages: [{ role: 'user', content: input.prompt }] }), signal: controller.signal })
      if (response.status === 401 || response.status === 403) throw new Error('auth')
      if (response.status === 429) throw new Error('rate')
      if (!response.ok) throw new Error('provider')
      const data: unknown = await response.json()
      const message = (data as { choices?: { message?: { content?: unknown }; finish_reason?: string }[] }).choices?.[0]
      if (message?.finish_reason !== 'stop' && message?.finish_reason !== undefined) throw new Error('response')
      result = typeof message?.message?.content === 'string' ? message.message.content : ''
    }
    if (!result.trim() || result.includes(input.key)) throw new Error('response')
    return result
  } catch (error) {
    if (controller.signal.aborted) throw new Error(timedOut ? 'timeout' : 'cancelled')
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new Error('auth')
    if (error instanceof Anthropic.RateLimitError) throw new Error('rate')
    if (error instanceof Error && ['response', 'auth', 'rate'].includes(error.message)) throw new Error(error.message)
    throw new Error('provider')
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', cancel)
  }
}
