import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { migrateV1 } from '../../core/migrate/v1'
import { defaults } from '../../core/model'
import { translate, type MessageKey, type MessageParams } from '../../i18n'
import { BrowserBookmarkImport } from './BrowserBookmarkImport'
import type { Ctx } from './rows/shared'

const tree = [{ id: 'root', title: '', children: [{ id: 'folder', title: 'Reading', children: [{ id: 'link', title: 'Read', url: 'https://read.example' }] }] }]
const chromeMock = (granted: boolean) => ({
  permissions: { request: vi.fn().mockResolvedValue(granted), contains: vi.fn().mockResolvedValue(false) },
  bookmarks: { getTree: vi.fn().mockResolvedValue(tree) },
})

afterEach(() => { cleanup(); Reflect.deleteProperty(window, 'chrome') })

async function setup() {
  const profile = await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'p', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('none')) })
  const change = vi.fn()
  const ctx = { profile, s: { ...defaults, language: 'en' }, t: (key: MessageKey, params?: MessageParams) => translate('en', key, params), change } as unknown as Ctx
  render(<BrowserBookmarkImport ctx={ctx} />)
  return { profile, change }
}

describe('BrowserBookmarkImport', () => {
  it('asks for permission on click, then imports selected folders as an undoable profile update', async () => {
    const api = chromeMock(true)
    Object.defineProperty(window, 'chrome', { configurable: true, value: api })
    const { profile, change } = await setup()
    expect(api.permissions.request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Choose folders' }))
    await screen.findByRole('group', { name: 'Bookmark folders' })
    expect(api.permissions.request).toHaveBeenCalledWith({ permissions: ['bookmarks'] })
    fireEvent.click(screen.getByRole('checkbox', { name: /Reading/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Import selected folders' }))
    await waitFor(() => expect(change).toHaveBeenCalled())
    expect(change.mock.calls[0][1]).toBe('import')
    const next = (change.mock.calls[0][0] as (value: typeof profile) => typeof profile)(profile)
    expect(next.bookmarks.groups.at(-1)).toMatchObject({ name: 'Reading', items: [{ name: 'Read', url: 'https://read.example' }] })
  })

  it('handles denied permission without reading bookmarks', async () => {
    const api = chromeMock(false)
    Object.defineProperty(window, 'chrome', { configurable: true, value: api })
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Choose folders' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Bookmark permission was not granted.')
    expect(api.bookmarks.getTree).not.toHaveBeenCalled()
  })

  it('explains the unavailable development preview', async () => {
    await setup()
    expect(screen.getByText(/unavailable in the development preview/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose folders' })).toBeNull()
  })
})
