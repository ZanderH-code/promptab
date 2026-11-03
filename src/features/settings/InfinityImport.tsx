import { useRef, useState } from 'react'
import { MAX_BACKUP_JSON_CHARS } from '../../core/backup-v2'
import { parseInfinityBackup, type InfinityImportResult, type InfinityNotice } from '../../core/infinity/import'
import type { MessageKey } from '../../i18n'
import type { ProfileV2 } from '../../core/schema/profile'
import type { Ctx } from './rows/shared'

const noticeKey: Record<InfinityNotice, MessageKey> = {
  wallpaper: 'infinity.noticeWallpaper',
  weather: 'infinity.noticeWeather',
  services: 'infinity.noticeServices',
}

function mergeQuickLinks(current: ProfileV2['bookmarks']['groups'], incoming: ProfileV2['bookmarks']['groups']) {
  const existingQuick = current.find(group => group.builtinName === 'quick-links')
  const importedQuick = incoming.find(group => group.builtinName === 'quick-links')
  const importedOther = incoming.filter(group => group.builtinName !== 'quick-links')
  if (!existingQuick || !importedQuick) return [...current, ...importedOther, ...(importedQuick && !existingQuick ? [importedQuick] : [])]
  const urls = new Set(existingQuick.items.map(item => item.url))
  const additions = importedQuick.items.filter(item => !urls.has(item.url))
  return current.map(group => group === existingQuick ? { ...group, items: [...group.items, ...additions] } : group).concat(importedOther)
}

export function InfinityImport({ ctx }: { ctx: Ctx }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const [pending, setPending] = useState<InfinityImportResult | null>(null)

  async function readFile(file?: File) {
    if (!file) return
    setBusy(true)
    setStatus(null)
    setPending(null)
    try {
      if (file.size > MAX_BACKUP_JSON_CHARS) throw new Error('File exceeds the backup size limit')
      setPending(parseInfinityBackup(await file.text(), ctx.profile))
    } catch {
      setStatus('infinity.invalid')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function apply(replaceBookmarks: boolean) {
    if (!pending) return
    const imported = pending.profile
    ctx.change(current => ({
      ...structuredClone(imported),
      meta: { ...current.meta, ...imported.meta, updatedAt: new Date().toISOString() },
      bookmarks: {
        ...imported.bookmarks,
        groups: replaceBookmarks ? imported.bookmarks.groups : mergeQuickLinks(current.bookmarks.groups, imported.bookmarks.groups),
      },
    }), 'import')
    setPending(null)
    setStatus('infinity.imported')
  }

  return <section className="sd-note" aria-busy={busy}>
    <strong>{ctx.t('infinity.title')}</strong>
    <p>{ctx.t('infinity.hint')}</p>
    <button type="button" className="sd-button" disabled={busy} onClick={() => input.current?.click()}>{ctx.t('infinity.chooseFile')}</button>
    <input ref={input} className="visually-hidden" type="file" accept="application/json,.json,.infinity" aria-label={ctx.t('infinity.chooseFile')} disabled={busy} onChange={event => void readFile(event.target.files?.[0])} />
    {pending && <div className="sd-note" role="group" aria-label={ctx.t('infinity.preview')}>
      <p role="note">{ctx.t('infinity.summary', { groups: pending.summary.groups, links: pending.summary.links, engines: pending.summary.engines, todos: pending.summary.todos, notes: pending.summary.notes, skipped: pending.summary.skipped })}</p>
      {pending.summary.notices.length > 0 && <ul aria-label={ctx.t('infinity.notices')}>
        {pending.summary.notices.map(notice => <li key={notice}>{ctx.t(noticeKey[notice])}</li>)}
      </ul>}
      <div className="sd-widget-actions">
        <button type="button" className="sd-button" onClick={() => apply(false)}>{ctx.t('infinity.add')}</button>
        <button type="button" className="sd-button" onClick={() => apply(true)}>{ctx.t('infinity.replace')}</button>
      </div>
    </div>}
    {status && <p role="status">{ctx.t(status)}</p>}
  </section>
}
