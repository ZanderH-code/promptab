import { useSyncExternalStore } from 'react'

export type MediaPreference = 'system' | 'on' | 'off'

type MediaStore = { subscribe: (onChange: () => void) => () => void; matches: () => boolean }
const stores = new Map<string, MediaStore>()

/** One stable store per query, so every subscriber shares one MediaQueryList and renders read a property, not matchMedia. */
function mediaStore(query: string): MediaStore {
  let store = stores.get(query)
  if (!store) {
    let list: MediaQueryList | undefined
    const media = () => (list ??= window.matchMedia?.(query))
    store = {
      subscribe: onChange => {
        const current = media()
        current?.addEventListener?.('change', onChange)
        return () => current?.removeEventListener?.('change', onChange)
      },
      matches: () => !!media()?.matches,
    }
    stores.set(query, store)
  }
  return store
}

/** `on`/`off` override the system; `system` follows the media query live, including later changes. */
export function useMediaPreference(preference: MediaPreference, query: string) {
  const { subscribe, matches } = mediaStore(query)
  const system = useSyncExternalStore(subscribe, matches, () => false)
  return preference === 'on' || (preference === 'system' && system)
}

export const useReducedMotion = (preference: MediaPreference) => useMediaPreference(preference, '(prefers-reduced-motion: reduce)')
export const useReducedTransparency = (preference: MediaPreference) => useMediaPreference(preference, '(prefers-reduced-transparency: reduce)')
