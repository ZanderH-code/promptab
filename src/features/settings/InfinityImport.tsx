import { useRef, useState } from 'react'
import { MAX_BACKUP_JSON_CHARS } from '../../core/backup-v2'
import { applyInfinityBackup, parseInfinityBackup, type InfinityImportResult, type InfinityNotice } from '../../core/infinity/import'
import type { MessageKey } from '../../i18n'
import type { Ctx } from './rows/shared'

const noticeKey: Record<InfinityNotice, MessageKey> = {
  wallpaper: 'infinity.noticeWallpaper',
  weather: 'infinity.noticeWeather',
  services: 'infinity.noticeServices',
}

export function InfinityImport({ ctx }: { ctx: Ctx }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const [pending, setPending] = useState<{ json: string; result: InfinityImportResult } | null>(null)

  async function readFile(file?: File) {
    if (!file) return
    setBusy(true)
    setStatus(null)
    setPending(null)
    try {
      if (file.size > MAX_BACKUP_JSON_CHARS) throw new Error('File exceeds the backup size limit')
      const json = await file.text()
      setPending({ json, result: parseInfinityBackup(json, ctx.profile) })
    } catch {
      setStatus('infinity.invalid')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function apply(replaceBookmarks: boolean) {
    if (!pending) return
    ctx.change(current => applyInfinityBackup(pending.json, current, replaceBookmarks), 'import')
    setPending(null)
    setStatus('infinity.imported')
  }

  return <section className="sd-note" aria-busy={busy}>
    <strong>{ctx.t('infinity.title')}</strong>
    <p>{ctx.t('infinity.hint')}</p>
    <button type="button" className="sd-button" disabled={busy} onClick={() => input.current?.click()}>{ctx.t('infinity.chooseFile')}</button>
    <input ref={input} className="visually-hidden" type="file" accept="application/json,.json,.infinity" aria-label={ctx.t('infinity.chooseFile')} disabled={busy} onChange={event => void readFile(event.target.files?.[0])} />
    {pending && <div className="sd-note" role="group" aria-label={ctx.t('infinity.preview')}>
      <p role="note">{ctx.t('infinity.summary', { groups: pending.result.summary.groups, links: pending.result.summary.links, engines: pending.result.summary.engines, todos: pending.result.summary.todos, notes: pending.result.summary.notes, skipped: pending.result.summary.skipped })}</p>
      {pending.result.summary.notices.length > 0 && <ul aria-label={ctx.t('infinity.notices')}>
        {pending.result.summary.notices.map(notice => <li key={notice}>{ctx.t(noticeKey[notice])}</li>)}
      </ul>}
      <div className="sd-widget-actions">
        <button type="button" className="sd-button" onClick={() => apply(false)}>{ctx.t('infinity.add')}</button>
        <button type="button" className="sd-button" onClick={() => apply(true)}>{ctx.t('infinity.replace')}</button>
      </div>
    </div>}
    {status && <p role="status">{ctx.t(status)}</p>}
  </section>
}
