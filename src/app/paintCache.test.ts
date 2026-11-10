import { beforeEach, describe, expect, it } from 'vitest'
import type { ProfileV2 } from '../core/schema/profile'
import { PAINT_CACHE_KEY, readPaintCache, writePaintCache } from './paintCache'

const profile = (id = 'a'): ProfileV2 => ({
  schemaVersion: 2, meta: { id, name: id, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false, reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#000000', surface: '#000000', text: '#ffffff', accent: '#ffffff' }, font: { display: 'serif', ui: 'system' }, radius: 1, shadow: 1, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme', dim: 35 }, layout: { contentWidth: 1000, align: 'center-center', gap: 1, areas: ['clock'] }, widgets: [], bookmarks: { groups: [] },
  search: { engines: [{ id: 'g', name: 'Google', template: 'https://google.com/?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables: [], values: {} },
})

const committed = (value: ProfileV2) => ({ profiles: { [value.meta.id]: value }, activeProfileId: value.meta.id, history: { profiles: {} }, archived: {} })

describe('paint cache', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the active profile and revision', () => {
    const value = profile()
    writePaintCache(committed(value), 7)
    expect(readPaintCache()).toEqual({ version: 1, revision: 7, activeProfileId: 'a', profile: value })
    expect(localStorage.getItem(PAINT_CACHE_KEY)).not.toContain('data:')
  })

  it('removes the key instead of storing a payload over 512 KB', () => {
    writePaintCache(committed(profile()), 1)
    writePaintCache(committed({ ...profile(), custom: { ...profile().custom, css: 'x'.repeat(600 * 1024) } }), 2)
    expect(localStorage.getItem(PAINT_CACHE_KEY)).toBeNull()
    expect(readPaintCache()).toBeNull()
  })

  it('ignores corrupt JSON and a different version', () => {
    localStorage.setItem(PAINT_CACHE_KEY, '{')
    expect(readPaintCache()).toBeNull()
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify({ version: 2, revision: 1, activeProfileId: 'a', profile: profile() }))
    expect(readPaintCache()).toBeNull()
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify({ version: 1, revision: 1, activeProfileId: 'b', profile: profile('a') }))
    expect(readPaintCache()).toBeNull()
  })

  it('never stores binary data URLs', () => {
    const css = 'body { background: url(data:image/png;base64,AAAA) }'
    writePaintCache(committed({ ...profile(), custom: { ...profile().custom, css } }), 1)
    expect(localStorage.getItem(PAINT_CACHE_KEY)).toBeNull()
  })
})
