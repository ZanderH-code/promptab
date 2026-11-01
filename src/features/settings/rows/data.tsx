import { RotateCcw } from 'lucide-react'
import { BackupSection } from '../BackupSection'
import { ProfileSection } from '../ProfileSection'
import { BrowserBookmarkImport } from '../BrowserBookmarkImport'
import type { Ctx, Item } from './shared'

export function dataItems(ctx: Ctx): Item[] {
  const { t, s, store, onError, onReset } = ctx
  return [
    { id: 'profiles', keys: ['profile.heading', 'profile.active', 'profile.new', 'profile.rename', 'profile.delete', 'profile.history', 'profile.archived'], node: <ProfileSection store={store} t={t} language={s.language} /> },
    { id: 'backup', keys: ['settings.data', 'settings.dataHint', 'settings.export', 'settings.import'], node: <BackupSection settings={s} t={t} onError={onError} store={store} /> },
    { id: 'browser-bookmarks', keys: ['bookmarks.importTitle', 'bookmarks.importHint', 'bookmarks.chooseFolders', 'bookmarks.importSelected'], node: <BrowserBookmarkImport ctx={ctx} /> },
    {
      id: 'reset-all', keys: ['settings.reset'],
      node: <button type="button" className="sd-button sd-danger" onClick={() => { if (confirm(t('settings.confirmReset'))) onReset() }}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.reset')}</button>,
    },
  ]
}
