import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import type { Settings } from '../../core/model'
import { toMessageRef, type MessageKey, type MessageRef, type Translate } from '../../i18n'
import { createBackupV2Service, type ImportAnalysis } from '../../storage/backup-v2'
import type { BackupProfileSelection } from '../../core/backup-v2'
import { assets } from '../../app/useSettings'
import { createAppProfileStorage, createAppThemeLibrary, type AppProfileStore } from '../../app/useSettings'
import { useConfirm } from './ConfirmDialog'
import { SyncSection } from './SyncSection'

type Props = { settings: Settings; t: Translate; onError: (error: MessageRef) => void; recovery?: boolean; store?: AppProfileStore }

export function BackupSection({ settings, t, onError, recovery = false, store }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const [pending, setPending] = useState<{ json: string; analysis: ImportAnalysis; revision: number | null } | null>(null)
  const [selection, setSelection] = useState<BackupProfileSelection & { savedThemes: boolean }>({ bookmarks: true, appearance: true, layout: true, savedThemes: true, settings: true })
  const [undoState, setUndoState] = useState<{ id: string; revision: number | null } | null>(null)
  const { confirm, dialog } = useConfirm()
  const revision = store?.getState().revision ?? null

  async function exportFile() {
    setBusy(true)
    setStatus(null)
    try {
      const { persistence } = createAppProfileStorage()
      const json = await createBackupV2Service({ profiles: persistence, assets, themes: createAppThemeLibrary() }).exportBackup()
      const size = new Blob([json]).size / (1024 * 1024)
      if (size >= 10 && !(await confirm({ title: t('backup.largeExport', { size: size.toFixed(1) }), confirmLabel: t('common.continue'), cancelLabel: t('common.cancel') }))) return
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `promptab-${new Date().toISOString().slice(0, 10)}.json`
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
    setPending(null)
    let fallback: MessageKey = 'error.backupFile'
    try {
      const json = await file.text()
      const { persistence } = createAppProfileStorage()
      const service = createBackupV2Service({ profiles: persistence, assets, themes: createAppThemeLibrary() })
      const expectedRevision = recovery ? null : store?.getState().revision ?? revision
      fallback = 'error.loadSettings'
      const analysis = await service.analyzeBackup(json, expectedRevision, recovery)
      setSelection({ bookmarks: true, appearance: true, layout: true, savedThemes: true, settings: true })
      setPending({ json, analysis, revision: expectedRevision })
    } catch (error) {
      onError(toMessageRef(error, fallback))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function restore() {
    if (!pending) return
    const { json, analysis, revision: expectedRevision } = pending
    setBusy(true)
    try {
      const { persistence } = createAppProfileStorage()
      const service = createBackupV2Service({ profiles: persistence, assets, themes: createAppThemeLibrary() })
      const full = recovery || Object.values(selection).every(Boolean)
      if (!full) {
        if (!store) throw new Error('Profile store unavailable')
        await service.importPartial(json, expectedRevision, selection, store)
        setPending(null)
        setUndoState({ id: store.getState().activeProfileId, revision: store.getState().revision })
        setStatus('backup.imported')
        return
      }
      const count = analysis.format === 1
        ? JSON.parse(json).settings.shortcuts.length
        : profileCount(json, analysis.activeProfileId)
      const wallpaper = analysis.format === 1
        ? t(JSON.parse(json).wallpaper ? 'backup.withWallpaper' : 'backup.withoutWallpaper')
        : t(hasWallpaper(json) ? 'backup.withWallpaper' : 'backup.withoutWallpaper')
      const summary = {
        added: analysis.incoming.filter(item => !analysis.retained.includes(item.id)).length,
        retained: analysis.retained.length,
        archived: analysis.archived.length,
        restored: analysis.restored.length,
        assets: analysis.assetCount,
      }
      const accepted = await confirm({
        title: t('backup.confirmImport', { count, wallpaper, date: new Date(exportedAt(json)).toLocaleString(settings.language), ...summary }),
        body: analysis.format === 2 ? t('backup.importSummary', summary) : undefined,
        confirmLabel: t('common.continue'),
        cancelLabel: t('common.cancel'),
        danger: true,
      })
      if (!accepted) return
      if (recovery) {
        await persistence.recover()
        await service.importBackup(json, expectedRevision)
        window.location.reload()
      } else {
        if (!store) throw new Error('Profile store unavailable')
        await service.importFullIntoStore(json, expectedRevision, store)
        setPending(null)
        setUndoState({ id: store.getState().activeProfileId, revision: store.getState().revision })
        setStatus('backup.imported')
      }
    } catch (error) {
      onError(toMessageRef(error, 'error.saveSettings'))
    } finally {
      setBusy(false)
    }
  }

  async function undoRestore() {
    if (!store || !undoState) return
    setBusy(true)
    try {
      if (store.getState().revision !== undoState.revision || store.getState().activeProfileId !== undoState.id) throw new Error('Profile revision conflict')
      await store.getState().undo(undoState.id, undoState.revision)
      setUndoState(null)
      setStatus(null)
    } catch (error) { onError(toMessageRef(error, 'error.saveSettings')) }
    finally { setBusy(false) }
  }

  return (
    <>
      <section aria-labelledby="data-settings" aria-busy={busy}>
        <h3 id="data-settings">{t('settings.data')}</h3>
        <p>{t('settings.dataHint')}</p>
        <div className="backup-actions">
          {!recovery && <button className="reset" disabled={busy} onClick={() => void exportFile()}><Download size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.export')}</button>}
          <button className="reset" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={16} strokeWidth={1.5} aria-hidden="true" />{t('settings.import')}</button>
        </div>
        <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label={t('settings.import')} disabled={busy} onChange={event => void importFile(event.target.files?.[0])} />
        {pending && <div>
          {!recovery && <fieldset disabled={busy}>
            <legend>{t('backup.selectParts')}</legend>
            {(['bookmarks', 'appearance', 'layout', 'savedThemes', 'settings'] as const).map(key => <label key={key} style={{ display: 'block' }}>
              <input type="checkbox" checked={selection[key]} onChange={event => setSelection(value => ({ ...value, [key]: event.target.checked }))} /> {t(`backup.part.${key}`)}
            </label>)}
          </fieldset>}
          <button type="button" className="reset" disabled={busy || !Object.values(selection).some(Boolean)} onClick={() => void restore()}>{t('backup.restore')}</button>
          <button type="button" className="reset" disabled={busy} onClick={() => setPending(null)}>{t('backup.cancel')}</button>
        </div>}
        {status && <p role="status">{t(status)} {undoState && <button type="button" disabled={busy} onClick={() => void undoRestore()}>{t('undo.action')}</button>}</p>}
      </section>
      {!recovery && <SyncSection settings={settings} store={store} />}
      {dialog}
    </>
  )
}

function exportedAt(json: string): string {
  const value = JSON.parse(json)
  return value.exportedAt
}

function hasWallpaper(json: string): boolean {
  const value = JSON.parse(json)
  return value.profiles.some((profile: { background?: { type?: string } }) => ['image', 'video'].includes(profile.background?.type ?? ''))
}

function profileCount(json: string, id: string): number {
  const value = JSON.parse(json)
  const profile = value.profiles.find((item: { meta?: { id?: string } }) => item.meta?.id === id)
  return profile?.bookmarks?.groups?.flatMap((group: { items?: unknown[] }) => group.items ?? []).length ?? 0
}
