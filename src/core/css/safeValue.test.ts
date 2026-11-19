import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { fontStack, useThemeTokens } from '../../app/useTheme'
import { aiPackSchema } from '../ai/pack'
import { profileV2Schema, type ProfileV2 } from '../schema/profile'
import { themePackSchema } from '../schema/themePack'
import { isSafeFontRef, isSafeThemeValue } from './safeValue'

type Variable = ProfileV2['custom']['variables'][number]
const label = { en: 'X', 'zh-CN': 'X' }
const select = (options: string[]): Variable => ({ type: 'select', name: '--pick', label, options, default: options[0] })
const range = (unit: string): Variable => ({ type: 'range', name: '--size', label, min: 0, max: 10, unit, default: 4 })

const profile = (variables: Variable[], font = { display: 'serif', ui: 'system' }): ProfileV2 => ({
  schemaVersion: 2, meta: { id: 'a', name: 'a', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'system', openIn: 'same-tab', openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false, reduceMotion: 'system', reduceTransparency: 'off' },
  theme: { mode: 'dark', color: { bg: '#000000', surface: '#000000', text: '#ffffff', accent: '#ffffff' }, font, radius: 1, shadow: 1, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'theme', dim: 35 }, layout: { contentWidth: 1000, align: 'center-center', gap: 1, areas: ['clock'] }, widgets: [], bookmarks: { groups: [] },
  search: { engines: [{ id: 'g', name: 'Google', template: 'https://google.com/?q={query}' }], defaultEngineId: 'g' }, custom: { css: '', cssEnabled: false, variables, values: {} },
})

const applied = (value: ProfileV2) => {
  renderHook(() => useThemeTokens(value, 'dark', false))
  return document.documentElement.style
}

afterEach(() => { document.documentElement.removeAttribute('style') })

describe('theme values written to the page', () => {
  it('flags values that could carry a function, string, escape or extra declaration', () => {
    for (const value of ['url(https://evil.test/b.png)', ' image-set("https://evil.test/b.png" 1x)', 'a\\28 b', 'red;x:y', 'a}b{', 'two\nlines', "'x'"]) expect(isSafeThemeValue(value)).toBe(false)
    for (const value of ['12px', 'bold italic', '#ff0000', '50%', 'solid']) expect(isSafeThemeValue(value)).toBe(true)
    expect(isSafeFontRef('"Open Sans", "Open Sans", sans-serif')).toBe(true)
    for (const value of ['x, url(https://evil.test/f)', 'a;b', 'a\\b', 'a\nb', '  ']) expect(isSafeFontRef(value)).toBe(false)
  })

  it('still loads stored profiles holding unsafe values but never writes them onto <html>', () => {
    const stored = profile([select(['url(https://evil.test/beacon.png)', 'plain']), range(' image-set("https://evil.test/b.png" 1x)')], { display: 'x, image-set("https://evil.test/f.png" 1x)', ui: 'Inter;color:red' })
    expect(profileV2Schema.safeParse(stored).success).toBe(true)
    const style = applied(stored)
    expect(style.getPropertyValue('--pick')).toBe('')
    expect(style.getPropertyValue('--size')).toBe('')
    expect(style.getPropertyValue('--mnt-font-display')).toBe(fontStack('system'))
    expect(style.getPropertyValue('--mnt-font-ui')).toBe(fontStack('system'))
  })

  it('writes plain values and font lists as before', () => {
    const style = applied(profile([select(['wide', 'narrow']), range('px')], { display: '"Open Sans", sans-serif', ui: 'mono' }))
    expect(style.getPropertyValue('--pick')).toBe('wide')
    expect(style.getPropertyValue('--size')).toBe('4px')
    expect(style.getPropertyValue('--mnt-font-display')).toBe('"Open Sans", sans-serif')
    expect(style.getPropertyValue('--mnt-font-ui')).toContain('monospace')
    expect(fontStack('constructor')).toBe('constructor')
  })

  it('rejects unsafe variables and fonts in new AI and theme packs', () => {
    expect(aiPackSchema.safeParse({ variables: [select(['url(https://evil.test/beacon.png)'])] }).success).toBe(false)
    expect(aiPackSchema.safeParse({ variables: [select(['"quoted"'])] }).success).toBe(false)
    expect(aiPackSchema.safeParse({ variables: [range(' image-set("https://evil.test/b.png" 1x)')] }).success).toBe(false)
    expect(aiPackSchema.safeParse({ variables: [select(['wide', '12px', '#fff', 'bold italic']), range('rem')] }).success).toBe(true)
    expect(aiPackSchema.safeParse({ theme: { font: { ui: 'Inter\n;x' } } }).success).toBe(false)
    const pack = { id: 'p', name: { en: 'P', 'zh-CN': 'P' }, theme: { mode: 'dark', color: { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffffff' }, font: { display: 'serif', ui: 'system' } } }
    expect(themePackSchema.safeParse(pack).success).toBe(true)
    expect(themePackSchema.safeParse({ ...pack, theme: { ...pack.theme, font: { display: 'x, url(https://evil.test/f)', ui: 'system' } } }).success).toBe(false)
  })
})
