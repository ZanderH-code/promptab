import { useEffect, useState } from 'react'
import { applyPack } from '../../core/ai/apply'
import { MAX_SAVED_THEMES, type SavedTheme } from '../../core/themes/library'
import { createAppThemeLibrary } from '../../app/useSettings'
import { useConfirm } from './ConfirmDialog'
import type { Ctx } from './rows/shared'

export function MyThemes({ ctx }: { ctx: Ctx }) {
  const [themes, setThemes] = useState<SavedTheme[]>([])
  const [busy, setBusy] = useState(false)
  const { confirm, dialog } = useConfirm()
  const library = createAppThemeLibrary()
  const refresh = () => library.read().then(setThemes).catch(() => ctx.onError({ key: 'error.loadSettings' }))
  useEffect(() => { void refresh() }, [])

  async function save() {
    const name = prompt(ctx.t('themes.namePrompt'), ctx.profile.custom.sourcePack?.name ?? ctx.profile.meta.name)
    if (!name?.trim()) return
    setBusy(true)
    try { await library.save(ctx.profile, name); await refresh() }
    catch { ctx.onError({ key: 'themes.saveFailed' }) }
    finally { setBusy(false) }
  }

  async function rename(theme: SavedTheme) {
    const name = prompt(ctx.t('themes.renamePrompt'), theme.name)
    if (!name?.trim()) return
    try { await library.rename(theme.id, name); await refresh() }
    catch { ctx.onError({ key: 'themes.saveFailed' }) }
  }

  async function remove(theme: SavedTheme) {
    if (!(await confirm({ title: ctx.t('themes.deleteConfirm', { name: theme.name }), confirmLabel: ctx.t('themes.delete'), cancelLabel: ctx.t('common.cancel'), danger: true }))) return
    try { await library.remove(theme.id); await refresh() }
    catch { ctx.onError({ key: 'themes.saveFailed' }) }
  }

  function apply(theme: SavedTheme) {
    try { ctx.store.getState().setPreview(ctx.profile.meta.id, applyPack(ctx.profile, theme.pack), theme.name) }
    catch { ctx.onError({ key: 'error.saveSettings' }) }
  }

  function exportTheme(theme: SavedTheme) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([JSON.stringify(theme.pack, null, 2)], { type: 'application/json' }))
    const slug = theme.name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'theme'
    link.download = `${slug}.theme-pack.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <section className="sd-theme-library" aria-labelledby="my-themes-title">
    <h3 id="my-themes-title">{ctx.t('themes.title')}</h3>
    <button type="button" className="sd-button" disabled={busy || themes.length >= MAX_SAVED_THEMES} onClick={() => void save()}>{ctx.t('themes.saveCurrent')}</button>
    <p className="sd-hint">{ctx.t('themes.count', { count: themes.length, max: MAX_SAVED_THEMES })}</p>
    <ul>{themes.map(theme => <li key={theme.id}>
      <strong>{theme.name}</strong>
      <div className="sd-css-actions">
        <button type="button" className="sd-button" onClick={() => apply(theme)}>{ctx.t('themes.apply')}</button>
        <button type="button" className="sd-button" onClick={() => void rename(theme)}>{ctx.t('themes.rename')}</button>
        <button type="button" className="sd-button" onClick={() => void remove(theme)}>{ctx.t('themes.delete')}</button>
        <button type="button" className="sd-button" onClick={() => exportTheme(theme)}>{ctx.t('themes.export')}</button>
      </div>
    </li>)}</ul>
    {dialog}
  </section>
}
