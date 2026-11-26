import { useRef, useState, type DragEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import type { Settings } from '../../core/model'
import { MAX_BACKUP_JSON_CHARS, type BackupProfileSelection, type BookmarkMergeMode } from '../../core/backup-v2'
import { MessageError, toMessageRef, type MessageKey, type MessageRef, type Translate } from '../../i18n'
import { createBackupV2Service, type ImportAnalysis } from '../../storage/backup-v2'
import { assets } from '../../app/useSettings'
import { createAppProfileStorage, createAppThemeLibrary, type AppProfileStore } from '../../app/useSettings'
import { useConfirm } from './ConfirmDialog'
import { SyncSection } from './SyncSection'
import { downloadJson } from '../../ui/download'
import '../../i18n/lazy'

type Props = { settings: Settings; t: Translate; onError: (error: MessageRef) => void; recovery?: boolean; store?: AppProfileStore }

export function BackupSection({ settings, t, onError, recovery = false, store }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const [pending, setPending] = useState<{ json: string; analysis: ImportAnalysis; revision: number | null } | null>(null)
  const [selection, setSelection] = useState<BackupProfileSelection & { savedThemes: boolean }>({ bookmarks: true, appearance: true, layout: true, savedThemes: true, settings: true })
  const [mode, setMode] = useState<BookmarkMergeMode>('replace')
  const [dragover, setDragover] = useState(false)
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
      downloadJson(json, `promptab-${new Date().toISOString().slice(0, 10)}.json`)
      setStatus('backup.exported')
    } catch (error) {
      onError(toMessageRef(error, 'error.export'))
    } finally {
      setBusy(false)
    }
  }

  /** The picker, a dropped file and a pasted string all reach analyzeBackup, which applies the backup limits. */
  async function analyze(read: () => Promise<string>) {
    setBusy(true)
    setStatus(null)
    setPending(null)
    let fallback: MessageKey = 'error.backupFile'
    try {
      const json = await read()
      const { persistence } = createAppProfileStorage()
      const service = createBackupV2Service({ profiles: persistence, assets, themes: createAppThemeLibrary() })
      const expectedRevision = recovery ? null : store?.getState().revision ?? revision
      fallback = 'error.loadSettings'
      const analysis = await service.analyzeBackup(json, expectedRevision, recovery)
      setSelection({ bookmarks: true, appearance: true, layout: true, savedThemes: true, settings: true })
      setMode('replace')
      setPending({ json, analysis, revision: expectedRevision })
    } catch (error) {
      onError(toMessageRef(error, fallback))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function importFile(file?: File) {
    if (!file) return
    await analyze(async () => {
      // UTF-8 needs at most three bytes per UTF-16 code unit, so a larger file cannot be under the character limit.
      if (file.size > MAX_BACKUP_JSON_CHARS * 3) throw new MessageError('error.settingsInvalid')
      return file.text()
    })
  }

  function hasFiles(event: DragEvent<HTMLElement>): boolean {
    return event.dataTransfer.types.includes('Files')
  }

  function dragEnter(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) return
    event.preventDefault()
    setDragover(true)
  }

  function dragOver(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDragover(true)
  }

  function dragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragover(false)
  }

  function drop(event: DragEvent<HTMLElement>) {
    if (!hasFiles(event)) return
    event.preventDefault()
    setDragover(false)
    void importFile(event.dataTransfer.files[0])
  }

  async function restore() {
    if (!pending) return
    const { json, analysis, revision: expectedRevision } = pending
    setBusy(true)
    try {
      const { persistence } = createAppProfileStorage()
      const service = createBackupV2Service({ profiles: persistence, assets, themes: createAppThemeLibrary() })
      const appendBookmarks = !recovery && selection.bookmarks && mode === 'append'
      // Appending is always a partial restore: the backup's profiles are not adopted wholesale.
      const full = recovery || (!appendBookmarks && Object.values(selection).every(Boolean))
      if (!full) {
        if (!store) throw new Error('Profile store unavailable')
        const append = appendBookmarks ? analysis.bookmarkAppend : null
        const accepted = await confirm({
          title: append
            ? t('backup.confirmAppend', { groups: append.groups, links: append.links, duplicates: append.duplicates })
            : t('backup.confirmPartial'),
          confirmLabel: t('common.continue'),
          cancelLabel: t('common.cancel'),
          danger: true,
        })
        if (!accepted) return
        await service.importPartial(json, expectedRevision, selection, store, { bookmarks: appendBookmarks ? 'append' : 'replace' })
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

  const append = !recovery && selection.bookmarks && mode === 'append' ? pending?.analysis.bookmarkAppend : null

  return (
    <>
      <section
        aria-labelledby="data-settings" aria-busy={busy} className="backup-section" data-dragover={dragover ? 'true' : undefined}
        onDragEnter={dragEnter} onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop}
      >
        <h3 id="data-settings">{t('settings.data')}</h3>
        <p>{t('settings.dataHint')}</p>
        <div
          className="backup-drop" tabIndex={0} role="group" aria-label={t('backup.dropLabel')} data-dragover={dragover ? 'true' : undefined}
          onPaste={event => {
            const json = event.clipboardData.getData('text')
            if (!json) return
            event.preventDefault()
            void analyze(async () => json)
          }}
        >
          <p>{t('backup.dropHint')}</p>
        </div>
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
            <fieldset disabled={busy || !selection.bookmarks}>
              <legend>{t('backup.bookmarksMode')}</legend>
              <label style={{ display: 'block' }}>
                <input type="radio" name="backup-bookmarks-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> {t('backup.mode.replace')}
              </label>
              <label style={{ display: 'block' }}>
                <input type="radio" name="backup-bookmarks-mode" checked={mode === 'append'} onChange={() => setMode('append')} /> {t('backup.mode.append')}
              </label>
              {append && <p className="sd-range-hint">{t('backup.appendSummary', append)}</p>}
            </fieldset>
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
