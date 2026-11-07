import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import { ICON_CACHE_KEY } from '../core/favicon'
import { WebsiteIcon } from './WebsiteIcon'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }

/**
 * Commits the DOM outside act, then fires the image event in a MutationObserver microtask.
 * That runs after the commit but before React's passive mount effects, which is the race
 * that happens when a cached image is already decoded in the renderer's memory cache.
 */
async function renderBeforeEffects(element: React.ReactElement, event: 'load' | 'error') {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const fired = new Promise<void>(resolve => {
    const observer = new MutationObserver(() => {
      const image = container.querySelector('img')
      if (!image) return
      observer.disconnect()
      image.dispatchEvent(new Event(event))
      resolve()
    })
    observer.observe(container, { childList: true, subtree: true })
  })
  root.render(element)
  await fired
  await new Promise(resolve => setTimeout(resolve, 20))
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
  return { container, root }
}

async function unmount(root: ReturnType<typeof createRoot>, container: HTMLElement) {
  await act(async () => root.unmount())
  container.remove()
}

const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E', iconMode: 'text' as const }
afterEach(() => {
  cleanup()
  localStorage.clear()
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
})

it('renders a selected Lucide icon without flashing its letter', async () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'lucide', iconName: 'house' } as never} />)
  // The catalog chunk is still loading: a blank placeholder, never the letter.
  expect(container.querySelector('svg.lucide-house')).toBeNull()
  expect(container.textContent).toBe('')
  await waitFor(() => expect(container.querySelector('svg.lucide-house')).toBeTruthy())
  expect(screen.queryByText('lucide:house')).toBeNull()
})

it('falls back to text when a Lucide name is not in the catalog', async () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'lucide', iconName: 'not-a-real-lucide-icon' } as never} />)
  expect(container.textContent).toBe('')
  await waitFor(() => expect(container.textContent).toBe('E'))
  expect(container.querySelector('svg')).toBeNull()
})

it('renders a saved brand path without loading the catalog', async () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'brand', iconName: 'github', brand: { slug: 'github', title: 'GitHub', path: 'M12 2 2 12 12 22 22 12Z', hex: '181717' } } as never} />)
  expect(container.querySelector('svg path')?.getAttribute('d')).toBe('M12 2 2 12 12 22 22 12Z')
})

it('keeps plain text and emoji icons unchanged', () => {
  render(<WebsiteIcon shortcut={{ ...shortcut, icon: '🌻' }} />)
  expect(screen.getByText('🌻')).toBeTruthy()
})

it('reports automatic icons as loading while the first same-origin image is pending', async () => {
  const statuses: string[] = []
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'auto' }} onStatus={status => statuses.push(status)} />)
  await waitFor(() => expect(statuses).toContain('loading'))
  expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/favicon.ico')
})

it('keeps an automatic cached image visible when its load fires before mount effects', async () => {
  const now = Date.now()
  const url = 'https://race.example.test/icon.png'
  localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({ 'https://race.example.test': { url, width: 128, height: 128, savedAt: now, expiresAt: now + 6048e5 } }))
  const { container, root } = await renderBeforeEffects(<WebsiteIcon shortcut={{ ...shortcut, url: 'https://race.example.test', iconMode: 'auto' }} />, 'load')
  expect(container.querySelector('img')?.getAttribute('src')).toBe(url)
  expect(container.querySelector('img')?.style.visibility).toBe('visible')
  await unmount(root, container)
})

it('shows the text fallback when a manual image errors before mount effects', async () => {
  const { container, root } = await renderBeforeEffects(<WebsiteIcon shortcut={{ ...shortcut, image: 'data:image/png;base64,bad' }} />, 'error')
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toBe('E')
  await unmount(root, container)
})

it('shows the new icon after the shortcut url or image changes', () => {
  const now = Date.now()
  const first = 'https://first.example.test/icon.png'
  localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({ 'https://first.example.test': { url: first, width: 128, height: 128, savedAt: now, expiresAt: now + 6048e5 } }))
  const { container, rerender } = render(<WebsiteIcon shortcut={{ ...shortcut, url: 'https://first.example.test', iconMode: 'auto' }} />)
  act(() => { container.querySelector('img')!.dispatchEvent(new Event('load')) })
  expect(container.querySelector('img')?.style.visibility).toBe('visible')

  rerender(<WebsiteIcon shortcut={{ ...shortcut, url: 'https://second.example.test', iconMode: 'auto' }} />)
  const next = container.querySelector('img')!
  expect(next.getAttribute('src')).toBe('https://second.example.test/favicon.ico')
  expect(next.style.visibility).toBe('hidden')
  act(() => next.dispatchEvent(new Event('load')))
  expect(container.querySelector('img')?.style.visibility).toBe('visible')

  const manual = render(<WebsiteIcon shortcut={{ ...shortcut, image: 'data:image/png;base64,first' }} />)
  manual.rerender(<WebsiteIcon shortcut={{ ...shortcut, image: 'data:image/png;base64,second' }} />)
  expect(manual.container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,second')
})
