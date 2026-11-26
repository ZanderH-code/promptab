import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { useState, type FormEvent } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ProfileV2 } from '../../core/schema/profile'
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

it('is a labelled modal titled for adding or editing, focuses the address and closes on Escape', () => {
  const onClose = vi.fn()
  const draft = { id: 'new', name: '', url: 'https://', color: '#123456', icon: '' }
  const view = render(<ShortcutEditor shortcut={draft} isNew t={t} onChange={() => {}} onClose={onClose} onSave={event => event.preventDefault()} onError={() => {}} />)
  const dialog = screen.getByRole('dialog', { name: 'Add website' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(screen.getByLabelText('URL')).toHaveFocus()
  fireEvent.keyDown(screen.getByLabelText('URL'), { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
  view.unmount()

  render(<ShortcutEditor shortcut={{ ...draft, id: '1', name: 'Example', url: 'https://example.com' }} t={t} onChange={() => {}} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'Edit website' })).toBeInTheDocument()
})

it('edits every tile setting an import can set, and resets one back to the widget style', () => {
  const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E', tile: { gap: 1.25, hideIcon: true } }
  const onChange = vi.fn()
  const tt = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)
  const view = render(<ShortcutEditor shortcut={shortcut} t={tt} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  expect(screen.getByLabelText('Hide icon')).toBeChecked()
  expect(screen.getByLabelText('Space between icon and name')).toHaveValue('1.25')
  fireEvent.change(screen.getByLabelText('Border width'), { target: { value: '4' } })
  expect(onChange.mock.lastCall?.[0].tile).toEqual({ gap: 1.25, hideIcon: true, border: 4 })
  fireEvent.change(screen.getByLabelText('Icon and name'), { target: { value: 'horizontal' } })
  expect(onChange.mock.lastCall?.[0].tile).toMatchObject({ direction: 'horizontal' })
  for (const [label, value] of [['Icon size', '2'], ['Name size', '1.5'], ['Rotation', '-30'], ['Move sideways', '1.5'], ['Move up or down', '-2']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByLabelText('Name first'))
  fireEvent.click(screen.getByLabelText('Hide name'))
  fireEvent.click(screen.getByRole('button', { name: 'Reset Space between icon and name' }))
  expect(onChange.mock.lastCall?.[0].tile).toEqual({ hideIcon: true })
  view.rerender(<ShortcutEditor shortcut={{ ...shortcut, tile: { hideIcon: true } }} t={tt} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  expect(screen.getByLabelText('Space between icon and name')).toHaveValue('0.625')
  fireEvent.click(screen.getByLabelText('Hide icon'))
  expect(onChange.mock.lastCall?.[0]).not.toHaveProperty('tile')
})

class SlowReader {
  static pending: SlowReader[] = []
  result: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL() { SlowReader.pending.push(this) }
  finish(result: string) { this.result = result; this.onload?.() }
}

it('applies a slow tile image read to the edits made meanwhile, and drops it once the dialog closed', () => {
  vi.stubGlobal('FileReader', SlowReader)
  try {
    const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
    const onChange = vi.fn()
    const view = render(<ShortcutEditor shortcut={shortcut} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
    const file = new File(['x'], 'tile.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Tile image'), { target: { files: [file] } })
    const renamed = { ...shortcut, name: 'Renamed' }
    view.rerender(<ShortcutEditor shortcut={renamed} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
    SlowReader.pending.shift()!.finish('data:image/png;base64,AA')
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ name: 'Renamed', tile: { image: 'data:image/png;base64,AA' } })

    fireEvent.change(screen.getByLabelText('Tile image'), { target: { files: [file] } })
    const calls = onChange.mock.calls.length
    view.unmount()
    SlowReader.pending.shift()!.finish('data:image/png;base64,BB')
    expect(onChange.mock.calls.length).toBe(calls)
  } finally {
    SlowReader.pending = []
    vi.unstubAllGlobals()
  }
})

it('keeps the tile section open when its last setting is removed', () => {
  const shortcut = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E', tile: { hideIcon: true } }
  const onChange = vi.fn()
  const view = render(<ShortcutEditor shortcut={shortcut} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  const details = view.container.querySelector<HTMLDetailsElement>('details.tile-controls')!
  expect(details.open).toBe(true)
  fireEvent.click(screen.getByLabelText('Hide icon'))
  const { tile: _tile, ...withoutTile } = shortcut
  expect(onChange.mock.lastCall?.[0]).toEqual(withoutTile)
  view.rerender(<ShortcutEditor shortcut={withoutTile} t={t} onChange={onChange} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  expect(details.open).toBe(true)
})

it('previews the draft live with the real tile renderer, inert and hidden from assistive tech', () => {
  const draft = { id: '1', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  const profile = { bookmarks: { groups: [] }, widgets: [{ type: 'bookmarks', props: { style: 'block', showUrl: true } }] } as unknown as ProfileV2
  function Harness() {
    const [value, setValue] = useState(draft)
    return <ShortcutEditor shortcut={value} profile={profile} t={t} onChange={setValue} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />
  }
  const view = render(<Harness />)
  const preview = view.container.querySelector('.editor-preview')!
  const stage = preview.querySelector('.editor-preview-stage')!
  expect(preview).toHaveClass('mnt-bookmark-block')
  expect(preview).toHaveAttribute('data-show-url', '')
  expect(stage).toHaveAttribute('inert')
  expect(stage).toHaveAttribute('aria-hidden', 'true')
  const link = () => preview.querySelector('.mnt-link')
  expect(link()).toHaveTextContent('Example')
  expect(link()).toHaveAttribute('title', 'Example')

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } })
  expect(link()).toHaveTextContent('Renamed')
  fireEvent.change(screen.getByLabelText('Content position'), { target: { value: 'top-left' } })
  expect(link()).toHaveAttribute('data-tile-align', 'top-left')
  fireEvent.click(screen.getByLabelText('Hide name'))
  expect(link()).toHaveAttribute('data-tile-hide-name', '')
  fireEvent.click(screen.getByLabelText('Own plate colour'))
  expect(link()?.getAttribute('style')).toContain('--mnt-tile-bg: #123456')
})

it('saves a new website into the group chosen in the editor, starting from the group it was added from', () => {
  const groups = [{ id: 'g1', name: 'Work', collapsed: false, items: [] }, { id: 'g2', name: 'Reading', collapsed: false, items: [], builtinName: 'quick-links' as const }]
  const profile = { bookmarks: { groups }, widgets: [{ type: 'bookmarks', props: {} }] } as unknown as ProfileV2
  const draft = { id: 'new', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  let saved: string | undefined
  function Harness() {
    const [value, setValue] = useState(draft)
    const onSave = (event: FormEvent<HTMLFormElement>, chosen?: string) => { event.preventDefault(); saved = chosen }
    return <ShortcutEditor shortcut={value} isNew profile={profile} t={t} onChange={setValue} onClose={() => {}} onSave={onSave} onError={() => {}} initialGroupId="g2" />
  }
  render(<Harness />)
  const select = screen.getByLabelText('Group')
  expect(select).toHaveValue('g2')
  expect(screen.getByRole('option', { name: 'Quick links' })).toBeInTheDocument()
  fireEvent.change(select, { target: { value: 'g1' } })
  fireEvent.submit(screen.getByRole('dialog'))
  expect(saved).toBe('g1')
})

it('defaults the group picker to the first group and shows it only when adding', () => {
  const groups = [{ id: 'g1', name: 'Work', collapsed: false, items: [] }, { id: 'g2', name: 'Reading', collapsed: false, items: [] }]
  const profile = { bookmarks: { groups }, widgets: [{ type: 'bookmarks', props: {} }] } as unknown as ProfileV2
  const draft = { id: 'new', name: 'Example', url: 'https://example.com', color: '#123456', icon: 'E' }
  const view = render(<ShortcutEditor shortcut={draft} isNew profile={profile} t={t} onChange={() => {}} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} initialGroupId="gone" />)
  expect(screen.getByLabelText('Group')).toHaveValue('g1')
  view.unmount()
  render(<ShortcutEditor shortcut={{ ...draft, id: '1' }} profile={profile} t={t} onChange={() => {}} onClose={() => {}} onSave={event => event.preventDefault()} onError={() => {}} />)
  expect(screen.queryByLabelText('Group')).toBeNull()
})
