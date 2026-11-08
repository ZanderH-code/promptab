import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ICON_CACHE_KEY } from '../core/favicon'
import { brandIconColor } from '../core/tokens/iconContrast'
import { WebsiteIcon } from './WebsiteIcon'

const mocked = vi.hoisted(() => ({ loadBrand: vi.fn() }))
vi.mock('../core/brandShards', async importOriginal => ({
  ...(await importOriginal<typeof import('../core/brandShards')>()),
  loadBrand: mocked.loadBrand,
}))

const brand = { slug: 'youtube', title: 'YouTube', hex: 'FF0000', path: 'M1 1h2v2H1z' }
const shortcut = { id: '1', name: 'YouTube', url: 'https://www.youtube.com', color: '#123456', icon: 'Y' }
const ttl = 6048e5

function seedBrand(url: string) {
  const now = Date.now()
  localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({ [url]: { brand, savedAt: now, expiresAt: now + ttl } }))
}

/** jsdom normalises assigned colours, so compare in the DOM's own form. */
function cssColor(value: string) {
  const probe = document.createElement('span')
  probe.style.color = value
  return probe.style.color
}

beforeEach(() => { mocked.loadBrand.mockReset() })

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('paints a cached automatic brand on the first render with the brand colour', () => {
  seedBrand('https://www.youtube.com')
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'auto' } as never} />)
  const svg = container.querySelector('svg')
  expect(svg?.querySelector('path')?.getAttribute('d')).toBe(brand.path)
  expect((svg as SVGElement).style.color).toBe(cssColor(brandIconColor(brand.hex, shortcut.color)))
})

it('respects accent and custom colour modes for an automatic brand', () => {
  seedBrand('https://www.youtube.com')
  const accent = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'auto', iconColorMode: 'accent' } as never} />)
  expect((accent.container.querySelector('svg') as SVGElement).style.color).toBe('var(--mnt-accent)')

  const custom = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'auto', iconColorMode: 'custom' } as never} />)
  expect((custom.container.querySelector('svg') as SVGElement).style.color).toBe('rgb(18, 52, 86)')
})

it('uses the same colour rule for a manually chosen brand', () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'brand', iconColorMode: 'brand', brand } as never} />)
  expect((container.querySelector('svg') as SVGElement).style.color).toBe(cssColor(brandIconColor(brand.hex, shortcut.color)))
  expect(mocked.loadBrand).not.toHaveBeenCalled()
})

it('loads a brand mark on demand when the shortcut stores only a slug', async () => {
  mocked.loadBrand.mockResolvedValue(brand)
  const manual = { ...shortcut, iconMode: 'brand', iconName: 'youtube' } as Record<string, unknown>
  const { container } = render(<WebsiteIcon shortcut={manual as never} />)
  expect(container.querySelector('svg')).toBeNull()
  await waitFor(() => expect(container.querySelector('svg path')?.getAttribute('d')).toBe(brand.path))
  expect(mocked.loadBrand).toHaveBeenCalledWith('youtube')
  expect((container.querySelector('svg') as SVGElement).style.color).toBe(cssColor(brandIconColor(brand.hex, shortcut.color)))
  // The resolved mark is display state only: the shortcut object is untouched.
  expect(manual.brand).toBeUndefined()
})

it('keeps the letter when the stored slug is unknown', async () => {
  mocked.loadBrand.mockResolvedValue(null)
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'brand', iconName: 'not-a-brand' } as never} />)
  await waitFor(() => expect(mocked.loadBrand).toHaveBeenCalledWith('not-a-brand'))
  expect(container.querySelector('svg')).toBeNull()
  expect(container.textContent).toBe('Y')
})
