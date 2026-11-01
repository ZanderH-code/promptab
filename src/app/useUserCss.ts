import { useEffect, useRef } from 'react'
import { checkSettingsEntry, type EntryCheck } from '../core/css/reach'
import type { ProfileV2 } from '../core/schema/profile'
import { assets } from './useSettings'

export const USER_CSS_ID = 'mnt-user-css'

type Failure = Extract<EntryCheck, { ok: false }>
type Options = {
  profile: ProfileV2 | null
  /** Safe mode keeps user CSS out of the page entirely. */
  safe: boolean
  /** True once the page has rendered its settings entry; the visibility check needs it. */
  ready: boolean
  /** The CSS made the settings entry unusable and was removed again. */
  onUnreachable: (failure: Failure, css: string) => void
  /** The CSS is applied and the settings entry is still usable. */
  onReachable: (css: string) => void
}

/** Waits for layout; falls back to a timer because background tabs throttle animation frames. */
const settled = () => new Promise<void>(resolve => {
  const timer = setTimeout(resolve, 250)
  requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve() }))
})

/**
 * Injects the sanitized user CSS (already wrapped in `@layer user`) and verifies afterwards that the
 * settings entry is still reachable. Invalid CSS, disabled CSS and safe mode inject nothing.
 */
export function useUserCss({ profile, safe, ready, onUnreachable, onReachable }: Options) {
  const callbacks = useRef({ onUnreachable, onReachable })
  callbacks.current = { onUnreachable, onReachable }
  const css = profile?.custom.css ?? ''
  const enabled = profile?.custom.cssEnabled ?? false

  useEffect(() => {
    if (!ready || safe || !enabled || !css.trim()) return
    let alive = true
    const objectUrls: string[] = []
    const style = document.createElement('style')
    style.id = USER_CSS_ID
    void (async () => {
      const { resolveCssAssets, sanitizeCss } = await import('../core/css/sanitize')
      if (!alive) return
      const result = sanitizeCss(css)
      if (!result.ok || !result.layered) return
      const resolved = new Map<string, string>()
      for (const reference of result.assets) {
        const blob = await assets.get(reference).catch(() => undefined)
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        objectUrls.push(url)
        resolved.set(reference, url)
      }
      if (!alive) { objectUrls.forEach(URL.revokeObjectURL); return }
      style.textContent = resolveCssAssets(result.layered, resolved)
      document.head.append(style)
      await settled()
      if (!alive) return
      const check = checkSettingsEntry()
      if (check.ok) callbacks.current.onReachable(css)
      else { style.remove(); callbacks.current.onUnreachable(check, css) }
    })()
    return () => { alive = false; style.remove(); objectUrls.forEach(URL.revokeObjectURL) }
  }, [css, enabled, safe, ready])
}
