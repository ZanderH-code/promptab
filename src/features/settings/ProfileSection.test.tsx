import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { ProfileStore } from '../../store/profile'
import type { ProfileV2 } from '../../core/schema/profile'
import { translate } from '../../i18n'
import { ProfileSection } from './ProfileSection'

const profile = { meta: { id: 'a', name: 'Alpha', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' } } as ProfileV2
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function setup(archived: Record<string, ProfileStore['archived'][string]> = {}) {
  const actions = { switchProfile: vi.fn().mockResolvedValue(undefined), createProfile: vi.fn().mockResolvedValue(undefined), renameProfile: vi.fn().mockResolvedValue(undefined), deleteProfile: vi.fn().mockResolvedValue(undefined), setPreview: vi.fn(), clearPreview: vi.fn(), restoreSnapshot: vi.fn().mockResolvedValue(undefined), restoreArchivedProfile: vi.fn().mockResolvedValue(undefined), pinSnapshot: vi.fn().mockResolvedValue(undefined) }
  const store = createStore<ProfileStore>(() => ({ profiles: { a: profile, b: { ...profile, meta: { ...profile.meta, id: 'b', name: 'Beta' } } }, activeProfileId: 'a', archived, history: { profiles: { a: { lastEditAt: null, snapshots: [{ id: 's1', createdAt: 1000, kind: 'edit', pinned: false, profile }] } } }, preview: null, initialized: true, ...actions } as unknown as ProfileStore))
  render(<ProfileSection store={store} t={t} language="en" />)
  return actions
}

describe('ProfileSection', () => {
  it('switches, creates, renames, and confirms deletion', async () => {
    const actions = setup()
    fireEvent.change(screen.getByLabelText('Active profile'), { target: { value: 'b' } })
    await waitFor(() => expect(actions.switchProfile).toHaveBeenCalledWith('b'))
    vi.spyOn(window, 'prompt').mockReturnValueOnce('New profile').mockReturnValueOnce('Renamed')
    fireEvent.click(screen.getByRole('button', { name: 'New profile' }))
    await waitFor(() => expect(actions.createProfile).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ name: 'New profile' }) })))
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    await waitFor(() => expect(actions.renameProfile).toHaveBeenCalledWith('a', 'Renamed'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(actions.deleteProfile).toHaveBeenCalledWith('a'))
  })

  it('shows archived profiles only when present and restores one', async () => {
    const archived = { old: { profile: { ...profile, meta: { ...profile.meta, id: 'old', name: 'Old profile' } }, history: { lastEditAt: null, snapshots: [] }, archivedAt: 1 } }
    const actions = setup(archived)
    expect(screen.getByText('Archived profiles')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Restore profile' }))
    await waitFor(() => expect(actions.restoreArchivedProfile).toHaveBeenCalledWith('old'))
  })

  it('previews, restores, and pins a snapshot', async () => {
    const actions = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(actions.setPreview).toHaveBeenCalledWith('a', profile)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(actions.restoreSnapshot).toHaveBeenCalledWith('a', 's1'))
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    await waitFor(() => expect(actions.pinSnapshot).toHaveBeenCalledWith('a', 's1', true))
  })
})
