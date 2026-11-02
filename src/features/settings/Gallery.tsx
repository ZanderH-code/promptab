import { useEffect, useState, type CSSProperties } from 'react'
import { z } from 'zod'
import { analyzeCandidate } from '../../core/ai/analyze'
import { MAX_GALLERY_BYTES, validateGalleryPack } from '../../core/gallery/catalog'
import { deriveTokens } from '../../core/tokens/derive'
import type { ProfileV2 } from '../../core/schema/profile'
import type { Ctx } from './rows'

const BASE = 'https://zanderh-code.github.io/promptab/gallery/'
const CACHE = 'promptab.gallery.index.v1'
const MAX_BYTES = 512 * 1024
const label = z.object({ en: z.string().min(1).max(500), 'zh-CN': z.string().min(1).max(500) }).strict()
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
const entry = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80), name: z.string().min(1).max(100), author: z.string().min(1).max(100),
  tags: z.array(z.string().min(1).max(50)).max(20), prompt: label,
  colors: z.object({ bg: color, surface: color, text: color, accent: color }).strict(),
  mode: z.enum(['light', 'dark']), file: z.string(),
}).strict().refine(value => value.file === `packs/${value.id}.json`)
const indexSchema = z.object({ version: z.literal(1), packs: z.array(entry).max(100) }).strict()
type GalleryIndex = z.infer<typeof indexSchema>

async function getText(path: string, signal: AbortSignal, maxBytes = MAX_BYTES): Promise<string> {
  const url = new URL(path, BASE)
  const response = await fetch(url, { signal, credentials: 'omit', redirect: 'error' })
  if (!response.ok || (response.url && response.url !== url.href)) throw new Error('fetch failed')
  if (Number(response.headers.get('content-length')) > maxBytes || !response.body) throw new Error('too large')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new Error('too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function validatedPack(text: string, profile: ProfileV2, language: Ctx['s']['language']) {
  const value: unknown = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
  if (validateGalleryPack(value).length) throw new Error('invalid pack')
  const record = value as Record<string, unknown>
  if (!record.meta || typeof record.meta !== 'object' || Array.isArray(record.meta)) throw new Error('metadata')
  const { prompt, tags, ...meta } = record.meta as Record<string, unknown>
  label.parse(prompt)
  z.array(z.string().min(1).max(50)).max(20).parse(tags)
  const clean = { ...record, meta }
  const source = JSON.stringify(clean)
  const analysis = analyzeCandidate({ lang: 'json', code: source }, profile, language)
  if (!analysis.pack || analysis.problems.length || analysis.warnings.some(w => w.kind === 'unknown-key')) throw new Error('invalid pack')
  return { source, analysis }
}

export function Gallery({ ctx, profile, onSelect }: { ctx: Ctx; profile: ProfileV2; onSelect: (source: string, analysis: ReturnType<typeof analyzeCandidate>) => void }) {
  const [index, setIndex] = useState<GalleryIndex | null>(null)
  const [stale, setStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'gallery.error' | 'gallery.invalid' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState('')
  const [failedItem, setFailedItem] = useState<z.infer<typeof entry> | null>(null)
  const { t } = ctx
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    void getText('index.json', controller.signal).then(text => {
      const next = indexSchema.parse(JSON.parse(text))
      setIndex(next); setStale(false)
      try { localStorage.setItem(CACHE, JSON.stringify(next)) } catch { /* The gallery still works without storage. */ }
    }).catch(() => {
      if (controller.signal.aborted) return
      try { setIndex(indexSchema.parse(JSON.parse(localStorage.getItem(CACHE) || 'null'))); setStale(true) }
      catch { setIndex(null); setError('gallery.error') }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  async function select(item: z.infer<typeof entry>) {
    setError(null); setFailedItem(null); setLoading(true)
    let text: string
    try { text = await getText(item.file, new AbortController().signal, MAX_GALLERY_BYTES) }
    catch (cause) { setError(cause instanceof Error && cause.message === 'too large' ? 'gallery.invalid' : 'gallery.error'); setFailedItem(item); setLoading(false); return }
    try {
      const result = validatedPack(text, profile, ctx.s.language)
      onSelect(result.source, result.analysis)
    } catch { setError('gallery.invalid'); setFailedItem(item) }
    finally { setLoading(false) }
  }
  return <section className="sd-ai-step" aria-label={t('gallery.open')}>
    {loading && <p role="status">{t('gallery.loading')}</p>}
    {stale && <p role="status">{t('gallery.stale')} <button type="button" className="sd-button" onClick={() => setAttempt(n => n + 1)}>{t('gallery.retry')}</button></p>}
    {error && <p role="alert">{t(error)} <button type="button" className="sd-button" onClick={() => failedItem ? void select(failedItem) : setAttempt(n => n + 1)}>{t('gallery.retry')}</button></p>}
    {index && <div className="sd-gallery">{index.packs.map(item => {
      const tokens = deriveTokens(item.colors, item.mode)
      return <article key={item.id}>
        <button type="button" className="sd-preset" disabled={loading} onClick={() => void select(item)}>
          <span className="sd-preset-card" style={tokens as CSSProperties}><span className="sd-preset-title">Aa</span><span className="sd-preset-panel"><span className="sd-preset-line" /><span className="sd-preset-dot" /></span></span>
          <span className="sd-preset-name" data-user-content>{item.name}</span>
        </button>
        <p data-user-content>{item.author} · {item.tags.join(' · ')}</p>
        <p>{t('gallery.prompt')}: <span data-user-content>{item.prompt[ctx.s.language]}</span></p>
        <button type="button" className="sd-button" onClick={() => { void navigator.clipboard.writeText(item.prompt[ctx.s.language]).then(() => setCopied(item.id)).catch(() => ctx.onError({ key: 'ai.copyFailed' })) }}>{t('gallery.copy')}</button>
        {copied === item.id && <span role="status">{t('gallery.copied')}</span>}
      </article>
    })}</div>}
  </section>
}
