// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaults } from '../core/model'
import { migrateV1 } from '../core/migrate/v1'
import type { ProfileV2 } from '../core/schema/profile'
import { translate } from '../i18n'
import { ProfileWidgets } from './ProfileWidgets'
import type { WidgetUpdate } from './ProductivityWidgets'

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)

async function profile(): Promise<ProfileV2> {
  const migrated = await migrateV1({ ...defaults, language: 'en' }, { id: () => 'main', now: () => '2026-01-01T00:00:00.000Z', add: vi.fn() })
  migrated.widgets = migrated.widgets.filter(widget => widget.type === 'search' || widget.type === 'bookmarks')
  for (const widget of migrated.widgets) if (widget.type === 'search') widget.props.findBookmarks = true
  const group = migrated.bookmarks.groups[0]!
  group.items = [{ ...group.items[0]!, id: 'github', name: 'GitHub', url: 'https://github.com', builtinName: undefined, builtinIcon: undefined, builtinGroup: undefined }]
  return migrated
}

function props(profile: ProfileV2, editing = false): ComponentProps<typeof ProfileWidgets> {
  return {
    profile, language: 'en', shortcuts: profile.bookmarks.groups.flatMap(group => group.items), editing, onboarding: false,
    onOnboardingAction: vi.fn(), t, onError: vi.fn(), onContextMenu: vi.fn(), onGroups: vi.fn(), onGroupContextMenu: vi.fn(),
    onEdit: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(), onAdd: vi.fn(), onBookmarkContextMenu: vi.fn(), onOpenSettings: vi.fn(),
    onEnterEditMode: vi.fn(), onWidgetChange: vi.fn() as WidgetUpdate,
  }
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, media: '', addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('bookmark find-as-you-type', () => {
  it('says when nothing matches and clears the text and the filter together', async () => {
    render(<ProfileWidgets {...props(await profile())} />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('No websites match “zzz”')
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeVisible()
  })

  it('clears the same way on Escape', async () => {
    render(<ProfileWidgets {...props(await profile())} />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('clears the box when edit mode starts and does not restore the old filter afterwards', async () => {
    const base = await profile()
    const { rerender } = render(<ProfileWidgets {...props(base)} />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(<ProfileWidgets {...props(base, true)} />)
    expect(input).toHaveValue('')
    // Typing while editing is a plain web search, not a filter to restore afterwards.
    fireEvent.change(input, { target: { value: 'github' } })
    rerender(<ProfileWidgets {...props(base)} />)
    expect(input).toHaveValue('')
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeVisible()
  })
})
