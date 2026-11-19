import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(readPaintCache()).toMatchObject({ version: 1, revision: 7, activeProfileId: 'a', profile: value })
  })

  it('does not rewrite an unchanged entry', () => {
    writePaintCache(committed(profile()), 3)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    writePaintCache(committed(profile()), 3)
    expect(setItem).not.toHaveBeenCalled()
    writePaintCache(committed(profile()), 4)
    expect(setItem).toHaveBeenCalledTimes(1)
    setItem.mockRestore()
  })

  it('ignores an entry written by another build', () => {
    writePaintCache(committed(profile()), 1)
    const stored = JSON.parse(localStorage.getItem(PAINT_CACHE_KEY)!)
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify({ ...stored, build: 'older-build' }))
    expect(readPaintCache()).toBeNull()
    const { build: _build, ...unstamped } = stored
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify(unstamped))
    expect(readPaintCache()).toBeNull()
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
    writePaintCache(committed(profile()), 1)
    const stored = JSON.parse(localStorage.getItem(PAINT_CACHE_KEY)!)
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify({ ...stored, version: 2 }))
    expect(readPaintCache()).toBeNull()
    localStorage.setItem(PAINT_CACHE_KEY, JSON.stringify({ ...stored, activeProfileId: 'b' }))
    expect(readPaintCache()).toBeNull()
  })

  it('keeps profiles whose text mentions data: (sanitized CSS images, URLs), bounded by size alone', () => {
    const css = 'body { background: url(data:image/png;base64,AAAA) }'
    const value = { ...profile(), custom: { ...profile().custom, css } }
    writePaintCache(committed(value), 1)
    expect(readPaintCache()?.profile).toEqual(value)
  })
})
