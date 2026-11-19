import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Shortcut } from '../core/model'
import { translate } from '../i18n'
import { ShortcutLink } from './ShortcutGridContent'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)
const item = { id: 'a', name: 'Example', url: 'https://example.com', icon: 'E', color: '#123456' } as Shortcut

/** jsdom has no PointerEvent, so give a mouse event the touch pointer type the long press looks for. */
const touchDown = (target: Element) => {
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 10 })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  fireEvent(target, event)
}

it('opens the menu on a long press, and not once the tile unmounted mid-press', () => {
  vi.useFakeTimers()
  const onContextMenu = vi.fn()
  const link = () => <ShortcutLink item={item} iconColor="per-site" openInNewTab={false} liftOnHover={false} t={t} onContextMenu={onContextMenu} />
  const view = render(link())
  touchDown(screen.getByRole('link'))
  vi.advanceTimersByTime(1000)
  expect(onContextMenu).toHaveBeenCalledTimes(1)
  touchDown(screen.getByRole('link'))
  view.unmount()
  vi.advanceTimersByTime(1000)
  expect(onContextMenu).toHaveBeenCalledTimes(1)
})
