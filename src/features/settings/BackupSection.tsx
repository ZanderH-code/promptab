import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { parseBackup, restoreBackup, serializeBackup } from '../../core/backup'
import type { Settings } from '../../core/model'
import { toMessageRef, type MessageKey, type MessageRef, type Translate } from '../../i18n'
import { readWallpaper } from '../../storage/wallpaper'

type Props = { settings: Settings; t: Translate; onError: (error: MessageRef) => void }

export function BackupSection({ settings, t, onError }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)

  async function exportFile() {
    setBusy(true)
    setStatus(null)
    try {
      const json = await serializeBackup(settings, await readWallpaper())
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `minimal-new-tab-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('backup.exported')
    } catch (error) {
      onError(toMessageRef(error, 'error.export'))
    } finally {
      setBusy(false)
    }
  }

  async function importFile(file?: File) {
    if (!file) return
    setBusy(true)
    setStatus(null)
    try {
      const backup = parseBackup(await file.text())
      const accepted = confirm(t('backup.confirmImport', {
        count: backup.settings.shortcuts.length,
        wallpaper: t(backup.wallpaper ? 'backup.withWallpaper' : 'backup.withoutWallpaper'),
        date: new Date(backup.exportedAt).toLocaleString(settings.language),
      }))
      if (!accepted) return
      await restoreBackup(backup)
      window.location.reload()
    } catch (error) {
      onError(toMessageRef(error, 'error.backupFile'))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <section aria-labelledby="data-settings" aria-busy={busy}>
      <h3 id="data-settings">{t('settings.data')}</h3>
      <p>{t('settings.dataHint')}</p>
      <div className="backup-actions">
        <button className="reset" disabled={busy} onClick={() => void exportFile()}><Download size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.export')}</button>
        <button className="reset" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.import')}</button>
      </div>
      <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label={t('settings.import')} disabled={busy} onChange={event => void importFile(event.target.files?.[0])} />
      {status && <p role="status">{t(status)}</p>}
    </section>
  )
}
