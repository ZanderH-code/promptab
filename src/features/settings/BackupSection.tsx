import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import type { Settings } from '../../core/model'
import { toMessageRef, type MessageKey, type MessageRef, type Translate } from '../../i18n'
import { createBackupV2Service } from '../../storage/backup-v2'
import { assets } from '../../app/useSettings'
import { createAppProfileStorage, type AppProfileStore } from '../../app/useSettings'

type Props = { settings: Settings; t: Translate; onError: (error: MessageRef) => void; recovery?: boolean; store?: AppProfileStore }

export function BackupSection({ settings, t, onError, recovery = false, store }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const revision = store?.getState().revision ?? null

  async function exportFile() {
    setBusy(true)
    setStatus(null)
    try {
      const { persistence } = createAppProfileStorage()
      const json = await createBackupV2Service({ profiles: persistence, assets }).exportBackup()
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
    let fallback: MessageKey = 'error.backupFile'
    try {
      const json = await file.text()
      const { persistence } = createAppProfileStorage()
      const service = createBackupV2Service({ profiles: persistence, assets })
      const expectedRevision = recovery ? null : store?.getState().revision ?? revision
      fallback = 'error.loadSettings'
      const analysis = await service.analyzeBackup(json, expectedRevision, recovery)
      const count = analysis.format === 1
        ? JSON.parse(json).settings.shortcuts.length
        : profileCount(json, analysis.activeProfileId)
      const wallpaper = analysis.format === 1
        ? t(JSON.parse(json).wallpaper ? 'backup.withWallpaper' : 'backup.withoutWallpaper')
        : t(hasWallpaper(json) ? 'backup.withWallpaper' : 'backup.withoutWallpaper')
      const accepted = confirm(t('backup.confirmImport', {
        count,
        wallpaper,
        date: new Date(exportedAt(json)).toLocaleString(settings.language),
        added: analysis.incoming.filter(item => !analysis.retained.includes(item.id)).length,
        retained: analysis.retained.length,
        archived: analysis.archived.length,
        restored: analysis.restored.length,
        assets: analysis.assetCount,
      }) + (analysis.format === 2 ? `\n${t('backup.importSummary', {
        added: analysis.incoming.filter(item => !analysis.retained.includes(item.id)).length,
        retained: analysis.retained.length,
        archived: analysis.archived.length,
        restored: analysis.restored.length,
        assets: analysis.assetCount,
      })}` : ''))
      if (!accepted) return
      fallback = 'error.saveSettings'
      if (recovery) await persistence.recover()
      await service.importBackup(json, expectedRevision)
      window.location.reload()
    } catch (error) {
      onError(toMessageRef(error, fallback))
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
        {!recovery && <button className="reset" disabled={busy} onClick={() => void exportFile()}><Download size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.export')}</button>}
        <button className="reset" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.import')}</button>
      </div>
      <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label={t('settings.import')} disabled={busy} onChange={event => void importFile(event.target.files?.[0])} />
      {status && <p role="status">{t(status)}</p>}
    </section>
  )
}

function exportedAt(json: string): string {
  const value = JSON.parse(json)
  return value.exportedAt
}

function hasWallpaper(json: string): boolean {
  const value = JSON.parse(json)
  return value.profiles.some((profile: { background?: { type?: string } }) => profile.background?.type === 'image')
}

function profileCount(json: string, id: string): number {
  const value = JSON.parse(json)
  const profile = value.profiles.find((item: { meta?: { id?: string } }) => item.meta?.id === id)
  return profile?.bookmarks?.groups?.flatMap((group: { items?: unknown[] }) => group.items ?? []).length ?? 0
}
