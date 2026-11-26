import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProfileV2 } from '../core/schema/profile'
import { accentPalette } from '../core/tokens/accent'
import { themeColorsFor, type ThemeMode } from '../core/tokens/derive'
import { mixOklch } from '../core/tokens/oklch'
import { backgroundStyle, useThemeTokens } from './useTheme'

const DARK = { bg: '#102932', surface: '#16333d', text: '#eef4f5', accent: '#7fd4c4' }
const LIGHT = { bg: '#eeeae4', surface: '#f8f7f3', text: '#302d29', accent: '#3a5a80' }

function profile(background: ProfileV2['background'], colorLight = true): ProfileV2 {
  return {
    schemaVersion: 2, meta: { id: 'a', name: 'a', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    prefs: { language: 'system', openIn: 'same-tab', openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false, reduceMotion: 'system', reduceTransparency: 'off' },
    theme: { mode: 'system', color: DARK, ...(colorLight ? { colorLight: LIGHT } : {}), font: { display: 'serif', ui: 'system' }, radius: 1, shadow: 1, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
    background, layout: { contentWidth: 1000, align: 'center-center', gap: 1, areas: ['clock'] }, widgets: [], bookmarks: { groups: [] },
    search: { engines: [{ id: 'g', name: 'Google', template: 'https://google.com/?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables: [], values: {} },
  }
}

/** What theme-bootstrap.js paints before React runs: the cached background, else the cached scheme colour. */
function cachedBackground(): string {
  const cache = JSON.parse(localStorage.getItem('mnt:theme-cache:v1')!)
  return cache.background ?? cache.properties['--mnt-scheme-bg']
}

/** What the page shows once React has rendered: the root's inline background, else the scheme colour behind it. */
function renderedBackground(value: ProfileV2, mode: ThemeMode): string {
  const inline = backgroundStyle(value, mode).background
  return typeof inline === 'string' ? inline : themeColorsFor(value.theme, mode).bg
}

const backgrounds: [string, ProfileV2['background']][] = [
  ['theme', { type: 'theme', dim: 35 }],
  ['colour', { type: 'color', color: '#7a1f1f', dim: 0 }],
  ['colour without a value', { type: 'color', dim: 0 }],
  ['gradient', { type: 'gradient', gradient: { angle: 135, stops: ['#123456', '#abcdef'] }, dim: 0 }],
  ['accent', { type: 'accent', dim: 0 }],
  ['image', { type: 'image', dim: 35 }],
]

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(() => { cleanup(); document.documentElement.removeAttribute('style'); localStorage.clear(); sessionStorage.clear() })

describe('first paint theme cache', () => {
  // The cache used to copy `background.color` whenever the type was `color`, but in light mode with a
  // light palette the page paints the palette's bg instead, so the first frame showed the wrong colour.
  for (const mode of ['dark', 'light'] as const) {
    for (const colorLight of [true, false]) {
      for (const [label, background] of backgrounds) {
        it(`paints what the app renders: ${mode}, colorLight ${colorLight ? 'present' : 'absent'}, ${label}`, () => {
          const value = profile(background, colorLight)
          renderHook(() => useThemeTokens(value, mode))
          expect(cachedBackground()).toBe(renderedBackground(value, mode))
        })
      }
    }
  }

  it('keeps a gradient out of light mode, where the app falls back to the plain background', () => {
    const value = profile(backgrounds[3][1])
    renderHook(() => useThemeTokens(value, 'light'))
    expect(cachedBackground()).toBe(LIGHT.bg)
    expect(backgroundStyle(value, 'light')).toEqual({})
  })

  it('caches each random accent’s own wash, so the frame matches the accent bootstrap picks', () => {
    const base = profile(backgrounds[4][1])
    const value: ProfileV2 = { ...base, prefs: { ...base.prefs, accentOnOpen: 'random' } }
    const [first] = accentPalette(value.theme, 'dark')
    sessionStorage.setItem('mnt:accent-selection:v1', first)
    renderHook(() => useThemeTokens(value, 'dark'))
    const cache = JSON.parse(localStorage.getItem('mnt:theme-cache:v1')!)
    const wash = (accent: string) => mixOklch(DARK.bg, accent, 0.18)
    expect(cache.accentVariants.length).toBeGreaterThan(1)
    expect(new Set(cache.accentVariants.map((variant: { background: string }) => variant.background)).size).toBeGreaterThan(1)
    for (const variant of cache.accentVariants) expect(variant.background).toBe(wash(variant.accent))
    expect(cache.background).toBe(wash(first))
  }, 30_000)
})
