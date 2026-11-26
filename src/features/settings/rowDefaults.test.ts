import { describe, expect, it } from 'vitest'
import { appearanceDefaults, backgroundDefaults, bookmarkDefaults, layoutDefaults, maxColumnsDefault, widgetDefaults } from './rowDefaults'
import { defaultProfile } from './sectionDefaults'

describe('row defaults', () => {
  it('returns concrete dark-mode appearance defaults from a fresh profile', async () => {
    const profile = await defaultProfile('en')
    expect(appearanceDefaults(profile, 'dark')).toEqual({
      mode: 'dark',
      colorBg: '#102932',
      colorSurface: '#1d353d',
      colorText: '#eeeae5',
      colorAccent: '#90d5cd',
      fontDisplay: 'system',
      fontUi: 'system',
      radius: 14,
      shadow: 40,
      glass: 0,
      density: 'comfortable',
      scale: 1,
    })
  })

  it('returns neutral media defaults and background overlay from the profile', async () => {
    const profile = await defaultProfile('en')
    expect(backgroundDefaults(profile)).toEqual({
      dim: 35,
      gradientAngle: 135,
      image: { blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' },
      video: { blur: 0, grayscale: 0, scale: 1 },
    })
  })

  it('maps layout alignment between left and center and reads icon defaults', async () => {
    const profile = await defaultProfile('en')
    expect(layoutDefaults(profile)).toEqual({
      contentWidth: 960,
      gap: 0,
      alignment: 'center',
      iconSize: 72,
      iconShape: 'circle',
    })
    const leftAligned = structuredClone(profile)
    leftAligned.layout.align = 'center-left'
    expect(layoutDefaults(leftAligned).alignment).toBe('left')
  })

  it('reads bookmark row defaults and falls back when a bookmarks widget is absent', async () => {
    const profile = await defaultProfile('en')
    expect(maxColumnsDefault(profile)).toBe(6)
    expect(bookmarkDefaults(profile)).toEqual({
      style: 'tile',
      source: 'all',
      showGroupTitles: true,
      iconColor: 'per-site',
      showUrl: false,
      maxColumns: 6,
    })
    const withoutBookmarks = { ...profile, widgets: profile.widgets.filter(item => item.type !== 'bookmarks') }
    expect(maxColumnsDefault(withoutBookmarks)).toBeUndefined()
    expect(bookmarkDefaults(withoutBookmarks).style).toBe('tile')
  })

  it('derives locale-specific weekStart and honors explicit widget overrides', async () => {
    const profile = await defaultProfile('en')
    expect(widgetDefaults(profile, 'en').date.weekStart).toBe('sunday')
    expect(widgetDefaults(profile, 'zh-CN').date.weekStart).toBe('monday')
    expect(widgetDefaults(profile, 'en').clock).toEqual({
      hours: true,
      minutes: true,
      seconds: false,
      hour12: false,
      separator: ':',
      spacing: 0,
    })
    const custom = structuredClone(profile)
    const clock = custom.widgets.find(item => item.type === 'clock')
    if (clock?.type === 'clock') clock.props.hour12 = true
    expect(widgetDefaults(custom, 'en').clock.hour12).toBe(true)
  })
})
