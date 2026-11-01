/** Why the settings entry cannot be used, or ok when a person can see and click it. */
export type EntryCheck = { ok: true } | { ok: false; reason: 'missing' | 'hidden' | 'offscreen' | 'covered' }

export const SETTINGS_ENTRY_SELECTOR = '.mnt-settings-entry'
/** The app's own overlays (drawer, dialogs, menus, toasts). They may sit over the entry; only page content must not. */
const APP_LAYERS = '.drawer, .modal-backdrop, .scrim, .context-menu, .dropdown-content, .undo-toast, .error'
const MIN_SIZE = 8
const MIN_OPACITY = 0.1

/**
 * Checks the settings entry through layout and computed style: it exists, has a real size, is neither
 * `display: none`, hidden nor transparent (including through ancestors), lies inside the viewport, and is
 * the element hit at its own centre (so nothing paints over it).
 */
export function checkSettingsEntry(doc: Document = document): EntryCheck {
  const view = doc.defaultView
  const entry = doc.querySelector<HTMLElement>(SETTINGS_ENTRY_SELECTOR)
  if (!view || !entry) return { ok: false, reason: 'missing' }
  let opacity = 1
  for (let node: Element | null = entry; node; node = node.parentElement) {
    const style = view.getComputedStyle(node)
    if (style.display === 'none') return { ok: false, reason: 'hidden' }
    if (node === entry && (style.visibility === 'hidden' || style.visibility === 'collapse' || style.pointerEvents === 'none')) return { ok: false, reason: 'hidden' }
    opacity *= style.opacity === '' ? 1 : Number(style.opacity)
  }
  if (!(opacity >= MIN_OPACITY)) return { ok: false, reason: 'hidden' }
  const rect = entry.getBoundingClientRect()
  if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return { ok: false, reason: 'hidden' }
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
  if (x < 0 || y < 0 || x > view.innerWidth || y > view.innerHeight) return { ok: false, reason: 'offscreen' }
  const top = doc.elementsFromPoint(x, y).find(element => !element.closest(APP_LAYERS))
  return top && entry.contains(top) ? { ok: true } : { ok: false, reason: 'covered' }
}
