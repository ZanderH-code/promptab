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

it('loads and renders a selected brand icon', async () => {
  const { container } = render(<WebsiteIcon shortcut={{ ...shortcut, iconMode: 'brand', iconName: 'github' } as never} />)
  await waitFor(() => expect(container.querySelector('svg path')).toBeTruthy())
})

it('keeps plain text and emoji icons unchanged', () => {
  render(<WebsiteIcon shortcut={{ ...shortcut, icon: '🌻' }} />)
  expect(screen.getByText('🌻')).toBeTruthy()
})
