import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { WebsiteIcon } from './WebsiteIcon'

const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E', iconMode: 'text' as const }
afterEach(cleanup)

it('renders a selected Lucide icon instead of its stored identifier', () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'lucide', iconName: 'house' } as never} />)
  expect(container.querySelector('svg.lucide-house')).toBeTruthy()
  expect(screen.queryByText('lucide:house')).toBeNull()
})

it('renders a saved brand path without loading the catalog', async () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'brand', iconName: 'github', brand: { slug: 'github', title: 'GitHub', path: 'M12 2 2 12 12 22 22 12Z', hex: '181717' } } as never} />)
  expect(container.querySelector('svg path')?.getAttribute('d')).toBe('M12 2 2 12 12 22 22 12Z')
})

it('keeps plain text and emoji icons unchanged', () => {
  render(<WebsiteIcon shortcut={{ ...shortcut, icon: '🌻' }} />)
  expect(screen.getByText('🌻')).toBeTruthy()
})
