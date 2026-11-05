// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { translate } from '../i18n'
import type { Shortcut } from '../core/model'
import { ShortcutGrid, type Group, type ShortcutGridProps } from './ShortcutGrid'

const shortcut = (id: string): Shortcut => ({ id, name: id, url: `https://example.com/${id}`, icon: id[0], color: '#123456' } as Shortcut)
const first = { id: 'first', name: 'First', collapsed: true, items: [shortcut('Alpha')] } as Group
const second = { id: 'second', name: 'A long folder name '.repeat(8), collapsed: true, items: [shortcut('Beta'), shortcut('Gamma')] } as Group
const makeProps = (groups: Group[]): ShortcutGridProps => ({
  groups, shortcuts: groups.flatMap(group => group.items) as Shortcut[], editing: false, onManageDone: vi.fn(), t: (key, params) => translate('en', key, params), language: 'en',
  style: 'tile', source: 'all', showGroupTitles: true, maxColumns: 6, showAdd: false, iconColor: 'per-site', openInNewTab: true, liftOnHover: false,
  onGroups: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(), onAdd: vi.fn(), onContextMenu: vi.fn(), onGroupContextMenu: vi.fn(), onboarding: false, onOnboardingAction: vi.fn(),
})
afterEach(cleanup)

describe('bookmark folders', () => {
  it('keeps a single group and a specific source in the existing display mode', () => {
    const { rerender } = render(<ShortcutGrid {...makeProps([{ ...first, collapsed: false }])} />)
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Open folder/ })).not.toBeInTheDocument()
    rerender(<ShortcutGrid {...makeProps([first, { ...second, collapsed: false }])} source="second" />)
    expect(screen.getByRole('link', { name: 'Beta' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Open folder/ })).not.toBeInTheDocument()
  })

  it('limits the folder preview to four bookmark icons', async () => {
    const manyBookmarks = { ...second, items: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map(shortcut) }
    render(<ShortcutGrid {...makeProps([first, manyBookmarks])} />)
    const opener = await screen.findByRole('button', { name: `Open folder ${second.name.trim()} with 6 bookmarks` })
    expect(opener.querySelectorAll('.mnt-folder-preview-item')).toHaveLength(4)
  })

  it('renders the first group flat, ignores collapsed state, traps focus and restores it after Escape', async () => {
    render(<ShortcutGrid {...makeProps([first, second])} />)
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Beta' })).not.toBeInTheDocument()
    const opener = await screen.findByRole('button', { name: `Open folder ${second.name.trim()} with 2 bookmarks` })
    expect(opener).toHaveAttribute('title', second.name)
    expect(opener).toHaveAttribute('aria-haspopup', 'dialog')
    expect(opener).toHaveAttribute('aria-expanded', 'false')
    opener.focus()
    fireEvent.click(opener)
    expect(opener).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: second.name.trim() })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const firstLink = within(dialog).getByRole('link', { name: 'Beta' })
    const lastLink = within(dialog).getByRole('link', { name: 'Gamma' })
    const close = within(dialog).getByRole('button', { name: 'Close folder' })
    expect(firstLink).toHaveFocus()
    expect(firstLink).toHaveAttribute('href', 'https://example.com/Beta')
    expect(firstLink).toHaveAttribute('target', '_blank')
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(lastLink).toHaveFocus()
    fireEvent.keyDown(lastLink, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.click(dialog)
    expect(dialog).toBeVisible()
    fireEvent.keyDown(close, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(opener).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on backdrop and displays a localized empty state', async () => {
    const empty = { ...second, name: 'Empty', items: [] }
    render(<ShortcutGrid {...makeProps([first, empty])} />)
    const opener = await screen.findByRole('button', { name: 'Open folder Empty with 0 bookmarks' })
    fireEvent.click(opener)
    expect(screen.getByText('This folder is empty')).toBeVisible()
    expect(screen.getByText('Switch to edit mode to add websites.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close folder' })).toHaveFocus()
    fireEvent.click(document.querySelector('[data-folder-backdrop]')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it.each(['tile', 'list', 'minimal', 'card', 'icon-only'] as const)('keeps folders operable in %s mode', async style => {
    render(<ShortcutGrid {...makeProps([first, second])} style={style} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open folder .* with 2 bookmarks/ }))
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Beta' })).toBeVisible()
  })

  it('updates an open folder and removes its dialog when the group disappears', async () => {
    const props = makeProps([first, second])
    const { rerender } = render(<ShortcutGrid {...props} />)
    fireEvent.click(await screen.findByRole('button', { name: /Open folder .* with 2 bookmarks/ }))
    const updated = { ...second, items: [shortcut('New')] }
    rerender(<ShortcutGrid {...makeProps([first, updated])} />)
    expect(screen.getByRole('link', { name: 'New' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Beta' })).not.toBeInTheDocument()
    rerender(<ShortcutGrid {...makeProps([first])} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders groups and edit controls instead of folders in editing mode', async () => {
    render(<ShortcutGrid {...makeProps([{ ...first, collapsed: false }, { ...second, collapsed: false }])} editing />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add group' })).toBeEnabled(), { timeout: 10000 })
    expect(screen.getByRole('link', { name: 'Beta' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Open folder/ })).not.toBeInTheDocument()
  })
})
