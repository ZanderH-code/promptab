import { useEffect, useRef, useState } from 'react'
import { sendByok } from '../../core/ai/byok'
import type { MessageKey } from '../../i18n'
import type { Ctx } from './rows'

const errors: Record<string, MessageKey> = { permission: 'ai.byok.permission', auth: 'ai.byok.auth', rate: 'ai.byok.rate', timeout: 'ai.byok.timeout', response: 'ai.byok.response', input: 'ai.byok.input' }

export function ByokPanel({ ctx, prompt, onReply }: { ctx: Ctx; prompt: string; onReply: (reply: string) => void }) {
  const { t } = ctx
  const [provider, setProvider] = useState<'anthropic' | 'openai'>('anthropic')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<MessageKey | null>(null)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => () => { pending.current?.abort(); pending.current = null }, [])

  function send() {
    if (pending.current || !model.trim() || !key.trim()) return
    const controller = new AbortController()
    pending.current = controller
    setSending(true)
    setError(null)
    try {
      const request = sendByok({ provider, model: model.trim(), key: key.trim(), prompt, signal: controller.signal })
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

  return <section className="sd-ai-step" aria-labelledby="byok-title">
    <h4 id="byok-title">{t('ai.byok.title')}</h4>
    <p className="sd-hint">{t('ai.byok.description')}</p>
    <p className="sd-hint">{t('ai.byok.domains')} <code>api.anthropic.com</code> / <code>api.openai.com</code></p>
    <p className="sd-hint">{t('ai.byok.data')}</p>
    <label className="sd-label" htmlFor="byok-provider">{t('ai.byok.provider')}</label>
    <select id="byok-provider" className="sd-input" value={provider} disabled={sending} onChange={event => setProvider(event.target.value as 'anthropic' | 'openai')}>
      <option value="anthropic">Anthropic</option>
      <option value="openai">OpenAI</option>
    </select>
    <label className="sd-label" htmlFor="byok-model">{t('ai.byok.model')}</label>
    <input id="byok-model" className="sd-input" value={model} disabled={sending} autoComplete="off" onChange={event => setModel(event.target.value)} />
    <label className="sd-label" htmlFor="byok-key">{t('ai.byok.key')}</label>
    <input id="byok-key" className="sd-input" type="password" value={key} disabled={sending} autoComplete="off" spellCheck={false} onChange={event => setKey(event.target.value)} />
    <div className="sd-css-actions">
      <button id="byok-send-button" type="button" className="sd-button" disabled={sending || !model.trim() || !key.trim()} onClick={send}>{t('ai.byok.send')}</button>
      {sending && <button type="button" className="sd-button" onClick={cancel}>{t('ai.byok.cancel')}</button>}
    </div>
    {sending && <p role="status">{t('ai.byok.sending')}</p>}
    {error && <p className="sd-ai-problem" role="alert">{t(error)}</p>}
  </section>
}
