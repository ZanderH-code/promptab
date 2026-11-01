import { useCallback, useEffect, useState } from 'react'

const HASH = '#safe'
const ESCAPE_PRESSES = 3
const ESCAPE_WINDOW_MS = 1500

/**
 * Safe mode pauses user CSS for this page. It starts from `#safe` or three quick Esc presses and ends only
 * through the banner, so a broken stylesheet can always be escaped.
 */
export function useSafeMode() {
  const [safe, setSafe] = useState(() => location.hash === HASH)

  const enter = useCallback(() => {
    if (location.hash !== HASH) history.replaceState(null, '', location.pathname + location.search + HASH)
    setSafe(true)
  }, [])
  const exit = useCallback(() => {
    if (location.hash === HASH) history.replaceState(null, '', location.pathname + location.search)
    setSafe(false)
  }, [])

  useEffect(() => {
    const onHash = () => setSafe(location.hash === HASH)
    let presses: number[] = []
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      const now = Date.now()
      presses = [...presses.filter(time => now - time < ESCAPE_WINDOW_MS), now]
      if (presses.length >= ESCAPE_PRESSES) { presses = []; enter() }
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', onKeyDown) }
  }, [enter])

  return { safe, enter, exit }
}
