import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { migrateV1 } from '../../core/migrate/v1'
import { defaults } from '../../core/model'
import type { ProfileV2 } from '../../core/schema/profile'
import { translate, type Language } from '../../i18n'
import type { ProfileStore } from '../../store/profile'
import { SettingsDrawer, initialTab, matches } from './SettingsDrawer'
import { parsePosition } from './rows'

vi.mock('./BackupSection', () => ({ BackupSection: () => <p>backup-stub</p> }))
vi.mock('./ProfileSection', () => ({ ProfileSection: () => <p>profiles-stub</p> }))

let base: ProfileV2
beforeAll(async () => {
  base = await migrateV1(defaults, { id: () => 'p', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('none')) })
  // jsdom lacks these, and Radix Select calls them when its trigger is focused.
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})
afterEach(cleanup)

function setup(options: { profile?: ProfileV2; language?: Language; initialSection?: string; themeMode?: 'dark' | 'light' } = {}) {
  const language = options.language ?? 'en'
  const profile = options.profile ?? base
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate(language, key, params)
  const props = {
    store: createStore<ProfileStore>(() => ({}) as ProfileStore),
    settings: { ...defaults, language, theme: options.themeMode ?? 'dark' },
    profile, t, initialSection: options.initialSection,
    onPatch: vi.fn(), onProfileChange: vi.fn(), onClose: vi.fn(), onWallpaperFile: vi.fn(), onWallpaperRemove: vi.fn(), onReset: vi.fn(), onError: vi.fn(),
  }
  render(<><button>opener</button><SettingsDrawer {...props} /></>)
  return props
}
const lastUpdate = (props: ReturnType<typeof setup>) => {
  const call = props.onProfileChange.mock.calls.at(-1)!
  return { next: (call[0] as (p: ProfileV2) => ProfileV2)(structuredClone(props.profile)), kind: call[1] as string | undefined }
}

describe('SettingsDrawer tabs', () => {
  it('shows the eight sections and no AI tab', () => {
    setup()
    const names = within(screen.getByRole('tablist')).getAllByRole('tab').map(tab => tab.textContent)
    expect(names).toEqual(['Appearance', 'Background', 'Layout', 'Widgets', 'Shortcuts', 'Search', 'Data', 'About'])
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Appearance')
  })

  it('moves with arrow keys, Home and End using a roving tabindex', () => {
    setup()
    const tab = (name: string) => screen.getByRole('tab', { name })
    tab('Appearance').focus()
    fireEvent.keyDown(tab('Appearance'), { key: 'ArrowRight' })
    expect(tab('Background')).toHaveFocus()
    expect(tab('Background')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Background')).toHaveAttribute('tabindex', '0')
    expect(tab('Appearance')).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(tab('Background'), { key: 'End' })
    expect(tab('About')).toHaveFocus()
    fireEvent.keyDown(tab('About'), { key: 'ArrowRight' })
    expect(tab('Appearance')).toHaveFocus()
    fireEvent.keyDown(tab('Appearance'), { key: 'ArrowLeft' })
    expect(tab('About')).toHaveFocus()
    fireEvent.keyDown(tab('About'), { key: 'Home' })
    expect(tab('Appearance')).toHaveFocus()
  })

  it('opens on a legacy anchor and keeps language in About', () => {
    expect(initialTab('wallpaper-settings')).toBe('background')
    expect(initialTab('component-settings')).toBe('widgets')
    expect(initialTab('search-settings')).toBe('search')
    expect(initialTab('nonsense')).toBe('appearance')
    setup({ initialSection: 'component-settings' })
    expect(screen.getByRole('tab', { name: 'Widgets' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'About' }))
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
  })

  it('shows profile and backup sections only in Data', () => {
    setup()
    expect(screen.queryByText('profiles-stub')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Data' }))
    expect(screen.getByText('profiles-stub')).toBeInTheDocument()
    expect(screen.getByText('backup-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset settings' })).toBeInTheDocument()
  })
})

describe('SettingsDrawer search', () => {
  it('matches localized labels across sections and groups the results', () => {
    setup({ language: 'zh-CN' })
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索设置' }), { target: { value: '圆角' } })
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('heading', { name: '外观' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '布局' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: '圆角的数值' })).toBeInTheDocument()
    expect(screen.queryByText('主题预设')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('2 项设置')
  })

  it('finds option names and the section name', () => {
    setup()
    const box = screen.getByRole('searchbox', { name: 'Search settings' })
    fireEvent.change(box, { target: { value: 'serif' } })
    expect(screen.getByRole('combobox', { name: 'Display font' })).toBeInTheDocument()
    fireEvent.change(box, { target: { value: 'background' } })
    expect(screen.getByRole('heading', { name: 'Background' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Background type' })).toBeInTheDocument()
  })

  it('shows a usable empty state', () => {
    setup()
    const box = screen.getByRole('searchbox', { name: 'Search settings' })
    fireEvent.change(box, { target: { value: 'qqqq' } })
    expect(screen.getByText('No settings match “qqqq”')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1)!)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })

  it('matches every term case-insensitively', () => {
    expect(matches('Corner radius Appearance', 'RADIUS appear')).toBe(true)
    expect(matches('Corner radius Appearance', 'radius blur')).toBe(false)
  })
})

describe('SettingsDrawer focus and keys', () => {
  it('focuses the selected tab, closes on Escape and returns focus to the opener', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const props = setup()
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Appearance' }), { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
    cleanup()
    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('clears the search before closing on Escape', () => {
    const props = setup()
    const box = screen.getByRole('searchbox', { name: 'Search settings' })
    fireEvent.change(box, { target: { value: 'blur' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(props.onClose).not.toHaveBeenCalled()
    expect(box).toHaveValue('')
  })

  it('ignores keys from outside the drawer so the shortcut editor keeps its own focus', () => {
    const props = setup()
    const outside = screen.getByRole('button', { name: 'opener' })
    fireEvent.keyDown(outside, { key: 'Escape' })
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('wraps Tab inside the drawer', () => {
    setup()
    const drawer = screen.getByRole('dialog', { name: 'Settings' })
    // jsdom has no layout, so every element counts as rendered.
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentNode } })
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'))
    const first = focusable[0], last = focusable[focusable.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    Reflect.deleteProperty(HTMLElement.prototype, 'offsetParent')
  })
})

describe('SettingsDrawer appearance', () => {
  it('commits a typed number clamped to the range and keeps the slider in step', () => {
    const props = setup()
    const radius = screen.getByRole('spinbutton', { name: 'Corner radius value' })
    fireEvent.change(radius, { target: { value: '99' } })
    fireEvent.keyDown(radius, { key: 'Enter' })
    expect(lastUpdate(props).next.theme.radius).toBe(28)
    expect(screen.getByRole('slider', { name: 'Corner radius' })).toHaveValue('28')
  })

  it('reverts invalid input and Escape without committing', () => {
    const props = setup()
    const radius = screen.getByRole('spinbutton', { name: 'Corner radius value' })
    fireEvent.change(radius, { target: { value: '' } })
    fireEvent.blur(radius)
    expect(props.onProfileChange).not.toHaveBeenCalled()
    expect(radius).toHaveValue(14)
  })

  it('applies a preset as one preset change', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Paper' }))
    const { next, kind } = lastUpdate(props)
    expect(kind).toBe('preset')
    expect(next.theme.preset).toBe('paper')
    expect(next.theme.mode).toBe('light')
    expect(next.bookmarks).toEqual(base.bookmarks)
  })

  it('edits the colors of the resolved mode only, and leaves the preset', () => {
    const light = structuredClone(base)
    light.theme.mode = 'light'
    light.theme.preset = 'paper'
    light.theme.colorLight = { bg: '#f1ede6', surface: '#faf8f4', text: '#2f2b27', accent: '#b04f26' }
    const props = setup({ profile: light, themeMode: 'light' })
    fireEvent.change(screen.getByLabelText('Accent color'), { target: { value: '#112233' } })
    const { next } = lastUpdate(props)
    expect(next.theme.colorLight?.accent).toBe('#112233')
    expect(next.theme.color).toEqual(light.theme.color)
    expect(next.theme.preset).toBeUndefined()
  })

  it('warns about low contrast and fixes it with one click', () => {
    const poor = structuredClone(base)
    poor.theme.color = { ...poor.theme.color, text: '#2a4650' }
    const props = setup({ profile: poor })
    expect(screen.getAllByText(/is \d+\.\d:1; at least 4\.5:1/).length).toBeGreaterThan(0)
    const fix = screen.getByRole('button', { name: 'Fix contrast' })
    fireEvent.click(fix)
    const { next } = lastUpdate(props)
    expect(next.theme.color.bg).toBe(poor.theme.color.bg)
    expect(next.theme.color.text).not.toBe('#2a4650')
  })

  it('shows no warning for the default palette', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Fix contrast' })).toBeNull()
    expect(screen.getByText('Contrast passes for the Dark palette')).toBeInTheDocument()
  })
})

describe('SettingsDrawer background', () => {
  it('creates the data a new background type needs', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Background' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Gradient' }))
    const { next } = lastUpdate(props)
    expect(next.background.type).toBe('gradient')
    expect(next.background.gradient?.stops).toHaveLength(2)
  })

  it('edits gradient stops between two and three', () => {
    const gradient = structuredClone(base)
    gradient.background = { ...gradient.background, type: 'gradient', gradient: { angle: 90, stops: ['#000000', '#ffffff'] } }
    const props = setup({ profile: gradient, initialSection: 'background' })
    fireEvent.click(screen.getByRole('button', { name: 'Add stop' }))
    expect(lastUpdate(props).next.background.gradient?.stops).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Remove stop/ })).toBeNull()
  })

  it('adjusts wallpaper fields only when an image exists', () => {
    setup({ initialSection: 'background' })
    expect(screen.queryByRole('slider', { name: 'Blur' })).toBeNull()
    expect(screen.getByText(/Upload an image to adjust/)).toBeInTheDocument()
    cleanup()
    const withImage = structuredClone(base)
    withImage.background = { ...withImage.background, type: 'image', image: { asset: `mnt-asset:${'a'.repeat(64)}`, blur: 4, grayscale: 0, scale: 1, vignette: 0, position: 'center' } }
    const props = setup({ profile: withImage, initialSection: 'background' })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Blur value' }), { target: { value: '12' } })
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Blur value' }))
    expect(lastUpdate(props).next.background.image?.blur).toBe(12)
    fireEvent.click(screen.getByRole('radio', { name: 'Top left' }))
    expect(lastUpdate(props).next.background.image?.position).toBe('top-left')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Horizontal position value' }), { target: { value: '30' } })
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Horizontal position value' }))
    expect(lastUpdate(props).next.background.image?.position).toBe('30% 50%')
  })

  it('parses named and exact focal positions', () => {
    expect(parsePosition('top-left')).toEqual({ named: 'top-left', x: 0, y: 0 })
    expect(parsePosition('left top')).toEqual({ named: 'top-left', x: 0, y: 0 })
    expect(parsePosition('center')).toEqual({ named: 'center', x: 50, y: 50 })
    expect(parsePosition('20% 80%')).toEqual({ x: 20, y: 80 })
    expect(parsePosition('garbage')).toEqual({ x: 50, y: 50 })
  })
})

describe('SettingsDrawer restore defaults', () => {
  it('restores a section from the default profile and keeps unrelated fields', async () => {
    const custom = structuredClone(base)
    custom.theme = { ...custom.theme, radius: 3, preset: 'paper' }
    custom.bookmarks.groups[0].name = 'Mine'
    const props = setup({ profile: custom })
    fireEvent.click(screen.getByRole('button', { name: 'Restore section defaults' }))
    await waitFor(() => expect(props.onProfileChange).toHaveBeenCalled())
    const { next, kind } = lastUpdate({ ...props, profile: custom } as ReturnType<typeof setup>)
    expect(kind).toBe('reset')
    expect(next.theme.radius).toBe(14)
    expect(next.theme.preset).toBeUndefined()
    expect(next.bookmarks.groups[0].name).toBe('Mine')
  })

  it('has no restore button on sections without defaults', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: 'About' }))
    expect(screen.queryByRole('button', { name: 'Restore section defaults' })).toBeNull()
  })

  it('confirms before the full reset', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Data' }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }))
    expect(props.onReset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }))
    expect(props.onReset).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })
})
