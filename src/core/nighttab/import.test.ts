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
    expect(result.profile.theme).toMatchObject({ mode: 'light', color: { accent: '#aabbcc' }, radius: 10, font: { display: 'barlow-condensed', ui: 'system' } })
    expect(result.profile.background).toMatchObject({ type: 'gradient', gradient: { angle: 80, stops: ['#101010', '#303030'] } })
    expect(result.warnings).toContain('Ignored unrecognized field: extensionField')
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
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Personal', items: [{ name: 'Example', iconMode: 'lucide', iconName: 'globe' }] })
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
  it('maps brand icons to automatic icons and generic Font Awesome icons to built-in ones', async () => {
    const { profile } = parseNightTabBackup(JSON.stringify(fullBackup), await baseProfile())
    const items = profile.bookmarks.groups.at(-1)!.items
    expect(items.map(link => [link.name, link.iconMode, link.iconName])).toEqual([['GitHub', 'auto', undefined], ['Mail', 'lucide', 'mail'], ['Rare', 'auto', undefined], ['News', 'text', undefined], ['Art', 'text', undefined]])
    expect(items[3]).toMatchObject({ icon: 'NW', color: '#010203' })
    expect(items[4]).toMatchObject({ icon: 'A', color: '#102030' })
  })

  it('imports clock, date, greeting, search, layout and bookmark settings', async () => {
    const { profile, warnings } = parseNightTabBackup(JSON.stringify(fullBackup), await baseProfile())
    const widget = <T extends string>(type: T) => profile.widgets.find(entry => entry.type === type)!
    expect(widget('clock')).toMatchObject({ hidden: false, props: { hours: true, minutes: true, seconds: true, hour12: true, separator: '.' } })
    expect(widget('date')).toMatchObject({ hidden: false, props: { format: 'custom', weekday: true, day: true, month: true, year: false, weekdayStyle: 'short', monthStyle: 'long', ordinal: true, weekStart: 'sunday', separator: '/', order: ['weekday', 'month', 'day', 'year'] } })
    expect(profile.search.engines.find(engine => engine.id === profile.search.defaultEngineId)).toMatchObject({ name: 'Docs', template: 'https://docs.example/search?term={query}' })
    expect(profile.prefs).toMatchObject({ openSearchInNewTab: true, openShortcutsInNewTab: true, liftOnHover: true, accentOnOpen: 'random', pageTitle: 'My desk' })
    expect(profile.layout.align).toBe('top-left')
    expect(profile.theme).toMatchObject({ scale: 1.2, radius: 12, mode: 'dark', color: { accent: '#ff5500' } })
    expect(widget('bookmarks')).toMatchObject({ props: { style: 'list', showUrl: true } })
    expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining('image background'), expect.stringContaining('1 saved nightTab themes')]))
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
})

