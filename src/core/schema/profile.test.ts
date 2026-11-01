import { describe, expect, it } from 'vitest'
import { MessageError, translate } from '../../i18n'
import { profileV2Schema, parseProfileV2, profileIssues } from './profile'

const profile = {
  schemaVersion: 2,
  meta: { id: 'main', name: 'Main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#ffffff', accent: '#90d5cd' }, font: { display: 'serif', ui: 'system' }, radius: 16, shadow: 40, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme', dim: 35 },
  layout: { contentWidth: 1000, align: 'center-center', gap: 16, areas: ['clock search', 'links links'] },
  widgets: [{ id: 'clock', type: 'clock', area: 'clock', order: 0, props: { hour12: false } }],
  bookmarks: { groups: [{ id: 'favorites', name: 'Favorites', collapsed: false, items: [{ id: 'example', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E', iconMode: 'auto' }] }] },
  search: { engines: [{ id: 'google', name: 'Google', template: 'https://google.com/search?q={query}' }], defaultEngineId: 'google' },
  custom: { css: '', cssEnabled: false, variables: [{ name: '--glow', label: { 'zh-CN': '光晕', en: 'Glow' }, type: 'range', min: 0, max: 40, unit: 'px', default: 12 }], values: { '--glow': 12 } },
}

describe('profile v2 schema', () => {
  it('accepts a profile with current features and custom variables', () => {
    expect(parseProfileV2(profile)).toEqual(profile)
  })

  it.each(['tile', 'list', 'minimal', 'card', 'icon-only'])('preserves the %s bookmark style and group source', style => {
    const candidate = { ...profile, widgets: [{ id: 'links', type: 'bookmarks', area: 'links', order: 0, props: { style, source: 'favorites', showGroupTitles: false, maxColumns: 4 } }] }
    expect(parseProfileV2(candidate).widgets[0].props).toEqual(candidate.widgets[0].props)
  })

  it('preserves explicit icon metadata through parsing', () => {
    for (const iconMode of ['brand', 'lucide', 'emoji']) {
      const item = { ...profile.bookmarks.groups[0].items[0], iconMode, iconName: iconMode === 'emoji' ? '🚀' : 'github', iconColorMode: 'accent', ...(iconMode === 'brand' ? { brand: { slug: 'github', title: 'GitHub', path: 'M12 2 2 12 12 22 22 12Z', hex: '181717' } } : {}) }
      const candidate = { ...profile, bookmarks: { groups: [{ ...profile.bookmarks.groups[0], items: [item] }] } }
      expect(parseProfileV2(candidate).bookmarks.groups[0].items[0]).toEqual(item)
    }
  })

  it('reports nested validation paths and a localizable message', () => {
    const invalid = structuredClone(profile)
    invalid.bookmarks.groups[0].items[0].url = 'javascript:alert(1)'
    const result = profileV2Schema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['bookmarks', 'groups', 0, 'items', 0, 'url'])
    try { parseProfileV2(invalid); expect.fail('expected validation failure') } catch (error) {
      expect(error).toBeInstanceOf(MessageError)
      expect((error as MessageError).params?.path).toBe('bookmarks.groups.0.items.0.url')
      expect(translate('en', (error as MessageError).key)).toBeTruthy()
    }
  })

  it('requires 64 hexadecimal asset IDs for link and background images', () => {
    const valid = `mnt-asset:${'a1'.repeat(32)}`
    const linkProfile = (image: string) => ({ ...profile, bookmarks: { groups: [{ ...profile.bookmarks.groups[0], items: [{ ...profile.bookmarks.groups[0].items[0], image }] }] } })
    const backgroundProfile = (asset: string) => ({ ...profile, background: { type: 'image', dim: 0, image: { asset, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } })
    expect(profileV2Schema.safeParse(linkProfile(valid)).success).toBe(true)
    expect(profileV2Schema.safeParse(backgroundProfile(valid)).success).toBe(true)
    for (const bad of ['mnt-asset:abc', `mnt-asset:${'A'.repeat(64)}`, `mnt-asset:${'g'.repeat(64)}`, `mnt-asset:${'a'.repeat(64)}extra`, 'data:image/png;base64,AAAA']) {
      expect(profileV2Schema.safeParse(linkProfile(bad)).success).toBe(false)
      expect(profileV2Schema.safeParse(backgroundProfile(bad)).success).toBe(false)
    }
  })

  it('renders path, expected format and actual value in both languages', () => {
    const invalid = { ...profile, background: { type: 'image', dim: 0, image: { asset: 'bad-id', blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } }
    try { parseProfileV2(invalid); expect.fail('expected validation failure') } catch (error) {
      expect(error).toBeInstanceOf(MessageError)
      const message = error as MessageError
      expect(message.params).toMatchObject({ path: 'background.image.asset', expected: 'mnt-asset:<64 hex>', value: 'bad-id' })
      for (const language of ['en', 'zh-CN'] as const) {
        const text = translate(language, message.key, message.params)
        expect(text).toContain('background.image.asset')
        expect(text).toContain('mnt-asset:<64 hex>')
        expect(text).toContain('bad-id')
      }
    }
  })

  it('accepts each supported custom variable type', () => {
    const label = { 'zh-CN': '选项', en: 'Option' }
    const variables = [
      { name: '--color', label, type: 'color', default: '#ffffff' },
      { name: '--enabled', label, type: 'toggle', default: 1 },
      { name: '--style', label, type: 'select', options: ['soft', 'sharp'], default: 'soft' },
    ]
    expect(profileV2Schema.safeParse({ ...profile, custom: { ...profile.custom, variables } }).success).toBe(true)
    expect(profileV2Schema.safeParse({ ...profile, custom: { ...profile.custom, variables: [{ ...variables[2], default: 'missing' }] } }).success).toBe(false)
  })

  it('rejects malformed current settings and variable declarations', () => {
    expect(profileV2Schema.safeParse({ ...profile, schemaVersion: 1 }).success).toBe(false)
    expect(profileV2Schema.safeParse({ ...profile, theme: { ...profile.theme, iconSize: 200 } }).success).toBe(false)
    expect(profileV2Schema.safeParse({ ...profile, search: { ...profile.search, engines: [{ id: 'x', name: 'X', template: 'https://example.com' }] } }).success).toBe(false)
    expect(profileV2Schema.safeParse({ ...profile, custom: { ...profile.custom, variables: [{ ...profile.custom.variables[0], name: 'glow' }] } }).success).toBe(false)
  })

  const mutate = (change: (draft: any) => void) => { const draft = structuredClone(profile); change(draft); return draft }
  const bad = (change: (draft: any) => void) => profileIssues(mutate(change))

  it('applies the default dim and rejects lowercase-only violations', () => {
    expect(parseProfileV2(mutate(d => { delete d.background.dim })).background.dim).toBe(35)
    expect(bad(d => { d.theme.color.bg = '#ABCDEF' })).toEqual([])
    expect(bad(d => { d.theme.color.bg = 'blue' })[0].path).toBe('theme.color.bg')
    expect(bad(d => { d.bookmarks.groups[0].items[0].image = `mnt-asset:${'A1'.repeat(32)}` })[0].path).toBe('bookmarks.groups.0.items.0.image')
  })

  it.each([
    ['theme.radius', 0, 28], ['theme.shadow', 0, 100], ['theme.glass', 0, 100], ['background.dim', 0, 80], ['theme.scale', 0.5, 2], ['layout.contentWidth', 480, 1920], ['layout.gap', 0, 200],
  ])('enforces the range of %s', (path, min, max) => {
    const set = (value: number) => mutate(d => { const keys = path.split('.'); const last = keys.pop()!; keys.reduce((o, k) => o[k], d)[last] = value })
    for (const ok of [min, max]) expect(profileV2Schema.safeParse(set(ok)).success, `${path}=${ok}`).toBe(true)
    for (const no of [min - 0.5 - (min === 0 ? 0 : 0), max + 1]) expect(profileIssues(set(no))[0]?.path, `${path}=${no}`).toBe(path)
  })

  it('enforces image blur 0-40, grayscale 0-100 and scale 0.5-2', () => {
    const image = { asset: `mnt-asset:${'a'.repeat(64)}`, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' }
    const withImage = (change: object) => mutate(d => { d.background = { type: 'image', dim: 0, image: { ...image, ...change } } })
    for (const ok of [{ blur: 40 }, { grayscale: 100 }, { scale: 0.5 }, { scale: 2 }]) expect(profileV2Schema.safeParse(withImage(ok)).success).toBe(true)
    for (const [key, value] of [['blur', 41], ['blur', -1], ['grayscale', 101], ['scale', 0.4], ['scale', 2.1]] as const) expect(profileIssues(withImage({ [key]: value }))[0].path).toBe(`background.image.${key}`)
  })

  it('validates widget props per type while keeping empty props valid', () => {
    const widgets = (...items: object[]) => mutate(d => { d.widgets = items; d.layout.areas = ['a'] })
    const w = (type: string, props: object) => ({ id: type, type, area: 'a', order: 0, props })
    for (const type of ['date', 'search', 'bookmarks', 'clock', 'greeting', 'text', 'spacer']) expect(profileV2Schema.safeParse(widgets(w(type, {}))).success, type).toBe(true)
    expect(profileV2Schema.safeParse(widgets(w('bookmarks', { maxColumns: 2 }), { ...w('clock', { hour12: true, extra: 1 }), id: 'c' })).success).toBe(true)
    expect(profileIssues(widgets(w('bookmarks', { maxColumns: 11 })))[0].path).toBe('widgets.0.props.maxColumns')
    expect(profileIssues(widgets(w('bookmarks', { maxColumns: 1 })))[0].path).toBe('widgets.0.props.maxColumns')
    expect(profileIssues(widgets(w('bookmarks', { maxColumns: 2.5 })))[0].path).toBe('widgets.0.props.maxColumns')
    expect(profileIssues(widgets(w('clock', { hour12: 'yes' })))[0].path).toBe('widgets.0.props.hour12')
    expect(profileIssues(widgets(w('nope', {}))).length).toBeGreaterThan(0)
  })

  it('rejects duplicate group, bookmark and widget ids', () => {
    const link = profile.bookmarks.groups[0].items[0]
    expect(bad(d => { d.bookmarks.groups.push({ ...d.bookmarks.groups[0], items: [] }) })[0]).toMatchObject({ path: 'bookmarks.groups.1.id', expected: 'unique group id' })
    expect(bad(d => { d.bookmarks.groups.push({ id: 'other', name: 'Other', collapsed: false, items: [link] }) })[0]).toMatchObject({ path: 'bookmarks.groups.1.items.0.id' })
    expect(bad(d => { d.bookmarks.groups[0].items.push(link) })[0]).toMatchObject({ path: 'bookmarks.groups.0.items.1.id' })
    expect(bad(d => { d.widgets.push({ ...d.widgets[0] }) })[0]).toMatchObject({ path: 'widgets.1.id', expected: 'unique widget id' })
  })

  it('requires the default engine to exist', () => {
    expect(bad(d => { d.search.defaultEngineId = 'missing' })[0]).toMatchObject({ path: 'search.defaultEngineId', value: 'missing' })
  })

  it('requires each widget area in layout.areas and every breakpoint', () => {
    expect(bad(d => { d.widgets[0].area = 'ghost' })[0]).toMatchObject({ path: 'widgets.0.area', value: 'ghost' })
    expect(profileV2Schema.safeParse(mutate(d => { d.layout.breakpoints = { narrow: { areas: ['clock', 'links'] } } })).success).toBe(true)
    expect(bad(d => { d.layout.breakpoints = { narrow: { areas: ['links'] } } })[0]).toMatchObject({ path: 'widgets.0.area', expected: expect.stringContaining('breakpoints.narrow') })
    expect(bad(d => { d.layout.breakpoints = { medium: { areas: ['links'] } } })[0].expected).toContain('breakpoints.medium')
  })

  it('accepts safe grid tracks and rejects unsafe or malformed tracks at every grid level', () => {
    const valid = ['1fr', '0', '12.5px', '50%', 'auto', 'min-content', 'max-content', 'minmax(0, 1fr)', 'repeat(2, minmax(10px, 1fr))', 'repeat(100, 1fr)']
    for (const track of valid) {
      expect(profileIssues(mutate(d => { d.layout.columns = [track, '1fr']; d.layout.rows = [track] })), track).toEqual([])
    }
    const invalid = ['', '1fr; color:red', 'url(https://example.com)', 'var(--x)', 'calc(1px + 2px)', '-1fr', '12', '1fr 2fr', 'minmax(1fr)', 'minmax(1fr, 2fr, 3fr)', 'repeat(0, 1fr)', 'repeat(101, 1fr)', 'repeat(2.5, 1fr)', 'repeat(2,)', 'minmax(minmax(minmax(minmax(minmax(0, 1fr), 1fr), 1fr), 1fr), 1fr)']
    for (const track of invalid) {
      const candidate = mutate(d => { d.layout.columns = [track, '1fr']; d.layout.breakpoints = { narrow: { areas: ['clock', 'links'], rows: [track] } } })
      const issues = profileIssues(candidate, 'zh-CN')
      expect(issues, track).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'layout.columns.0', expected: '有效的网格轨道尺寸', value: track }),
        expect.objectContaining({ path: 'layout.breakpoints.narrow.rows.0', expected: '有效的网格轨道尺寸', value: track }),
      ]))
    }
  })

  it('localizes validation expectations while preserving issue details', () => {
    const issues = profileIssues(mutate(d => { d.theme.color.bg = 'blue'; d.theme.radius = 99 }), 'zh-CN')
    expect(issues).toHaveLength(2)
    expect(issues[0]).toMatchObject({ path: 'theme.color.bg', expected: '#RRGGBB 颜色', value: 'blue' })
    expect(issues[1]).toMatchObject({ path: 'theme.radius', expected: '数字 0-28', value: '99' })
    expect(() => parseProfileV2(mutate(d => { d.theme.color.bg = 'blue' }), 'zh-CN')).toThrow('error.profileValidation')
  })

  it('lists every issue with path, expected and value', () => {
    expect(profileIssues(profile)).toEqual([])
    const issues = bad(d => { d.theme.color.accent = 'teal'; d.theme.radius = 99; d.bookmarks.groups[0].items[0].url = 'javascript:x' })
    expect(issues).toHaveLength(3)
    expect(issues).toContainEqual({ path: 'theme.color.accent', expected: '#RRGGBB color', value: 'teal' })
    expect(issues).toContainEqual({ path: 'theme.radius', expected: 'number 0-28', value: '99' })
    expect(issues.find(issue => issue.path.endsWith('url'))).toMatchObject({ value: 'javascript:x' })
    expect(profileIssues(null)[0].path).toBe('$')
  })
})
