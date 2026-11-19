import { describe, expect, it } from 'vitest'
import { migrateV1 } from '../migrate/v1'
import { defaults } from '../model'
import { parseNightTabBackup } from './import'
import { parseProfileV2 } from '../schema/profile'

const fixture = JSON.stringify({
  nightTab: true,
  version: '7.2.0',
  bookmark: [{ name: { text: 'Work', show: true }, collapse: true, toolbar: {}, items: [
    { url: 'https://docs.example', display: { name: { text: 'Docs' }, visual: { type: 'letter', letter: { text: 'D' } } }, color: { by: 'custom', rgb: { r: 18, g: 52, b: 86 } }, accent: { by: 'theme', rgb: { r: 170, g: 187, b: 204 } } },
    { url: 'javascript:alert(1)', display: { name: { text: 'Unsafe' }, visual: { type: 'letter', letter: { text: '!' } } } },
  ] }],
  state: { theme: { accent: { by: 'custom', rgb: { r: 170, g: 187, b: 204 } }, style: 'light', radius: 10, font: { display: { name: 'Oswald' }, ui: { name: 'System' } }, background: { type: 'gradient', gradient: { angle: 80, start: { rgb: { r: 16, g: 16, b: 16 } }, end: { rgb: { r: 48, g: 48, b: 48 } } } } } },
  extensionField: true,
})

async function baseProfile() {
  return migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'profile', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
}

describe('nightTab backup importer', () => {
  it('maps groups, safe links, theme fields and warns about unknown fields', async () => {
    const result = parseNightTabBackup(fixture, await baseProfile())
    expect(result.count).toBe(1)
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Work', collapsed: true, items: [{ name: 'Docs', url: 'https://docs.example', color: '#123456', icon: 'D', iconMode: 'text' }] })
    expect(result.profile.theme).toMatchObject({ mode: 'light', color: { accent: '#aabbcc' }, radius: 1.6, font: { display: '"Oswald", "Fjalla One", sans-serif', ui: '"System", "Open Sans", sans-serif' } })
    expect(result.profile.background).toMatchObject({ type: 'gradient', gradient: { angle: 80, stops: ['#101010', '#303030'] } })
    expect(result.warnings).toContain('Ignored unrecognized field: extensionField')
  })

  it('ignores inherited keys in nightTab engine, icon and alignment names', async () => {
    const backup = JSON.parse(fixture)
    backup.bookmark[0].items[0].display.visual = { type: 'icon', icon: { name: 'constructor', prefix: 'fas' } }
    backup.state.header = { item: { justify: 'constructor' }, search: { engine: { selected: 'constructor' } } }
    backup.state.group = { area: { justify: '__proto__' } }
    const result = parseNightTabBackup(JSON.stringify(backup), await baseProfile())
    const link = result.profile.bookmarks.groups.at(-1)!.items[0]
    expect(link.iconMode).not.toBe('lucide')
    expect(typeof link.iconName === 'string' || link.iconName === undefined).toBe(true)
    expect(result.profile.search.engines.some(engine => engine.id === 'nighttab-constructor')).toBe(false)
    expect(result.profile.custom.css).toContain('justify-content: flex-start')
    expect(result.profile.custom.css).not.toMatch(/function|\[object/)
  })

  it('warns without throwing for unrecognized structures', async () => {
    const result = parseNightTabBackup(JSON.stringify({ exportVersion: 1, mystery: true }), await baseProfile())
    expect(result.count).toBe(0)
    expect(result.warnings).toContain('No bookmark groups were found')
    expect(result.warnings).toContain('Ignored unrecognized field: exportVersion')
  })

  it('maps an unmarked bookmark array cautiously and warns about the missing marker', async () => {
    const result = parseNightTabBackup(JSON.stringify({ bookmark: [{ name: { text: 'Personal', show: true }, collapse: false, toolbar: {}, items: [{ url: 'https://example.org', display: { name: { text: 'Example' }, visual: { type: 'icon', icon: { name: 'globe' } } }, color: { by: 'theme' } }] }] }), await baseProfile())
    expect(result.count).toBe(1)
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Personal', items: [{ name: 'Example', iconMode: 'brand', iconName: 'fa-globe', iconColorMode: 'accent', brand: { slug: 'fa-globe', viewBox: '0 0 496 512' } }] })
    expect(result.warnings).toContain('Backup is missing the nightTab format marker; imported recognized fields only')
  })
})

const color = (r: number, g: number, b: number) => ({ hsl: { h: 0, s: 0, l: 0 }, rgb: { r, g, b } })
const item = (url: string, name: string, visual: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  url, display: { alignment: 'center-center', direction: 'vertical', order: 'visual-name', rotate: 0, translate: { x: 0, y: 0 }, gutter: 25, name: { show: true, text: name, size: 7 }, visual: { show: true, size: 25, letter: { text: '' }, icon: { name: '', prefix: '', label: '' }, image: { url: '' }, shadow: { size: 0 }, ...visual } },
  accent: { by: 'theme', ...color(0, 0, 0) }, color: { by: 'theme', ...color(0, 0, 0), opacity: 100 }, background: { show: false, type: 'image', opacity: 100, image: { url: '' }, video: { url: '' } }, border: 0, shape: { wide: false, tall: false }, timestamp: 1, ...extra,
})

/** Shaped like a nightTab 7 export: `state` holds layout, header, bookmark and theme; `bookmark` holds the groups. */
const fullBackup = {
  nightTab: true,
  version: '7.5.0',
  state: {
    language: 'system',
    layout: { alignment: 'top-left', order: 'header-bookmark', direction: 'vertical', size: 120, width: 80, padding: 40, gutter: 20, scrollbar: 'auto', title: 'My desk', favicon: '' },
    header: {
      greeting: { show: true, type: 'good', custom: '', name: 'Ada', size: 100, newLine: false },
      transitional: { show: false, type: 'time-and-date', size: 100, newLine: false },
      clock: { hour: { show: true, display: 'number' }, minute: { show: true, display: 'number' }, second: { show: true, display: 'number' }, separator: { show: true, text: '.' }, meridiem: { show: false }, hour24: { show: false }, size: 100, newLine: false },
      date: { day: { show: true, display: 'word', weekStart: 'sunday', length: 'short' }, date: { show: true, display: 'number', ordinal: true }, month: { show: true, display: 'word', length: 'long', ordinal: true }, year: { show: false, display: 'number' }, separator: { show: true, text: '/' }, format: 'month-date', size: 100, newLine: false },
      search: { show: true, width: { by: 'auto', size: 30 }, engine: { selected: 'custom', custom: { name: 'Docs', url: 'https://docs.example/search', queryName: 'term' } }, text: { justify: 'center' }, size: 100, newLine: false, newTab: true },
    },
    bookmark: { size: 100, url: { show: true }, line: { show: true }, shadow: { show: true }, hoverScale: { show: true }, orientation: 'bottom', style: 'list', newTab: true },
    theme: {
      accent: { ...color(255, 85, 0), random: { active: true, style: 'any' }, cycle: { active: false, speed: 300, step: 10 } },
      font: { display: { name: 'Fjalla One', weight: 400, style: 'normal' }, ui: { name: '', weight: 400, style: 'normal' } },
      background: { type: 'image', image: { url: 'https://images.example/wall.jpg', blur: 0, grayscale: 0, scale: 100, accent: 0, opacity: 100, vignette: { opacity: 0, start: 90, end: 70 } } },
      style: 'dark', radius: 12, shadow: 75, custom: { all: [{ name: 'Mine' }], edit: false },
    },
  },
  bookmark: [{ name: { show: true, text: 'Daily' }, collapse: false, toolbar: { openAll: { show: true } }, items: [
    item('https://github.com/', 'GitHub', { type: 'icon', icon: { name: 'github', prefix: 'fab', label: 'GitHub' } }),
    item('https://mail.example/', 'Mail', { type: 'icon', icon: { name: 'envelope', prefix: 'fas', label: 'Envelope' } }),
    item('https://rare.example/', 'Rare', { type: 'icon', icon: { name: 'dragon', prefix: 'fas', label: 'Dragon' } }),
    item('https://news.example/', 'News', { type: 'letter', letter: { text: 'NW' } }, { color: { by: 'custom', ...color(1, 2, 3), opacity: 100 } }),
    item('https://art.example/', 'Art', { type: 'letter', letter: { text: '' } }, { accent: { by: 'custom', ...color(16, 32, 48) } }),
  ] }],
}

describe('nightTab 7 backup', () => {
  it('draws Font Awesome icons from the bundled subset and falls back to automatic icons', async () => {
    const { profile } = parseNightTabBackup(JSON.stringify(fullBackup), await baseProfile())
    const items = profile.bookmarks.groups.at(-1)!.items
    expect(items.map(link => [link.name, link.iconMode, link.iconName])).toEqual([['GitHub', 'brand', 'fa-github'], ['Mail', 'brand', 'fa-envelope'], ['Rare', 'auto', undefined], ['News', 'text', undefined], ['Art', 'text', undefined]])
    expect(items[3]).toMatchObject({ icon: 'NW', color: '#010203' })
    expect(items[4]).toMatchObject({ icon: 'A', color: '#102030' })
  })

  it('imports clock, date, greeting, search, layout and bookmark settings', async () => {
    const { profile, warnings } = parseNightTabBackup(JSON.stringify(fullBackup), await baseProfile())
    const widget = <T extends string>(type: T) => profile.widgets.find(entry => entry.type === type)!
    expect(widget('clock')).toMatchObject({ hidden: false, props: { hours: true, minutes: true, seconds: true, hour12: true, separator: '.' } })
    expect(widget('date')).toMatchObject({ hidden: false, props: { format: 'custom', weekday: true, day: true, month: true, year: false, weekdayStyle: 'short', monthStyle: 'long', ordinal: true, weekStart: 'sunday', separator: '/', order: ['weekday', 'month', 'day', 'year'] } })
    expect(profile.search.engines.find(engine => engine.id === profile.search.defaultEngineId)).toMatchObject({ name: 'Docs', template: 'https://docs.example/search?term={query}' })
    // The nightTab hover comes with the look, so Promptab's own lift is off.
    expect(profile.prefs).toMatchObject({ openSearchInNewTab: true, openShortcutsInNewTab: true, liftOnHover: false, accentOnOpen: 'random', pageTitle: 'My desk' })
    expect(profile.layout.align).toBe('top-left')
    expect(profile.theme).toMatchObject({ scale: 1.2, radius: 1.92, shadow: 18.75, mode: 'dark', color: { accent: '#ff5500' } })
    expect(profile.layout.contentWidth).toBe(1920)
    expect(widget('bookmarks')).toMatchObject({ props: { style: 'block', showUrl: true, groupDisplay: 'sections', openAll: true } })
    expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining('Background image: download https://images.example/wall.jpg'), expect.stringContaining('1 saved nightTab themes')]))
    expect(() => parseProfileV2(profile)).not.toThrow()
  })

  it('hides widgets nightTab hid and maps preset search engines', async () => {
    const backup = structuredClone(fullBackup)
    backup.state.header.clock = { ...backup.state.header.clock, hour: { show: false, display: 'number' }, minute: { show: false, display: 'number' }, second: { show: false, display: 'number' } }
    backup.state.header.search = { ...backup.state.header.search, show: false, engine: { selected: 'youtube', custom: { name: '', url: '', queryName: '' } } }
    const { profile } = parseNightTabBackup(JSON.stringify(backup), await baseProfile())
    expect(profile.widgets.find(entry => entry.type === 'clock')!.hidden).toBe(true)
    expect(profile.widgets.find(entry => entry.type === 'search')!.hidden).toBe(true)
    expect(profile.search.engines.find(engine => engine.id === profile.search.defaultEngineId)!.template).toBe('https://www.youtube.com/results?search_query={query}')
    expect(() => parseProfileV2(profile)).not.toThrow()
  })

  it('reuses an engine the profile already has instead of adding a duplicate', async () => {
    const backup = structuredClone(fullBackup)
    backup.state.header.search = { ...backup.state.header.search, engine: { selected: 'duckduckgo', custom: { name: '', url: '', queryName: '' } } }
    const current = await baseProfile()
    const { profile } = parseNightTabBackup(JSON.stringify(backup), current)
    expect(profile.search.defaultEngineId).toBe('duckduckgo')
    expect(new Set(profile.search.engines.map(engine => engine.id)).size).toBe(profile.search.engines.length)
  })

  it('turns each website\'s nightTab display into tile settings the website editor can change', async () => {
    const backup = structuredClone(fullBackup)
    const link = item('https://tiles.example', 'Tiles', { show: false, size: 50 })
    link.display = { ...link.display, direction: 'horizontal', order: 'name-visual', gutter: 50, rotate: 15, name: { ...link.display.name, show: false, size: 14 } }
    backup.bookmark[0].items = [{ ...link, border: 2, shape: { wide: true, tall: false }, color: { by: 'custom', ...color(1, 2, 3), opacity: 20 } }]
    const { profile } = parseNightTabBackup(JSON.stringify(backup), await baseProfile())
    expect(profile.bookmarks.groups.at(-1)!.items[0].tile).toEqual({ span: 'wide', background: '#010203', opacity: 20, border: 8, direction: 'horizontal', nameFirst: true, hideName: true, hideIcon: true, gap: 1.25, iconScale: 2, nameScale: 2, rotate: 15 })
    expect(() => parseProfileV2(profile)).not.toThrow()
  })

  it('keeps the imported look adjustable: sizes, wallpaper and nightTab options become settings', async () => {
    const backup = structuredClone(fullBackup) as typeof fullBackup & { state: Record<string, unknown> }
    backup.state.header.clock.size = 250
    backup.state.header.search.size = 80
    backup.state.toolbar = { location: 'corner', position: 'top-right', size: 150, accent: { show: true }, add: { show: false }, edit: { show: true } }
    backup.state.bookmark = { ...backup.state.bookmark, size: 115, line: { show: false }, hoverScale: { show: true }, shadow: { show: false } }
    backup.state.theme.background.image = { ...backup.state.theme.background.image, opacity: 40, blur: 6, grayscale: 30, scale: 120, vignette: { opacity: 25, start: 90, end: 40 } }
    const current = await baseProfile()
    current.custom.values = { '--nt-width': 33, '--mine': 2 }
    const { profile, warnings } = parseNightTabBackup(JSON.stringify(backup), current)
    const size = (type: string) => (profile.widgets.find(entry => entry.type === type)!.props as { size?: number }).size
    expect([size('clock'), size('date'), size('search'), size('bookmarks')]).toEqual([2.5, undefined, 0.8, 1.15])
    // A corner toolbar sits outside the zoomed layout, so it also carries nightTab's overall size.
    expect(size('toolbar')).toBe(1.8)
    // No image is chosen yet: its look waits for the file.
    expect(profile.background).toMatchObject({ type: 'theme', nextLook: { opacity: 40, blur: 6, grayscale: 30, scale: 1.2, vignette: 25 } })
    const variables = Object.fromEntries(profile.custom.variables.map(variable => [variable.name, variable]))
    expect(Object.keys(variables)).toEqual(['--nt-width', '--nt-padding', '--nt-gutter', '--nt-search-opacity', '--nt-toolbar-opacity', '--nt-open-all-opacity', '--nt-line', '--nt-hover-zoom', '--nt-hover-shadow'])
    expect(variables['--nt-width']).toMatchObject({ type: 'range', min: 0, max: 100, unit: '', default: 80, label: { en: 'nightTab layout width (% of window)' } })
    expect([variables['--nt-line'].default, variables['--nt-hover-zoom'].default, variables['--nt-hover-shadow'].default]).toEqual([0, 1, 0])
    // Values for the old look's variables are dropped; other values stay.
    expect(profile.custom.values).toEqual({ '--mine': 2 })
    const css = profile.custom.css
    expect(css).toContain('--nt-010: var(--mnt-bg)')
    expect(css).toContain('--nt-radius: calc(var(--mnt-radius) * var(--nt-unit))')
    expect(css).toContain('var(--mnt-shadow-strength, 40)')
    expect(css).toContain('[data-show-url] .mnt-bookmark-block .mnt-link::after')
    expect(css).not.toMatch(/\.wallpaper-media[^{]*\{[^}]*!important/)
    expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining('The nightTab look follows your settings')]))
    expect(() => parseProfileV2(profile)).not.toThrow()
  })

  it('applies the wallpaper look to an image the person already chose', async () => {
    const current = await baseProfile()
    current.background = { type: 'image', dim: 20, image: { asset: 'mnt-asset:wall', blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } }
    const backup = structuredClone(fullBackup)
    backup.state.theme.background.image = { ...backup.state.theme.background.image, opacity: 70, grayscale: 100, vignette: { opacity: 40, start: 90, end: 50 } }
    const { profile } = parseNightTabBackup(JSON.stringify(backup), current)
    expect(profile.background).toMatchObject({ type: 'image', dim: 0, image: { asset: 'mnt-asset:wall', opacity: 70, grayscale: 100, vignette: 40, scale: 1, position: 'center' } })
    expect(profile.background.nextLook).toBeUndefined()
  })
})
