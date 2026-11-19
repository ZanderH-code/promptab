import { flushSync } from 'react-dom'

/** True when the person asked for less motion, in the app or in their system settings. */
export function prefersReducedMotion(): boolean {
  const setting = document.documentElement.dataset.reduceMotion
  if (setting === 'on') return true
  if (setting === 'off') return false
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

let running: Promise<void> | null = null

/**
 * Resolves once no page cross-fade is running. While one runs the page is covered by its snapshots, so hit
 * tests (such as the settings-entry check after custom CSS is applied) must wait for it.
 */
export function pageTransitionDone(): Promise<void> {
  return running ?? Promise.resolve()
}

/**
 * Runs a synchronous store update that changes how the whole page looks (a theme preview, apply or undo) as a
 * short cross-fade. The update is flushed inside the transition so the new snapshot shows it; without view
 * transitions, or with reduced motion, it simply runs.
 */
export function transitionPage(update: () => void): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion() || document.visibilityState !== 'visible') { update(); return }
  try {
    const transition = document.startViewTransition(() => { flushSync(update) })
    const done: Promise<void> = transition.finished.then(() => undefined, () => undefined).finally(() => { if (running === done) running = null })
    running = done
  } catch { update() }
}
