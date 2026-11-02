import { describe, expect, it } from 'vitest'
import { deriveTokens, themeColorsFor } from '../core/tokens/derive'
import { checkTheme } from '../core/tokens/quality'
import { contrastRatio } from '../core/tokens/oklch'
import { parseProfileV2, profileV2Schema, type ProfileV2 } from '../core/schema/profile'
import { themePackSchema } from '../core/schema/themePack'
import { applyPreset, DEFAULT_PRESET_ID, getPreset, PRESET_IDS, PRESETS } from './index'

const asset = `mnt-asset:${'b'.repeat(64)}`
const profile: ProfileV2 = parseProfileV2({
  schemaVersion: 2,
  meta: { id: 'main', name: 'Main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'en', openIn: 'new-tab', reduceMotion: 'on', reduceTransparency: 'system' },
  theme: { mode: 'light', color: { bg: '#102932', surface: '#203942', text: '#ffffff', accent: '#90d5cd' }, font: { display: 'mono', ui: 'rounded' }, radius: 3, shadow: 5, glass: 10, density: 'compact', scale: 1.2, iconShape: 'square', iconSize: 90 },
  background: { type: 'image', dim: 55, image: { asset, blur: 4, grayscale: 10, scale: 1.1, vignette: 20, position: 'top left' } },
  layout: { contentWidth: 1200, align: 'top-center', gap: 40, areas: ['clock search', 'links links'], breakpoints: { narrow: { areas: ['clock', 'search', 'links'] } } },
  widgets: [
    { id: 'clock', type: 'clock', area: 'clock', order: 0, props: { hour12: true, extra: 1 } },
    { id: 'links', type: 'bookmarks', area: 'links', order: 1, props: { style: 'tile', maxColumns: 6 } },
  ],
  bookmarks: { groups: [{ id: 'g', name: 'G', collapsed: true, items: [{ id: 'a', name: 'A', url: 'https://a.example', color: '#112233', icon: 'A', image: asset }] }] },
  search: { engines: [{ id: 'e', name: 'E', template: 'https://e.example/?q={query}' }], defaultEngineId: 'e' },
  custom: { css: '.x{color:red}', cssEnabled: true, variables: [{ name: '--glow', label: { 'zh-CN': '光', en: 'Glow' }, type: 'range', min: 0, max: 10, unit: 'px', default: 2 }], values: { '--glow': 4 }, sourcePack: { name: 'Mine', importedAt: '2026-01-02T00:00:00Z' } },
})
const withoutWallpaper: ProfileV2 = { ...profile, background: { type: 'theme', dim: 20 } }

describe('preset registry', () => {
  it('has the nine documented presets in order', () => {
    expect(PRESET_IDS).toEqual(['tide', 'paper', 'graphite', 'mist', 'moss', 'dusk', 'terminal', 'glass', 'contrast'])
    expect(PRESETS.map(p => p.id)).toEqual([...PRESET_IDS])
    expect(DEFAULT_PRESET_ID).toBe('tide')
    expect(getPreset('mist')!.name.en).toBe('Mist')
    expect(getPreset('nope')).toBeUndefined()
  })

  it('has bilingual names', () => {
    expect(PRESETS.map(p => p.name['zh-CN'])).toEqual(['夜潮', '纸本', '石墨', '雾蓝', '青苔', '暮色', '终端', '玻璃', '高对比'])
  })

  it('keeps the documented dark palettes', () => {
    const doc: Record<string, [string, string, string, string]> = {
      tide: ['#102932', '#18343e', '#eeeae5', '#90d5cd'],
      graphite: ['#16171a', '#1f2024', '#e6e6e6', '#8ab4f8'],
      moss: ['#18201a', '#212b23', '#e7eadf', '#a8c686'],
      terminal: ['#0b0f0b', '#111811', '#c8f7c5', '#4ade80'],
      contrast: ['#000000', '#111111', '#ffffff', '#ffd400'],
    }
    for (const [id, [bg, surface, text, accent]] of Object.entries(doc)) {
      expect(getPreset(id)!.theme.color).toEqual({ bg, surface, text, accent })
    }
    const lightDoc: Record<string, [string, string, string, string]> = {
      paper: ['#f1ede6', '#faf8f4', '#2f2b27', '#b04f26'], // documented #b4532a is 4.27:1 on bg; lightness-only fix,
      mist: ['#e9eef2', '#f6f8fa', '#22303c', '#3d6f9e'],
    }
    for (const [id, [bg, surface, text, accent]] of Object.entries(lightDoc)) {
      expect(getPreset(id)!.theme.colorLight).toEqual({ bg, surface, text, accent })
    }
    expect(getPreset('dusk')!.theme.color).toMatchObject({ surface: '#2b2340', text: '#efe7dc', accent: '#f2a07b' })
    expect(getPreset('dusk')!.background!.gradient!.stops).toEqual(['#2a1f3d', '#12101c'])
    expect(getPreset('dusk')!.background!.type).toBe('gradient')
    expect(getPreset('terminal')!.theme.radius).toBe(0)
    expect(getPreset('contrast')!.theme.radius).toBe(6)
    expect(getPreset('glass')!.wallpaper).toMatchObject({ glass: 60 })
    expect(getPreset('glass')!.theme.radius).toBe(20)
    expect(getPreset('glass')!.theme.mode).toBe('dark')
    expect(getPreset('glass')!.wallpaper).toMatchObject({ dim: 40 })
  })
})

describe.each(PRESETS.map(p => [p.id, p] as const))('preset %s', (_id, preset) => {
  const min = preset.minContrast ?? 4.5

  it('is a valid theme pack with both colour variants', () => {
    expect(themePackSchema.safeParse(preset).success).toBe(true)
    expect(preset.theme.colorLight).toBeDefined()
  })

  for (const mode of ['dark', 'light'] as const) {
    it(`meets ${min}:1 for text, muted text and accent in ${mode} mode`, () => {
      const colors = themeColorsFor(preset.theme, mode)
      const report = checkTheme(colors, mode, { minContrast: min })
      expect(report.failures, JSON.stringify(report.failures)).toEqual([])
      const t = deriveTokens(colors, mode, { minContrast: min })
      for (const token of ['--mnt-text', '--mnt-text-muted', '--mnt-accent-text', '--mnt-danger'] as const) {
        expect(contrastRatio(t[token], colors.bg), `${token} on bg`).toBeGreaterThanOrEqual(min)
        expect(contrastRatio(t[token], colors.surface), `${token} on surface`).toBeGreaterThanOrEqual(min)
      }
      expect(contrastRatio(t['--mnt-on-accent'], colors.accent)).toBeGreaterThanOrEqual(min)
    })
  }

  it('applies to a profile producing a valid profile', () => {
    expect(profileV2Schema.safeParse(applyPreset(profile, preset)).success).toBe(true)
    expect(profileV2Schema.safeParse(applyPreset(withoutWallpaper, preset)).success).toBe(true)
  })
})

describe('contrast preset', () => {
  it('reaches 7:1 for every checked pair in both modes', () => {
    const preset = getPreset('contrast')!
    expect(preset.minContrast).toBe(7)
    for (const mode of ['dark', 'light'] as const) {
      expect(checkTheme(themeColorsFor(preset.theme, mode), mode, { minContrast: 7 }).ok).toBe(true)
    }
  })
})

describe('dusk gradient stops', () => {
  it('keep the dark text readable over both ends', () => {
    const dusk = getPreset('dusk')!
    for (const stop of dusk.background!.gradient!.stops) {
      expect(contrastRatio(dusk.theme.color!.text, stop)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(deriveTokens(dusk.theme.color!, 'dark')['--mnt-text-muted'], stop)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('applyPreset', () => {
  it('does not mutate and sets preset metadata and theme values', () => {
    const snapshot = structuredClone(profile)
    const out = applyPreset(profile, getPreset('paper')!)
    expect(profile).toEqual(snapshot)
    expect(out.theme.preset).toBe('paper')
    expect(out.theme.mode).toBe('light')
    expect(out.theme.color).toEqual(getPreset('paper')!.theme.color)
    expect(out.theme.colorLight).toEqual(getPreset('paper')!.theme.colorLight)
    expect(out.theme.font).toEqual(getPreset('paper')!.theme.font)
    expect(out.theme.radius).toBe(10)
  })

  it('preserves everything that is not theme', () => {
    for (const preset of PRESETS) {
      const out = applyPreset(profile, preset)
      expect(out.bookmarks).toEqual(profile.bookmarks)
      expect(out.layout).toEqual(profile.layout)
      expect(out.widgets).toEqual(profile.widgets)
      expect(out.prefs).toEqual(profile.prefs)
      expect(out.custom).toEqual(profile.custom)
      expect(out.search).toEqual(profile.search)
      expect(out.meta).toEqual(profile.meta)
      expect(out.schemaVersion).toBe(2)
    }
  })

  it('keeps theme fields the preset does not define', () => {
    const out = applyPreset(profile, getPreset('tide')!)
    expect(out.theme.scale).toBe(1.2)
    expect(out.theme.iconSize).toBe(90)
    expect(out.theme.iconShape).toBe('square')
    expect(out.theme.density).toBe('compact')
  })

  it('keeps the wallpaper resource for every preset so switching back works', () => {
    for (const preset of PRESETS) {
      expect(applyPreset(profile, preset).background.image).toEqual(profile.background.image)
    }
  })

  it('does not leave a stale light variant behind', () => {
    const tide = { ...getPreset('tide')!, theme: { ...getPreset('tide')!.theme, colorLight: undefined } }
    expect(applyPreset({ ...profile, theme: { ...profile.theme, colorLight: { bg: '#ffffff', surface: '#ffffff', text: '#000000', accent: '#000000' } } }, tide).theme.colorLight).toBeUndefined()
  })

  it('Glass shows the wallpaper with glass when one exists', () => {
    const glass = getPreset('glass')!
    const out = applyPreset(profile, glass)
    expect(out.background.type).toBe('image')
    expect(out.background.image).toEqual(profile.background.image)
    expect(out.theme.glass).toBe(glass.wallpaper!.glass)
    expect(out.background.dim).toBe(glass.wallpaper!.dim)
    expect(out.theme.mode).toBe('dark')
  })

  it('Glass keeps the active video when both wallpaper resources exist', () => {
    const video = `mnt-asset:${'c'.repeat(64)}`
    const current = parseProfileV2({ ...profile, background: { ...profile.background, type: 'video', video: { asset: video, poster: asset, blur: 2, grayscale: 10 } } })
    const out = applyPreset(current, getPreset('glass')!)
    expect(out.background.type).toBe('video')
    expect(out.background.video).toEqual(current.background.video)
    expect(out.background.image).toEqual(current.background.image)
  })

  it('Glass falls back safely without a wallpaper: no image mode and no see-through panels', () => {
    const out = applyPreset(withoutWallpaper, getPreset('glass')!)
    expect(out.background.type).not.toBe('image')
    expect(out.background.image).toBeUndefined()
    expect(out.theme.glass).toBe(0)
  })

  it('non-wallpaper presets leave an image background to their own background', () => {
    const out = applyPreset(profile, getPreset('dusk')!)
    expect(out.background.type).toBe('gradient')
    expect(out.background.gradient!.stops).toEqual(['#2a1f3d', '#12101c'])
    expect(out.theme.glass).toBe(0)
  })

  it('presets without a background statement keep the current background type', () => {
    const out = applyPreset(profile, { ...getPreset('tide')!, background: undefined })
    expect(out.background).toEqual(profile.background)
  })
})
