import { describe, expect, it } from 'vitest'
import { defaults, validate } from '../model'
import { migrateV1, projectV1 } from './v1'

const image = 'data:image/png;base64,aGVsbG8='
function dependencies() {
  const blobs = new Map<string, Blob>()
  let index = 0
  return {
    blobs,
    id: () => 'profile-id',
    now: () => '2026-01-01T00:00:00.000Z',
    add: async (blob: Blob) => { const ref = `mnt-asset:${(++index).toString(16).padStart(64, '0')}`; blobs.set(ref, blob); return ref },
    get: async (ref: string) => blobs.get(ref),
  }
}

describe('v1 migration', () => {
  it('round trips all legacy fields, including disabled widgets and layout options', async () => {
    const deps = dependencies()
    const settings = { ...defaults, language: 'en' as const, theme: 'light' as const, showClock: false, showDate: false, showSearch: false, hour12: true, columns: 9, alignment: 'left' as const, layout: 'split' as const, reverse: true, overlay: 68, shortcuts: [{ ...defaults.shortcuts[0], iconMode: 'text' as const }] }
    const profile = await migrateV1(settings, deps)
    expect(profile.meta).toMatchObject({ id: 'profile-id', createdAt: deps.now(), updatedAt: deps.now() })
    expect(profile.prefs).toMatchObject({ openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false })
    expect((await projectV1(profile, deps)).settings).toEqual(settings)
    expect(profile.background.dim).toBe(68)
  })

  it('retains brand icon metadata during legacy projection and migration', async () => {
    const deps = dependencies()
    const shortcut = { ...defaults.shortcuts[0], id: 'brand', iconMode: 'brand' as const, iconName: 'github', iconColorMode: 'custom' as const }
    const profile = await migrateV1({ ...defaults, shortcuts: [shortcut] }, deps)
    expect(profile.bookmarks.groups[0].items[0]).toMatchObject(shortcut)
    expect((await projectV1(profile, deps)).settings.shortcuts[0]).toEqual(shortcut)
  })

  it.each([
    ['stacked', false, ['overview', 'bookmarks'], ['overview', 'bookmarks']],
    ['stacked', true, ['bookmarks', 'overview'], ['bookmarks', 'overview']],
    ['split', false, ['bookmarks overview'], ['overview', 'bookmarks']],
    ['split', true, ['overview bookmarks'], ['bookmarks', 'overview']],
  ] as const)('represents %s layout, reverse %s, at desktop and narrow sizes', async (layout, reverse, areas, narrow) => {
    const profile = await migrateV1({ ...defaults, layout, reverse }, dependencies())
    expect(profile.layout.areas).toEqual(areas)
    expect(profile.layout.breakpoints?.narrow?.areas).toEqual(narrow)
    expect(profile.widgets.filter(widget => ['clock', 'date', 'search'].includes(widget.id)).every(widget => widget.area === 'overview')).toBe(true)
    expect(profile.bookmarks.groups[0].name).toBe('常用')
    expect(profile.widgets.find(widget => widget.id === 'bookmarks')!.props).toEqual({ maxColumns: 6 })
    expect((await projectV1(profile, dependencies())).settings).toMatchObject({ layout, reverse })
  })

  it('derives order from areas: split reads left to right and stacked reversed is bookmarks first', async () => {
    const split = await migrateV1({ ...defaults, layout: 'split', reverse: false }, dependencies())
    expect(split.layout.areas).toEqual(['bookmarks overview'])
    const reversed = await migrateV1({ ...defaults, layout: 'split', reverse: true }, dependencies())
    expect(reversed.layout.areas).toEqual(['overview bookmarks'])
    expect((await migrateV1({ ...defaults, reverse: true }, dependencies())).layout.areas).toEqual(['bookmarks', 'overview'])
  })

  it('writes formal v2 fields instead of custom values', async () => {
    const profile = await migrateV1({ ...defaults, overlay: 50, columns: 8, theme: 'light' as const }, dependencies())
    expect(profile.custom.values).toEqual({})
    expect(profile.background).toMatchObject({ type: 'theme', dim: 50 })
    expect(profile.layout).toMatchObject({ contentWidth: 960, align: 'center-center' })
    expect(profile.theme).toMatchObject({ mode: 'light', radius: 14, shadow: 40, color: { text: '#eeeae5' }, colorLight: { bg: '#eeeae4', text: '#302d29' } })
    expect(profile.widgets.find(widget => widget.type === 'bookmarks')!.props).toEqual({ maxColumns: 8 })
    expect((await migrateV1(defaults, dependencies())).theme.colorLight).toBeUndefined()
  })

  it('localizes generated names and recognizes search engines from the template', async () => {
    const zh = await migrateV1(defaults, dependencies())
    expect([zh.meta.name, zh.bookmarks.groups[0].name, zh.search.engines[0].name]).toEqual(['默认', '常用', 'Google'])
    expect(zh.bookmarks.groups[0]).toMatchObject({ builtinName: 'quick-links', items: [expect.objectContaining({ builtinName: 'sample-website', builtinGroup: 'quick-links' })] })
    const custom = await migrateV1({ ...defaults, searchTemplate: 'https://custom.example/search?q={query}' }, dependencies())
    expect(custom.search.engines[0].builtinName).toBe('custom-search')
    expect(zh.bookmarks.groups[0].items[0]).toMatchObject({ builtinName: 'sample-website', builtinIcon: 'sample-website' })
    expect((await projectV1(zh, dependencies())).settings.shortcuts[0]).not.toHaveProperty('builtinIcon')
    expect((await projectV1(zh, dependencies())).settings.shortcuts[0]).not.toHaveProperty('builtinGroup')
    const en = await migrateV1({ ...defaults, language: 'en', searchTemplate: 'https://www.baidu.com/s?wd={query}' }, dependencies())
    expect([en.meta.name, en.bookmarks.groups[0].name, en.search.engines[0].name]).toEqual(['Default', 'Quick links', 'Baidu'])
    const override = await migrateV1({ ...defaults, searchTemplate: 'https://www.baidu.com/s?wd={query}' }, { ...dependencies(), language: 'en' })
    expect([override.meta.name, override.search.engines[0].name]).toEqual(['Default', 'Baidu'])
    expect((await migrateV1({ ...defaults, searchTemplate: 'https://www.baidu.com/s?wd={query}' }, dependencies())).search.engines[0].name).toBe('百度')
    expect((await migrateV1({ ...defaults, searchTemplate: 'https://search.brave.com/search?q={query}' }, dependencies())).search.engines[0].name).toBe('Brave Search')
    expect((await migrateV1({ ...defaults, searchTemplate: 'https://bing.com/search?q={query}' }, dependencies())).search.engines[0].name).toBe('Bing')
    expect((await migrateV1({ ...defaults, searchTemplate: 'https://example.com/?q={query}' }, dependencies())).search.engines[0].name).toBe('自定义')
    expect((await migrateV1({ ...defaults, language: 'en', searchTemplate: 'https://example.com/?q={query}' }, dependencies())).search.engines[0].name).toBe('Custom')
  })

  it('uses legacy validation defaults for missing fields', async () => {
    const deps = dependencies()
    expect((await projectV1(await migrateV1({ language: 'en' }, deps), deps)).settings).toEqual(validate({ language: 'en' }))
  })

  it.each([null, [], { schemaVersion: 2 }, { schemaVersion: 0 }, { columns: 1 }, { shortcuts: 'broken' }])('rejects damaged or unknown input %j', async input => {
    await expect(migrateV1(input, dependencies())).rejects.toThrow()
  })

  it('migrates images and keeps only the effective wallpaper, the supplied blob taking precedence', async () => {
    const deps = dependencies()
    const settings = { ...defaults, wallpaper: image, shortcuts: [{ ...defaults.shortcuts[0], image }] }
    const supplied = new Blob(['separate'], { type: 'image/webp' })
    const profile = await migrateV1(settings, { ...deps, wallpaper: supplied })
    expect(profile.bookmarks.groups[0].items[0].image).toMatch(/^mnt-asset:[a-f0-9]{64}$/)
    expect(deps.blobs.get(profile.background.image!.asset)).toBe(supplied)
    expect(deps.blobs.size).toBe(2)
    expect(profile.custom.values).toEqual({})
    const projected = await projectV1(profile, deps)
    expect(projected.settings).toEqual({ ...settings, wallpaper: undefined })
    expect(projected.wallpaper).toBe(supplied)
  })

  it('stores the inline wallpaper as the effective one when no separate wallpaper exists', async () => {
    const deps = dependencies()
    const profile = await migrateV1({ ...defaults, wallpaper: image }, deps)
    expect(deps.blobs.size).toBe(1)
    expect((await projectV1(profile, deps)).wallpaper).toBe(deps.blobs.get(profile.background.image!.asset))
  })

  it('rejects malformed inline data and missing assets', async () => {
    const deps = dependencies()
    await expect(migrateV1({ ...defaults, wallpaper: 'data:image/png;base64,%%%%' }, deps)).rejects.toThrow()
    const profile = await migrateV1({ ...defaults, shortcuts: [{ ...defaults.shortcuts[0], image }] }, deps)
    await expect(projectV1(profile, { get: async () => undefined })).rejects.toThrow()
  })
})
