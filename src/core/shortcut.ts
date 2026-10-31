import { normalizeUrl } from './favicon'
import type { Shortcut } from './model'

/** Turns an editor draft into a storable shortcut, or null when the name or URL is unusable. */
export function finishShortcut(draft: Shortcut): Shortcut | null {
  const url = normalizeUrl(draft.url)
  const name = draft.name.trim()
  if (!name || !url) return null
  return { ...draft, url, icon: draft.icon.trim() || name.slice(0, 1).toUpperCase() }
}
