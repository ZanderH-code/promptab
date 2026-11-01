import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { translate } from '../../i18n'
import { ShortcutEditor } from './ShortcutEditor'

const load = vi.hoisted(() => vi.fn())
vi.mock('simple-icons', () => { load(); return { siGithub: { title: 'GitHub', slug: 'github', path: 'M0 0', hex: '000000' } } })
afterEach(cleanup)

it('loads the brand catalog only when brand selection is opened', async () => {
  const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  const onChange = vi.fn()
  const t = (key: Parameters<typeof translate>[1]) => translate('en', key)
  const renderEditor = (value: typeof shortcut) => <ShortcutEditor shortcut={value} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />
  const view = render(renderEditor(shortcut))
  expect(load).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /brand/i }))
  const selected = onChange.mock.lastCall?.[0]
  expect(selected).toMatchObject({ iconMode: 'brand', iconName: 'github' })
  view.rerender(renderEditor(selected))
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
  expect(await screen.findByRole('button', { name: 'GitHub' })).toBeTruthy()
})
