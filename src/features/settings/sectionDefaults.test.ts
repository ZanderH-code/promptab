import { beforeAll, describe, expect, it } from 'vitest'
import type { ProfileV2 } from '../../core/schema/profile'
import { parseProfileV2 } from '../../core/schema/profile'
import { defaultProfile, resetSection } from './sectionDefaults'
import { contrastIssues, fixedColors, withColors, editTheme } from './themeApi'

const ASSET = `mnt-asset:${'b'.repeat(64)}`
let fresh: ProfileV2
beforeAll(async () => { fresh = await defaultProfile('en') })

function customized(): ProfileV2 {
  const profile = structuredClone(fresh)
  profile.meta = { id: 'mine', name: 'Mine', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
  profile.theme = { ...profile.theme, preset: 'paper', radius: 2, shadow: 90, mode: 'light', iconSize: 90, iconShape: 'square', colorLight: { bg: '#ffffff', surface: '#eeeeee', text: '#111111', accent: '#ff0000' } }
  profile.background = { type: 'image', dim: 60, image: { asset: ASSET, blur: 20, grayscale: 50, scale: 1.5, vignette: 30, position: 'top-left' } }
  profile.layout = { ...profile.layout, areas: ['hero', 'dock'], columns: ['1fr'], contentWidth: 700, gap: 80, align: 'top-left', breakpoints: undefined }
  profile.widgets = [
    { id: 'clock', type: 'clock', area: 'hero', order: 0, props: { hour12: true }, hidden: true },
    { id: 'date', type: 'date', area: 'hero', order: 1, props: {}, hidden: true },
    { id: 'bookmarks', type: 'bookmarks', area: 'dock', order: 2, props: { maxColumns: 3, style: 'list' } },
    { id: 'note', type: 'text', area: 'dock', order: 3, props: { text: 'hi' }, hidden: true },
  ]
  profile.bookmarks.groups[0].items = [{ id: 'one', name: 'One', url: 'https://one.test', color: '#112233', icon: 'O', image: ASSET }]
  profile.search = { engines: [{ id: 'x', name: 'X', template: 'https://x.test/?q={query}' }], defaultEngineId: 'x' }
  profile.custom = { ...profile.custom, css: '.a{}', cssEnabled: true }
  return parseProfileV2(profile)
}

describe('resetSection', () => {
  it('restores the theme but keeps icon settings, layout and bookmarks', () => {
    const next = resetSection(customized(), fresh, 'appearance')
    expect(next.theme.radius).toBe(fresh.theme.radius)
    expect(next.theme.preset).toBeUndefined()
    expect(next.theme.colorLight).toBeUndefined()
    expect(next.theme.mode).toBe('dark')
    expect(next.theme.iconSize).toBe(90)
    expect(next.theme.iconShape).toBe('square')
    expect(next.layout.contentWidth).toBe(700)
    expect(next.bookmarks.groups[0].items[0].image).toBe(ASSET)
    expect(parseProfileV2(next)).toBeTruthy()
  })

  it('resets background settings but keeps the wallpaper asset', () => {
    const next = resetSection(customized(), fresh, 'background')
    expect(next.background.type).toBe('theme')
    expect(next.background.dim).toBe(fresh.background.dim)
    expect(next.background.image).toEqual({ asset: ASSET, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' })
    expect(next.theme.radius).toBe(2)
  })

  it('resets video settings but keeps the video and poster assets', () => {
    const profile = customized()
    profile.background = { type: 'video', dim: 55, video: { asset: ASSET, poster: `mnt-asset:${'c'.repeat(64)}`, blur: 12, grayscale: 40 } }
    const next = resetSection(parseProfileV2(profile), fresh, 'background')
    expect(next.background.type).toBe('theme')
    expect(next.background.video).toEqual({ asset: ASSET, poster: `mnt-asset:${'c'.repeat(64)}`, blur: 0, grayscale: 0 })
    expect(parseProfileV2(next)).toBeTruthy()
  })

  it('resets the layout, icon settings and column limit, and re-homes widgets in unknown areas', () => {
    const next = resetSection(customized(), fresh, 'layout')
    expect(next.layout).toEqual(fresh.layout)
    expect(next.theme.iconSize).toBe(fresh.theme.iconSize)
    expect(next.theme.iconShape).toBe(fresh.theme.iconShape)
    expect(next.widgets.find(widget => widget.id === 'clock')?.area).toBe('overview')
    expect(next.widgets.find(widget => widget.id === 'bookmarks')?.area).toBe('bookmarks')
    expect(next.widgets.find(widget => widget.id === 'bookmarks')?.props).toEqual({ style: 'list' })
    expect(next.theme.radius).toBe(2)
    expect(parseProfileV2(next)).toBeTruthy()
  })

  it('resets widget visibility but leaves other widgets and bookmarks alone', () => {
    const next = resetSection(customized(), fresh, 'widgets')
    expect(next.widgets.find(widget => widget.id === 'clock')?.hidden).toBe(false)
    expect(next.widgets.find(widget => widget.id === 'clock')?.props).toEqual({})
    expect(next.widgets.find(widget => widget.id === 'note')?.hidden).toBe(true)
    expect(next.layout.areas).toEqual(['hero', 'dock'])
    expect(next.bookmarks.groups[0].items).toHaveLength(1)
  })

  it('resets search only', () => {
    const next = resetSection(customized(), fresh, 'search')
    expect(next.search).toEqual(fresh.search)
    expect(next.custom.css).toBe('.a{}')
    expect(next.meta.id).toBe('mine')
  })

  it('does not mutate its input', () => {
    const profile = customized()
    const before = structuredClone(profile)
    resetSection(profile, fresh, 'layout')
    expect(profile).toEqual(before)
  })
})

describe('themeApi', () => {
  it('flags low contrast and fixes only text and accent lightness', () => {
    const profile = structuredClone(fresh)
    profile.theme.color = { ...profile.theme.color, text: '#2a4650', accent: '#14303a' }
    expect(contrastIssues(profile.theme, 'dark').length).toBeGreaterThan(0)
    const fixed = fixedColors(profile.theme, 'dark')
    expect(fixed.bg).toBe(profile.theme.color.bg)
    expect(fixed.surface).toBe(profile.theme.color.surface)
    expect(contrastIssues({ ...profile.theme, color: fixed }, 'dark')).toEqual([])
  })

  it('drops the preset marker on manual edits and writes the light palette separately', () => {
    const theme = { ...fresh.theme, preset: 'tide' }
    expect(editTheme(theme, { radius: 4 }).preset).toBeUndefined()
    const light = withColors(theme, 'light', { bg: '#ffffff', surface: '#f0f0f0', text: '#000000', accent: '#0000ff' })
    expect(light.colorLight?.bg).toBe('#ffffff')
    expect(light.color).toEqual(theme.color)
    expect(light.preset).toBeUndefined()
  })
})
