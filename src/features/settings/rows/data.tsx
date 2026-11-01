import { RotateCcw } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { ProfileSection } from '../ProfileSection'
import type { Ctx, Item } from './shared'

const BackupSection = lazy(() => import('../BackupSection').then(module => ({ default: module.BackupSection })))
const BrowserBookmarkImport = lazy(() => import('../BrowserBookmarkImport').then(module => ({ default: module.BrowserBookmarkImport })))
const NightTabImport = lazy(() => import('../NightTabImport').then(module => ({ default: module.NightTabImport })))

export function dataItems(ctx: Ctx): Item[] {
  const { t, s, store, onError, onReset } = ctx
  return [
    { id: 'profiles', keys: ['profile.heading', 'profile.active', 'profile.new', 'profile.rename', 'profile.delete', 'profile.history', 'profile.archived'], node: <ProfileSection store={store} t={t} language={s.language} /> },
    { id: 'backup', keys: ['settings.data', 'settings.dataHint', 'settings.export', 'settings.import'], node: <Suspense fallback={null}><BackupSection settings={s} t={t} onError={onError} store={store} /></Suspense> },
    { id: 'browser-bookmarks', keys: ['bookmarks.importTitle', 'bookmarks.importHint', 'bookmarks.chooseFolders', 'bookmarks.importSelected'], node: <Suspense fallback={null}><BrowserBookmarkImport ctx={ctx} /></Suspense> },
    { id: 'nighttab-import', keys: ['nighttab.title', 'nighttab.hint', 'nighttab.chooseFile'], node: <Suspense fallback={null}><NightTabImport ctx={ctx} /></Suspense> },
    {
      id: 'reset-all', keys: ['settings.reset'],
      node: <button type="button" className="sd-button sd-danger" onClick={() => { if (confirm(t('settings.confirmReset'))) onReset() }}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.reset')}</button>,
    },
  ]
}
