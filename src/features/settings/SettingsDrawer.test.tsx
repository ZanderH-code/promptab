import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { migrateV1 } from '../../core/migrate/v1'
import { defaults, type Settings } from '../../core/model'
import { profileIssues, type ProfileV2 } from '../../core/schema/profile'
import { translate, type Language } from '../../i18n'
import type { ProfileStore } from '../../store/profile'
import { SettingsDrawer, initialTab, matches } from './SettingsDrawer'
import { parsePosition } from './rows'
import { STARTER_SITES } from '../../core/starter-sites'

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

function setup(options: { profile?: ProfileV2; settings?: Partial<Settings>; language?: Language; initialSection?: string; themeMode?: 'dark' | 'light' } = {}) {
  const language = options.language ?? 'en'
  const profile = options.profile ?? base
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate(language, key, params)
  const props = {
    store: createStore<ProfileStore>(() => ({}) as ProfileStore),
    settings: { ...defaults, language, theme: options.themeMode ?? 'dark', ...options.settings },
    profile, t, initialSection: options.initialSection,
    onPatch: vi.fn(), onProfileChange: vi.fn(), onClose: vi.fn(), onWallpaperFile: vi.fn(), onWallpaperFiles: vi.fn(), onWallpaperVideoFile: vi.fn(), onWallpaperRemove: vi.fn(), onReset: vi.fn(), onError: vi.fn(), onEnterEditMode: vi.fn(),
  }
  const view = render(<><button>opener</button><SettingsDrawer {...props} /></>)
  return { ...props, rerender: (profile: ProfileV2) => view.rerender(<><button>opener</button><SettingsDrawer {...props} profile={profile} /></>) }
}
const lastUpdate = (props: ReturnType<typeof setup>) => {
  const call = props.onProfileChange.mock.calls.at(-1)!
  return { next: (call[0] as (p: ProfileV2) => ProfileV2)(structuredClone(props.profile)), kind: call[1] as string | undefined }
}

describe('SettingsDrawer tabs', () => {
  it('edits theme variables in Appearance', () => {
    const profile: ProfileV2 = { ...base, custom: { ...base.custom, variables: [{ name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'toggle', default: 0 }], values: { '--glow': 0 } } }
    const props = setup({ profile })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Glow' }))
    expect(lastUpdate(props).next.custom.values['--glow']).toBe(1)
    fireEvent.click(screen.getByRole('tab', { name: 'Custom CSS' }))
    expect(screen.queryByRole('checkbox', { name: 'Glow' })).toBeNull()
  })

  it('lists every section, AI included', () => {
    setup()
    const names = within(screen.getByRole('tablist')).getAllByRole('tab').map(tab => tab.textContent)
    expect(names).toEqual(['Theme', 'Background', 'Areas & grid', 'Widgets', 'Websites', 'Search', 'Custom CSS', 'AI assistant', 'Backup & import', 'About'])
    expect(screen.getByRole('tab', { name: 'Theme' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Theme')
  })

  it('keeps a roving tabindex on the rail', () => {
    setup()
    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab')
    expect(tabs.filter(tab => tab.getAttribute('tabindex') === '0')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Theme' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Background' })).toHaveAttribute('tabindex', '-1')
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

  it('pluralizes the website count and points people to the page for edits', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Websites' }))
    expect(screen.getByText('Use Edit websites to add, reorder or remove websites on the page. This section controls how they look.')).toBeInTheDocument()
    expect(screen.getByText('1 website')).toBeInTheDocument()
    expect(screen.queryByText('1 websites')).toBeNull()

    cleanup()
    setup({ settings: { shortcuts: [structuredClone(defaults.shortcuts[0]), { ...structuredClone(defaults.shortcuts[0]), id: 'second', name: 'Second' }] } })
    fireEvent.click(screen.getByRole('tab', { name: 'Websites' }))
    expect(screen.getByText('2 websites')).toBeInTheDocument()
  })

  it('opens website editing from the Websites section', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Websites' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit websites' }))
    expect(props.onEnterEditMode).toHaveBeenCalledOnce()

    cleanup()
    setup({ language: 'zh-CN' })
    fireEvent.click(screen.getByRole('tab', { name: '网站' }))
    expect(screen.getByRole('button', { name: '编辑网站' })).toBeInTheDocument()
  })

  it('shows profile and backup sections only in Data', async () => {
    setup()
    expect(screen.queryByText('profiles-stub')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    expect(screen.getByText('profiles-stub')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('backup-stub')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Reset settings' })).toBeInTheDocument()
  })

  it('removes only unchanged starter sites as one undoable change', () => {
    const profile = structuredClone(base)
    profile.bookmarks.groups[0].items = [structuredClone(STARTER_SITES[0]), { ...STARTER_SITES[1], name: 'My Gmail' }]
    const props = setup({ profile })
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove starter sites' }))
    const { next, kind } = lastUpdate(props)
    expect(kind).toBe('import')
    expect(next.bookmarks.groups[0].items).toEqual([{ ...STARTER_SITES[1], name: 'My Gmail' }])
  })

  it('previews Infinity import counts, adds into Quick links as one undoable change', async () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    const backup = JSON.stringify({ version: 'v2', data: { site: { sites: [[{ type: 'web', name: 'Imported', target: 'https://imported.example', bgType: 'image' }]] } } })
    const file = new File([backup], 'backup.infinity', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => backup })
    await waitFor(() => expect(screen.getByLabelText('Choose Infinity backup')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Choose Infinity backup'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByText(/Groups: 1.*Links: 1/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Add to my bookmarks' }))
    const { next, kind } = lastUpdate(props)
    expect(kind).toBe('import')
    expect(next.bookmarks.groups.filter(group => group.builtinName === 'quick-links')).toHaveLength(1)
    expect(next.bookmarks.groups.find(group => group.builtinName === 'quick-links')?.items.map(item => item.name)).toContain('Imported')
    expect(screen.getByRole('status')).toHaveTextContent('Infinity backup imported')
  })

  it('replaces bookmarks from an Infinity import with one undoable change', async () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    const backup = JSON.stringify({ version: 'v2', data: { site: { sites: [[{ type: 'web', name: 'Imported', target: 'https://imported.example', bgType: 'image' }]] } } })
    const file = new File([backup], 'backup.infinity', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => backup })
    await waitFor(() => expect(screen.getByLabelText('Choose Infinity backup')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Choose Infinity backup'), { target: { files: [file] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Replace my bookmarks' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Replace my bookmarks' }))
    const { next, kind } = lastUpdate(props)
    expect(kind).toBe('import')
    expect(next.bookmarks.groups.flatMap(group => group.items).map(item => item.name)).toEqual(['Imported'])
  })
})

describe('SettingsDrawer search', () => {
  it('offers all shared search presets in order and does not offer Baidu', () => {
    setup({ initialSection: 'search' })
    fireEvent.click(screen.getByRole('combobox', { name: 'Search engine' }))
    const options = screen.getAllByRole('option').map(option => option.textContent)
    expect(options).toEqual(['Google', 'Bing', 'DuckDuckGo', 'Brave Search', 'Startpage', 'Ecosia', 'Qwant', 'Yahoo', 'Yandex', 'Kagi', 'Perplexity'])
  })

  it('keeps a saved Baidu template as a Custom setting', () => {
    setup({ initialSection: 'search', settings: { searchTemplate: 'https://www.baidu.com/s?wd={query}' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Search engine' }))
    expect(screen.getByRole('option', { name: /^Custom$/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^Baidu$/ })).toBeNull()
  })
  it('matches localized labels across sections and groups the results', () => {
    setup({ language: 'zh-CN' })
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索设置' }), { target: { value: '圆角' } })
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByRole('heading', { name: '主题' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '区域与网格' })).toBeInTheDocument()
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
    expect(screen.getByRole('tab', { name: 'Theme' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Theme' }), { key: 'Escape' })
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

  it('selects local video backgrounds and configures wallpaper rotation', () => {
    const asset = `mnt-asset:${'a'.repeat(64)}`
    const withRotation = structuredClone(base)
    withRotation.background = { ...withRotation.background, type: 'image', image: { asset, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' }, rotation: { images: [asset, `mnt-asset:${'b'.repeat(64)}`], interval: 'open' } }
    const props = setup({ profile: withRotation, initialSection: 'background' })
    fireEvent.click(screen.getByRole('radio', { name: 'Every hour' }))
    expect(lastUpdate(props).next.background.rotation?.interval).toBe('hour')
    fireEvent.click(screen.getByRole('radio', { name: 'Video' }))
    expect(lastUpdate(props).next.background.type).toBe('video')
    const images = screen.getByRole('button', { name: 'Upload images (PNG, JPEG, WebP, up to 5 MB each)' }).closest('.sd-file')!.querySelector('input[type=file]') as HTMLInputElement
    expect(images.multiple).toBe(true)
    const video = screen.getByRole('button', { name: 'Upload a video (MP4 or WebM, up to 30 MB)' }).closest('.sd-file')!.querySelector('input[type=file]') as HTMLInputElement
    expect(video.accept).toBe('video/mp4,video/webm')
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
    // The hint lives with the upload pickers, so ask for the image type without an image.
    const noImage = structuredClone(base)
    noImage.background = { ...noImage.background, type: 'image' }
    setup({ profile: noImage, initialSection: 'background' })
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

describe('SettingsDrawer grid drafts', () => {
  it('preserves raw multiline input and applies edits to the latest profile', () => {
    const props = setup({ initialSection: 'layout' })
    const input = screen.getByRole('textbox', { name: 'Area grid' })
    fireEvent.change(input, { target: { value: 'overview\nbookmarks\n' } })
    expect(input).toHaveValue('overview\nbookmarks\n')
    const newer = structuredClone(base)
    newer.layout.areaStyles = { overview: { bleed: true } }
    const update = props.onProfileChange.mock.calls.at(-1)![0] as (p: ProfileV2) => ProfileV2
    expect(update(newer).layout.areaStyles?.overview.bleed).toBe(true)
  })
  it('shows invalid track feedback on its own field', () => {
    setup({ initialSection: 'layout' })
    const columns = screen.getAllByRole('textbox', { name: 'Column sizes' })[0]
    fireEvent.change(columns, { target: { value: 'bad-track' } })
    expect(screen.getByRole('alert')).toHaveTextContent('valid grid track size')
  })

  it('clears drafts after a profile or grid replacement', () => {
    const props = setup({ initialSection: 'layout' })
    const input = screen.getByRole('textbox', { name: 'Area grid' })
    fireEvent.change(input, { target: { value: 'invalid invalid\ninvalid .' } })
    const replacement = structuredClone(base)
    replacement.meta.id = 'other'
    replacement.layout.areas = ['bookmarks', 'overview']
    props.rerender(replacement)
    expect(input).toHaveValue('bookmarks\noverview')
  })

  it('moves widgets to a shared breakpoint area and removes obsolete styles atomically', () => {
    const profile = structuredClone(base)
    profile.layout.breakpoints = { narrow: { areas: ['bookmarks', 'overview'] }, medium: { areas: ['bookmarks', 'overview'] } }
    profile.layout.areaStyles = { overview: { bleed: true } }
    const props = setup({ profile, initialSection: 'layout' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Area grid' }), { target: { value: 'bookmarks' } })
    const next = lastUpdate(props).next
    expect(next.widgets.every(widget => widget.area === 'bookmarks')).toBe(true)
    expect(next.layout.areaStyles?.overview).toBeUndefined()
    expect(profileIssues(next)).toEqual([])
  })

  it('does not commit an edit that leaves no shared widget area', () => {
    const profile = structuredClone(base)
    profile.layout.breakpoints = { narrow: { areas: ['overview', 'bookmarks'] } }
    const props = setup({ profile, initialSection: 'layout' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Area grid' }), { target: { value: 'newarea' } })
    expect(props.onProfileChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('combobox', { name: 'Widget area' })[0])
    expect(screen.getByRole('option', { name: 'newarea' })).toBeInTheDocument()
  })

  it('does not commit a candidate with an unrelated validation error', () => {
    const profile = structuredClone(base)
    profile.search.defaultEngineId = 'missing'
    const props = setup({ profile, initialSection: 'layout' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Area grid' }), { target: { value: 'overview\nbookmarks\n' } })
    expect(props.onProfileChange).not.toHaveBeenCalled()
  })
})

describe('SettingsDrawer bookmark settings', () => {
  it('changes a bookmark widget style and source without changing other widgets', () => {
    const profile = structuredClone(base)
    const bookmarks = profile.widgets.find(widget => widget.type === 'bookmarks')!
    const props = setup({ profile, initialSection: 'shortcuts' })
    fireEvent.click(screen.getByRole('combobox', { name: 'Website style' }))
    fireEvent.click(screen.getByRole('option', { name: 'Icons only' }))
    const styled = lastUpdate(props).next
    expect(styled.widgets.find(widget => widget.id === bookmarks.id)?.props.style).toBe('icon-only')
    expect(styled.widgets.filter(widget => widget.type !== 'bookmarks')).toEqual(profile.widgets.filter(widget => widget.type !== 'bookmarks'))
    fireEvent.click(screen.getByRole('combobox', { name: 'Bookmark source' }))
    fireEvent.click(screen.getByRole('option', { name: 'Quick links' }))
    expect(lastUpdate(props).next.widgets.find(widget => widget.id === bookmarks.id)?.props.source).toBe(profile.bookmarks.groups[0].id)
  })
})

describe('SettingsDrawer restore defaults', () => {
  it('restores a section from the default profile and keeps unrelated fields', async () => {
    const custom = structuredClone(base)
    custom.theme = { ...custom.theme, radius: 3, preset: 'paper' }
    custom.bookmarks.groups[0].name = 'Mine'
    const props = setup({ profile: custom })
    fireEvent.click(screen.getByRole('button', { name: 'Restore section defaults' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Restore section defaults' }))
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

  it('confirms before the full reset', async () => {
    const props = setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    const native = vi.spyOn(window, 'confirm')
    fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/Resets this profile/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(props.onReset).not.toHaveBeenCalled()
    // jsdom does not focus a clicked button, so focus returns to the theme tab; reopen the section.
    fireEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset settings' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Reset settings' }))
    await waitFor(() => expect(props.onReset).toHaveBeenCalledTimes(1))
    expect(native).not.toHaveBeenCalled()
    native.mockRestore()
  })
})
