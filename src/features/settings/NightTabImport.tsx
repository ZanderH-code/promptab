import { useRef, useState } from 'react'
import { parseNightTabBackup } from '../../core/nighttab/import'
import type { MessageKey } from '../../i18n'
import { useConfirm } from './ConfirmDialog'
import type { Ctx } from './rows/shared'

export function NightTabImport({ ctx }: { ctx: Ctx }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const { confirm, dialog } = useConfirm()

  async function importFile(file?: File) {
    if (!file) return
    setBusy(true)
    setStatus(null)
    setWarnings([])
    try {
      const result = parseNightTabBackup(await file.text(), ctx.profile)
      const summary = ctx.t('nighttab.confirmImport', { count: result.count, groups: result.profile.bookmarks.groups.length - ctx.profile.bookmarks.groups.length, warnings: result.warnings.length })
      if (!(await confirm({ title: summary, confirmLabel: ctx.t('common.continue'), cancelLabel: ctx.t('common.cancel'), danger: true }))) return
      ctx.change(() => result.profile, 'import')
      setWarnings(result.warnings)
      setStatus('nighttab.imported')
    } catch { setStatus('nighttab.invalid') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }

  return <section className="sd-note" aria-busy={busy}>
    <strong>{ctx.t('nighttab.title')}</strong>
    <p>{ctx.t('nighttab.hint')}</p>
    <button type="button" className="sd-button" disabled={busy} onClick={() => input.current?.click()}>{ctx.t('nighttab.chooseFile')}</button>
    <input ref={input} className="visually-hidden" type="file" accept="application/json,.json" aria-label={ctx.t('nighttab.chooseFile')} disabled={busy} onChange={event => void importFile(event.target.files?.[0])} />
    {status && <p role="status">{ctx.t(status)}</p>}
    {warnings.length > 0 && <ul aria-label={ctx.t('nighttab.warnings')}>{warnings.map((warning, index) => <li key={`${warning}-${index}`} data-user-content>{warning}</li>)}</ul>}
    {dialog}
  </section>
}
