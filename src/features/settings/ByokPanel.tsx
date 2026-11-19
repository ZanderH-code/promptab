import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MODELS, sendByok, type ByokProvider } from '../../core/ai/byok'
import type { MessageKey } from '../../i18n'
import type { Ctx } from './rows'

const errors: Record<string, MessageKey> = { permission: 'ai.byok.permission', auth: 'ai.byok.auth', rate: 'ai.byok.rate', timeout: 'ai.byok.timeout', response: 'ai.byok.response', refusal: 'ai.byok.refusal', input: 'ai.byok.input' }

export type AiMethod = 'chat' | 'api'
type Saved = { method: AiMethod; provider: ByokProvider; models: Record<ByokProvider, string> }

const SAVED_KEY = 'promptab.ai.connection'
const PROVIDERS: ByokProvider[] = ['anthropic', 'openai']

/** The chosen method, provider and model are remembered on this device. The API key never is. */
function readSaved(): Saved {
  const fallback: Saved = { method: 'chat', provider: 'anthropic', models: { ...DEFAULT_MODELS } }
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null')
    if (!value || typeof value !== 'object') return fallback
    const { method, provider, models } = value as Partial<Saved>
    return {
      method: method === 'api' ? 'api' : 'chat',
      provider: PROVIDERS.includes(provider as ByokProvider) ? provider as ByokProvider : 'anthropic',
      models: Object.fromEntries(PROVIDERS.map(name => {
        const model = models && typeof models === 'object' ? (models as Record<string, unknown>)[name] : undefined
        return [name, typeof model === 'string' && model.length <= 200 ? model : DEFAULT_MODELS[name]]
      })) as Record<ByokProvider, string>,
    }
  } catch { return fallback }
}

/**
 * How the workbench reaches an AI: by copy and paste through a chat the person already uses, or straight to a
 * provider with their own key. The key lives only in this component's state and is gone when the panel closes.
 */
export function useAiConnection() {
  const [saved, setSaved] = useState(readSaved)
  const [key, setKey] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { pending.current?.abort(); pending.current = null }, [])

  const save = (patch: Partial<Saved>) => setSaved(current => {
    const next = { ...current, ...patch }
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* Remembering is a convenience only. */ }
    return next
  })
  const model = saved.models[saved.provider]
  const ready = !!model.trim() && !!key.trim()

  function send(prompt: string, onReply: (reply: string) => void) {
    if (pending.current || !ready) return
    const controller = new AbortController()
    pending.current = controller
    setSending(true)
    setError(null)
    try {
      const request = sendByok({ provider: saved.provider, model: model.trim(), key: key.trim(), prompt, signal: controller.signal })
      void request.then(reply => {
        if (pending.current === controller && !controller.signal.aborted) onReply(reply)
      }).catch((cause: unknown) => {
        if (pending.current === controller && !controller.signal.aborted) setError(cause instanceof Error ? errors[cause.message] ?? 'ai.byok.error' : 'ai.byok.error')
      }).finally(() => {
        if (pending.current === controller) { pending.current = null; setSending(false) }
      })
    } catch {
      pending.current = null
      setSending(false)
      setError('ai.byok.error')
    }
  }

  function cancel() {
    pending.current?.abort()
    pending.current = null
    setSending(false)
  }

  return {
    method: saved.method, setMethod: (method: AiMethod) => { cancel(); setError(null); save({ method }) },
    provider: saved.provider, setProvider: (provider: ByokProvider) => save({ provider }),
    model, setModel: (value: string) => save({ models: { ...saved.models, [saved.provider]: value } }),
    key, setKey, ready, sending, error, send, cancel,
  }
}

export type AiConnection = ReturnType<typeof useAiConnection>

/** Provider, model and key fields, with what sending shares folded under a disclosure. */
export function ByokFields({ ctx, connection }: { ctx: Ctx; connection: AiConnection }) {
  const { t } = ctx
  const { provider, setProvider, model, setModel, key, setKey, sending } = connection
  return <div className="sd-ai-byok">
    <div className="sd-ai-fields">
      <div>
        <label className="sd-label" htmlFor="byok-provider">{t('ai.byok.provider')}</label>
        <select id="byok-provider" className="sd-input" value={provider} disabled={sending} onChange={event => setProvider(event.target.value as ByokProvider)}>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>
      <div>
        <label className="sd-label" htmlFor="byok-model">{t('ai.byok.model')}</label>
        <input id="byok-model" className="sd-input" value={model} disabled={sending} autoComplete="off" spellCheck={false} placeholder={provider === 'openai' ? 'gpt-…' : undefined} onChange={event => setModel(event.target.value)} />
      </div>
    </div>
    <label className="sd-label" htmlFor="byok-key">{t('ai.byok.key')}</label>
    <input id="byok-key" className="sd-input" type="password" value={key} disabled={sending} autoComplete="off" spellCheck={false} onChange={event => setKey(event.target.value)} />
    <details className="sd-ai-more">
      <summary>{t('ai.byok.privacy')}</summary>
      <p className="sd-hint">{t('ai.byok.description')}</p>
      <p className="sd-hint">{t('ai.byok.domains')} <code>api.anthropic.com</code> / <code>api.openai.com</code></p>
      <p className="sd-hint">{t('ai.byok.data')}</p>
    </details>
  </div>
}
