import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translate } from '../../i18n'
import { ShortcutEditor } from './ShortcutEditor'

const load = vi.hoisted(() => vi.fn())
vi.mock('simple-icons', () => { load(); return { siGithub: { title: 'GitHub', slug: 'github', path: 'M0 0', hex: '000000' } } })
afterEach(cleanup)

const t = (key: Parameters<typeof translate>[1]) => translate('en', key)
const renderEditor = (value: { id: string; name: string; url: string; color: string; icon: string }, onChange: ReturnType<typeof vi.fn>) =>
  <ShortcutEditor shortcut={value} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />

it('fills a new shortcut name from the URL and never overwrites a typed name', async () => {
  const draft = { id: 'new', name: '', url: 'https://', color: '#123456', icon: '' }
  const onChange = vi.fn()
  const view = render(renderEditor(draft, onChange))
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://claude.ai' } })
  await waitFor(() => expect(onChange.mock.lastCall?.[0]).toMatchObject({ name: 'Claude', url: 'https://claude.ai' }))
  const suggested = onChange.mock.lastCall?.[0]
  view.rerender(renderEditor(suggested, onChange))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Claude' } })
  const typed = onChange.mock.lastCall?.[0]
  expect(typed.name).toBe('My Claude')
  view.rerender(renderEditor(typed, onChange))
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://github.com' } })
  await waitFor(() => expect(onChange.mock.lastCall?.[0]).toMatchObject({ name: 'My Claude', url: 'https://github.com' }))
})

it('keeps the name when editing an existing shortcut', () => {
  const existing = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  const onChange = vi.fn()
  render(renderEditor(existing, onChange))
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://github.com' } })
  expect(onChange.mock.lastCall?.[0]).toMatchObject({ name: 'Example', url: 'https://github.com' })
})

it('refills the name after the user clears it and changes the URL', async () => {
  const draft = { id: 'new', name: '', url: 'https://', color: '#123456', icon: '' }
  const onChange = vi.fn()
  const view = render(renderEditor(draft, onChange))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Custom' } })
  view.rerender(renderEditor(onChange.mock.lastCall?.[0], onChange))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } })
  view.rerender(renderEditor(onChange.mock.lastCall?.[0], onChange))
  fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://claude.ai' } })
  await waitFor(() => expect(onChange.mock.lastCall?.[0]).toMatchObject({ name: 'Claude', url: 'https://claude.ai' }))
})

it('loads the brand catalog on search focus and stores the selected icon data', async () => {
  const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  const onChange = vi.fn()
  const t = (key: Parameters<typeof translate>[1]) => translate('en', key)
  const renderEditor = (value: typeof shortcut) => <ShortcutEditor shortcut={value} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />
  const view = render(renderEditor(shortcut))
  expect(load).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Brand/ }))
  expect(load).not.toHaveBeenCalled()
  let selected = onChange.mock.lastCall?.[0]
  view.rerender(renderEditor(selected))
  fireEvent.focus(await screen.findByLabelText('Search brands'))
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  const brand = await screen.findByRole('button', { name: 'GitHub' })
  fireEvent.click(brand)
  selected = onChange.mock.lastCall?.[0]
  expect(selected).toMatchObject({ iconMode: 'brand', iconName: 'github', brand: { slug: 'github', title: 'GitHub', path: 'M0 0', hex: '000000' } })
  view.rerender(renderEditor(selected))
})
