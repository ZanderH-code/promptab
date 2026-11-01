import { useState } from 'react'
import { appendImportedBookmarkGroups, collectBookmarkFolders, importBookmarkFolders, type BookmarkFolder, type BookmarkNode } from '../../core/bookmarks/import'
import type { MessageKey } from '../../i18n'
import type { Ctx } from './rows/shared'

type BookmarkApi = {
  getTree: () => Promise<BookmarkNode[]>
}
type PermissionsApi = {
  request: (details: { permissions: string[] }) => Promise<boolean>
  contains?: (details: { permissions: string[] }) => Promise<boolean>
}
type ChromeApi = { bookmarks?: BookmarkApi; permissions?: PermissionsApi }

type Props = { ctx: Ctx }

const chromeApi = () => (window as Window & { chrome?: ChromeApi }).chrome

export function BrowserBookmarkImport({ ctx }: Props) {
  const [folders, setFolders] = useState<BookmarkFolder[]>([])
  const [tree, setTree] = useState<BookmarkNode[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<MessageKey | null>(null)
  const available = !!chromeApi()?.permissions?.request && !!chromeApi()?.bookmarks?.getTree

  const openPicker = async () => {
    const api = chromeApi()
    if (!api?.bookmarks || !api.permissions) return
    setBusy(true)
    setStatus(null)
    try {
      const alreadyGranted = api.permissions.contains ? await api.permissions.contains({ permissions: ['bookmarks'] }) : false
      const granted = alreadyGranted || await api.permissions.request({ permissions: ['bookmarks'] })
      if (!granted) { setStatus('bookmarks.permissionDenied'); return }
      const tree = await api.bookmarks.getTree()
      setTree(tree)
      setFolders(collectBookmarkFolders(tree))
      setSelected([])
    } catch { setStatus('bookmarks.loadFailed') }
    finally { setBusy(false) }
  }

  const importSelected = () => {
    if (!selected.length) return
    setBusy(true)
    try {
      if (!tree.length) { setStatus('bookmarks.loadFailed'); return }
      const groups = importBookmarkFolders(tree, selected, new Set(ctx.profile.bookmarks.groups.flatMap(group => group.items.map(item => item.url))))
      if (!groups.length) { setStatus('bookmarks.nothingFound'); return }
      ctx.change(profile => appendImportedBookmarkGroups(profile, groups), 'import')
      setStatus('bookmarks.imported')
      setFolders([])
      setSelected([])
    } finally { setBusy(false) }
  }

  return <div className="sd-note" data-testid="browser-bookmark-import">
    <strong>{ctx.t('bookmarks.importTitle')}</strong>
    {!available
      ? <p>{ctx.t('bookmarks.unavailable')}</p>
      : <>
        <p>{ctx.t('bookmarks.importHint')}</p>
        <button type="button" className="sd-button" disabled={busy} onClick={() => void openPicker()}>{ctx.t('bookmarks.chooseFolders')}</button>
        {folders.length > 0 && <div role="group" aria-label={ctx.t('bookmarks.folderList')}>
          {folders.map(folder => <label key={folder.id} className="sd-check-row"><input type="checkbox" checked={selected.includes(folder.id)} onChange={event => setSelected(current => event.target.checked ? [...current, folder.id] : current.filter(id => id !== folder.id))} />{folder.path} ({folder.count})</label>)}
          <button type="button" className="sd-button" disabled={busy || selected.length === 0} onClick={importSelected}>{ctx.t('bookmarks.importSelected')}</button>
        </div>}
      </>}
    {status && <p role="status">{ctx.t(status)}</p>}
  </div>
}

