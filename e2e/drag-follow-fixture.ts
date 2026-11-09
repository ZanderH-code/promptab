import { expect, type Page } from '@playwright/test'

export type FollowFrame = { t: number; delta: number | null; visible: boolean; error: number | null }

/**
 * Installs a rAF sampler. Every frame records the cursor, the pointer delta since press, whether a
 * dragged visual exists, and the distance between that visual's centre and
 * (cursor − grab offset + half the visual's own size). Sampling runs after the frame callbacks, so
 * dnd-kit's committed position is what gets measured.
 */
export async function installFollowSampler(page: Page) {
  await page.evaluate(() => {
    type Down = { id: string | null; x: number; y: number; left: number; top: number }
    type State = { frames: FollowFrame[]; cursor: { x: number; y: number } | null; down: Down | null; running: boolean }
    type FollowFrame = { t: number; delta: number | null; visible: boolean; error: number | null }
    const state: State = { frames: [], cursor: null, down: null, running: false }
    ;(window as unknown as { __follow: State }).__follow = state
    const setCursor = (x: number, y: number) => { state.cursor = { x, y } }
    const press = (target: Element | null, x: number, y: number) => {
      const node = target?.closest?.('[data-sortable-id]') as HTMLElement | null
      if (!node) { state.down = null; return }
      const rect = node.getBoundingClientRect()
      state.down = { id: node.getAttribute('data-sortable-id'), x, y, left: rect.left, top: rect.top }
    }
    window.addEventListener('pointermove', event => setCursor(event.clientX, event.clientY), true)
    window.addEventListener('pointerdown', event => press(event.target as Element | null, event.clientX, event.clientY), true)
    window.addEventListener('touchmove', event => { const touch = event.touches[0]; if (touch) setCursor(touch.clientX, touch.clientY) }, true)
    window.addEventListener('touchstart', event => {
      const touch = event.touches[0]
      if (touch) { setCursor(touch.clientX, touch.clientY); press(event.target as Element | null, touch.clientX, touch.clientY) }
    }, true)
    const sample = () => {
      const overlay = document.querySelector('.mnt-drag-overlay')
      const moving = overlay?.parentElement ?? document.querySelector('[data-sortable-id][data-dragging="true"]')
      const frame: FollowFrame = { t: performance.now(), delta: null, visible: !!moving, error: null }
      if (state.cursor && state.down) frame.delta = Math.hypot(state.cursor.x - state.down.x, state.cursor.y - state.down.y)
      if (moving && state.cursor && state.down) {
        const rect = moving.getBoundingClientRect()
        const expectedX = state.cursor.x - (state.down.x - state.down.left) + rect.width / 2
        const expectedY = state.cursor.y - (state.down.y - state.down.top) + rect.height / 2
        frame.error = Math.hypot(rect.left + rect.width / 2 - expectedX, rect.top + rect.height / 2 - expectedY)
      }
      state.frames.push(frame)
    }
    const tick = () => { if (!state.running) return; requestAnimationFrame(tick); setTimeout(sample, 0) }
    ;(window as unknown as { __followStart: () => void }).__followStart = () => {
      state.frames = []; state.cursor = null; state.down = null; state.running = true; requestAnimationFrame(tick)
    }
    ;(window as unknown as { __followStop: () => FollowFrame[] }).__followStop = () => { state.running = false; return state.frames }
  })
}

export const startFollow = (page: Page) => page.evaluate(() =>
  (window as unknown as { __followStart: () => void }).__followStart())
export const stopFollow = (page: Page): Promise<FollowFrame[]> => page.evaluate(() =>
  (window as unknown as { __followStop: () => FollowFrame[] }).__followStop())

/**
 * Waits in-page for the drag overlay, i.e. for the touch sensor's 350 ms delay to activate. A
 * locator visibility poll can resolve hundreds of milliseconds late under load, which lets Chrome's
 * native long-press menu fire before the test's first move cancels it; an rAF poll resolves on the
 * frame the overlay mounts.
 */
export const waitForDragStart = (page: Page) => page.waitForFunction(() => !!document.querySelector('.mnt-drag-overlay'), undefined, { polling: 'raf', timeout: 3000 })

/**
 * Waits until dnd-kit has processed the last move with the intended item as `over`: the sortable
 * placeholder is displaced onto the target's layout slot. Touch release before this point can end
 * the drag with a stale `over` and silently lose the drop, so this is a real signal rather than a
 * longer sleep. (Theme scale is 1 in these tests, so transform lengths are CSS px.)
 */
export async function waitForOver(page: Page, activeId: string, overId: string, timeout = 4000) {
  await expect.poll(() => page.evaluate(({ activeId, overId }) => {
    const escape = (value: string) => CSS.escape(value)
    const active = document.querySelector(`[data-sortable-id="${escape(activeId)}"]`)
    const over = document.querySelector(`[data-sortable-id="${escape(overId)}"]`)
    if (!active || !over) return null
    const a = active.getBoundingClientRect(), o = over.getBoundingClientRect()
    const matrix = getComputedStyle(over).transform
    const values = matrix && matrix !== 'none' ? matrix.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number) : null
    return Math.hypot(a.left - (o.left - (values?.[4] ?? 0)), a.top - (o.top - (values?.[5] ?? 0)))
  }, { activeId, overId }), { timeout }).toBeLessThan(4)
}

/**
 * Asserts the follow contract over the sampled frames. The activation window (pointer delta ≤ 12 px,
 * the sensor's 6 px plus one step's worth) is excluded because the visual does not exist yet.
 * `gap` additionally requires that at most one consecutive active frame has nothing under the cursor.
 */
export function assertFollow(frames: FollowFrame[], limit: number, { gap = false } = {}) {
  const active = frames.filter(frame => frame.delta !== null && frame.delta > 12)
  expect(active.length, 'sampled active frames').toBeGreaterThan(10)
  const errors = active.map(frame => frame.error).filter((error): error is number => typeof error === 'number')
  // Every active frame must have a measurable visual: a missing one is a dropped frame, not a pass.
  expect(errors.length, 'frames with a dragged visual').toBe(active.length)
  expect(Math.max(...errors), 'max follow error').toBeLessThan(limit)
  expect(Math.max(...errors)).toBeGreaterThanOrEqual(0)
  if (gap) {
    let run = 0, longest = 0
    for (const frame of active) { run = frame.visible ? 0 : run + 1; longest = Math.max(longest, run) }
    expect(longest, 'consecutive frames with nothing under the cursor').toBeLessThanOrEqual(1)
  }
  return Math.max(...errors)
}
