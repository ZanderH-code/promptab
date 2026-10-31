import { describe, expect, it } from 'vitest'
import { MessageError, translate } from '../../i18n'
import { profileV2Schema, parseProfileV2 } from './profile'

const profile = {
  schemaVersion: 2,
  meta: { id: 'main', name: 'Main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#ffffff', accent: '#90d5cd' }, font: { display: 'serif', ui: 'system' }, radius: 16, shadow: 40, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme' },
  layout: { contentWidth: 1000, align: 'center', gap: 16, areas: ['clock search', 'links links'] },
  widgets: [{ id: 'clock', type: 'clock', area: 'clock', order: 0, props: { hour12: false } }],
  bookmarks: { groups: [{ id: 'favorites', name: 'Favorites', collapsed: false, items: [{ id: 'example', name: 'Example', url: 'https://example.com', color: '#90d5cd', icon: 'E', iconMode: 'auto' }] }] },
  search: { engines: [{ id: 'google', name: 'Google', template: 'https://google.com/search?q={query}' }], defaultEngineId: 'google' },
  custom: { css: '', cssEnabled: false, variables: [{ name: '--glow', label: { 'zh-CN': '光晕', en: 'Glow' }, type: 'range', min: 0, max: 40, unit: 'px', default: 12 }], values: { '--glow': 12 } },
}

describe('profile v2 schema', () => {
  it('accepts a profile with current features and custom variables', () => {
    expect(parseProfileV2(profile)).toEqual(profile)
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
    const backgroundProfile = (asset: string) => ({ ...profile, background: { type: 'image', image: { asset, blur: 0, dim: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } })
    expect(profileV2Schema.safeParse(linkProfile(valid)).success).toBe(true)
    expect(profileV2Schema.safeParse(backgroundProfile(valid)).success).toBe(true)
    for (const bad of ['mnt-asset:abc', `mnt-asset:${'g'.repeat(64)}`, `mnt-asset:${'a'.repeat(64)}extra`, 'data:image/png;base64,AAAA']) {
      expect(profileV2Schema.safeParse(linkProfile(bad)).success).toBe(false)
      expect(profileV2Schema.safeParse(backgroundProfile(bad)).success).toBe(false)
    }
  })

  it('renders path, expected format and actual value in both languages', () => {
    const invalid = { ...profile, background: { type: 'image', image: { asset: 'bad-id', blur: 0, dim: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } }
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
})
