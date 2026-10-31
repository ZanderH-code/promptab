import { describe, expect, it } from 'vitest'
import { DEFAULT_DARK, DEFAULT_LIGHT } from './defaults'
import { parseThemePack, themePackIssues, themePackSchema } from './themePack'

const pack = {
  id: 'sample',
  name: { 'zh-CN': '样例', en: 'Sample' },
  theme: { mode: 'dark', color: DEFAULT_DARK, colorLight: DEFAULT_LIGHT, font: { display: 'serif', ui: 'system' }, radius: 12, shadow: 30 },
  background: { type: 'theme' },
}

describe('themePackSchema', () => {
  it('accepts a partial pack and keeps absent fields absent', () => {
    const parsed = parseThemePack(pack)
    expect(parsed.theme.radius).toBe(12)
    expect('glass' in parsed.theme).toBe(false)
    expect('dim' in (parsed.background ?? {})).toBe(false)
    expect(parsed.minContrast).toBeUndefined()
  })

  it('reuses the profile theme and background rules', () => {
    expect(themePackSchema.safeParse({ ...pack, theme: { ...pack.theme, radius: 99 } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, theme: { ...pack.theme, color: { ...DEFAULT_DARK, bg: 'red' } } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, background: { type: 'gradient', gradient: { angle: 0, stops: ['#000000'] } } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, background: { type: 'sepia' } }).success).toBe(false)
  })

  it('does not allow wallpaper assets or other profile data inside a pack', () => {
    expect(themePackSchema.safeParse({ ...pack, background: { type: 'image', image: { asset: `mnt-asset:${'a'.repeat(64)}`, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, bookmarks: { groups: [] } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, theme: { ...pack.theme, preset: 'x' } }).success).toBe(false)
  })

  it('requires id, localized name, mode and base colours', () => {
    expect(themePackSchema.safeParse({ ...pack, id: '' }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, name: { en: 'x' } }).success).toBe(false)
    const { mode: _mode, ...noMode } = pack.theme
    expect(themePackSchema.safeParse({ ...pack, theme: noMode }).success).toBe(false)
  })

  it('validates the optional wallpaper block and contrast level', () => {
    expect(themePackSchema.safeParse({ ...pack, wallpaper: { glass: 60, dim: 40 } }).success).toBe(true)
    expect(themePackSchema.safeParse({ ...pack, wallpaper: { glass: 160, dim: 40 } }).success).toBe(false)
    expect(themePackSchema.safeParse({ ...pack, minContrast: 7 }).success).toBe(true)
    expect(themePackSchema.safeParse({ ...pack, minContrast: 3 }).success).toBe(false)
  })

  it('lists issues with paths for feedback', () => {
    const issues = themePackIssues({ ...pack, theme: { ...pack.theme, radius: 99 } })
    expect(issues[0].path).toBe('theme.radius')
  })
})
