import { describe, expect, it } from 'vitest'
import { migrateV1 } from '../migrate/v1'
import { defaults } from '../model'
import { applyInfinityBackup, parseInfinityBackup } from './import'

const fixture = JSON.stringify({
  version: 'v2', extVersion: '11.0.43', backupType: 'local', time: 1,
  data: {
    site: { sites: [
      [
        { type: 'web', name: '  Docs &amp;​ Guides ', target: 'https://docs.example/path?q=1#top', bgType: 'image', bgImage: 'https://infinitypro-img.infinitynewtab.com/never-fetch.png' },
        { type: 'web', name: 'Color site', target: 'http://color.example', bgType: 'color', bgColor: 'rgba(0,116,255,1)', bgText: '  C  ' },
        { name: 'Work', id: 'folder-1', children: [
          { type: 'web', name: 'Folder link', target: 'https://work.example', bgType: 'color', bgColor: '#f14343', bgText: 'W' },
          { type: 'web', name: 'Unsafe', target: 'javascript:alert(1)', bgType: 'image' },
        ] },
      ],
      [{ type: 'web', name: 'Later page', target: 'https://later.example', bgType: 'image' }],
    ] },
    setting: { setting: { layout: { row: 4, col: 6 }, icon: { radius: 0.5, scale: 0.64, isHideIconName: true }, font: { color: 'rgb(1,2,3)' } } },
    wallpaper: { type: 'cloud', url: 'https://infinitypro-img.infinitynewtab.com/wallpaper.jpg' },
    searcher: { searchEngine: {
      current: { name: 'Google', types: [{ name: 'Web', url: 'https://www.google.com/search?q=' }] },
      custom: [{ name: 'Devv', target: 'https://devv.ai/search/%s?lang=zh&isource=x&iname=y&itype=z' }],
    } },
    todo: { todoList: [{ text: 'Finish migration', done: false }, { text: '  ', done: false }] },
    note: { list: [{ title: 'Idea', content: 'Keep it local' }, { title: '', content: '' }] },
    weather: { list: [{ cid: '101280601', name: 'Shenzhen' }] },
    ai: { enabled: true }, gmail: { enabled: true }, notification: { enabled: true },
  },
})

async function profile() {
  return migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'profile', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
}

describe('Infinity backup importer', () => {
  it.each([false, true])('applies against the latest profile (replace=%s)', async replace => {
    const current = await profile()
    parseInfinityBackup(fixture, current) // Preview before subsequent edits.
    current.meta.name = 'Edited after preview'
    current.theme.iconShape = 'square'
    current.bookmarks.groups[0].items.push({ id: 'later', name: 'Later edit', url: 'https://edit.example', color: '#123456', icon: 'E' })
    const result = applyInfinityBackup(fixture, current, replace)
    expect(result.meta.name).toBe('Edited after preview')
    expect(result.theme.iconShape).toBe('circle') // explicitly imported setting
    expect(result.bookmarks.groups.flatMap(group => group.items).some(item => item.id === 'later')).toBe(!replace)
    expect(result.bookmarks.groups.flatMap(group => group.items).some(item => item.name === 'Docs & Guides')).toBe(true)
  })
  it('decodes names, maps pages and folders, converts colors and safely summarizes unsupported data', async () => {
    const result = parseInfinityBackup(fixture, await profile())
    const groups = result.profile.bookmarks.groups
    expect(result.summary).toMatchObject({ groups: 3, links: 4, skipped: 1, todos: 1, notes: 1, engines: 1 })
    expect(groups.map(group => group.name)).toEqual(['Quick links', 'Work', 'Page 2'])
    expect(groups[0].items).toMatchObject([
      { name: 'Docs & Guides', url: 'https://docs.example/path?q=1#top', iconMode: 'auto' },
      { name: 'Color site', color: '#0074ff', icon: 'C', iconMode: 'text' },
    ])
    expect(groups[1].items[0]).toMatchObject({ color: '#f14343', icon: 'W', iconMode: 'text' })
    expect(result.profile.search.defaultEngineId).toBe('google')
    expect(result.profile.search.engines.at(-1)).toMatchObject({ name: 'Devv', template: 'https://devv.ai/search/{query}?lang=zh' })
    expect(result.profile.widgets.filter(widget => widget.type === 'todo')).toHaveLength(1)
    expect(result.profile.widgets.filter(widget => widget.type === 'note')).toHaveLength(1)
    expect(result.profile.layout).toMatchObject({ areas: ['overview', 'bookmarks'] })
    expect(result.profile.widgets.find(widget => widget.type === 'bookmarks')?.props).toMatchObject({ maxColumns: 6, style: 'icon-only' })
    expect(result.profile.theme.iconShape).toBe('circle')
    expect(result.summary.notices).toEqual(['wallpaper', 'weather', 'services'])
    expect(JSON.stringify(result.profile)).not.toContain('infinitypro-img.infinitynewtab.com')
  })

  it('derives names only for empty or URL-like Infinity names', async () => {
    const input = JSON.parse(fixture)
    input.data.site.sites[0].push(
      { type: 'web', name: '', target: 'https://claude.ai', bgType: 'image' },
      { type: 'web', name: 'https://github.com', target: 'https://github.com', bgType: 'image' },
      { type: 'web', name: 'My GitHub', target: 'https://github.com', bgType: 'image' },
    )
    const result = parseInfinityBackup(JSON.stringify(input), await profile())
    const items = result.profile.bookmarks.groups.flatMap(group => group.items)
    expect(items.filter(item => item.url === 'https://github.com').map(item => item.name)).toEqual(['GitHub', 'My GitHub'])
    expect(items.find(item => item.url === 'https://claude.ai')?.name).toBe('Claude')
  })

  it('normalizes cn.bing.com and strips Infinity tracking parameters', async () => {
    const input = JSON.parse(fixture)
    input.data.searcher.searchEngine.current.types[0].url = 'https://cn.bing.com/search?q=&isource=x&iname=y&itype=z'
    const result = parseInfinityBackup(JSON.stringify(input), await profile())
    expect(result.profile.search.defaultEngineId).toBe('bing')
    expect(result.profile.search.engines.find(engine => engine.id === 'bing')?.template).toBe('https://www.bing.com/search?q={query}')
  })

  it('converts custom q= templates by adding the query token and selects the tracking-free template', async () => {
    const input = JSON.parse(fixture)
    input.data.searcher.searchEngine.current.types[0].url = 'https://other.example/search?q=&isource=x&iname=y&itype=z'
    input.data.searcher.searchEngine.custom = [{ name: 'Other', target: 'https://other.example/search?q=&isource=x&iname=y&itype=z' }]
    const result = parseInfinityBackup(JSON.stringify(input), await profile())
    const custom = result.profile.search.engines.at(-1)!
    expect(custom.template).toBe('https://other.example/search?q={query}')
    expect(result.profile.search.defaultEngineId).toBe(custom.id)
  })

  it.each([
    ['missing data', { version: 'v2' }],
    ['invalid sites', { version: 'v2', data: { site: { sites: {} } } }],
    ['v1-looking backup', { version: 'v1', settings: defaults }],
  ])('rejects %s with a readable format error', async (_label, value) => {
    const current = await profile()
    expect(() => parseInfinityBackup(JSON.stringify(value), current)).toThrow()
  })
})
