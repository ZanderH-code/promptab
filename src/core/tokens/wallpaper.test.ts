import { describe, expect, it } from 'vitest'
import { shadeColor, wallpaperContrast } from './wallpaper'

describe('wallpaper contrast', () => {
  it('darkens the wallpaper by the dim percentage', () => {
    expect(shadeColor('#ffffff', 0)).toBe('#ffffff')
    expect(shadeColor('#ffffff', 100)).toBe('#000000')
    expect(shadeColor('#c8c8c8', 50)).toBe('#646464')
  })

  it('fails dark text on a dimmed wallpaper (the Glass light-mode problem)', () => {
    const result = wallpaperContrast('#1c2430', '#6a7a90', 40)
    expect(result.pass).toBe(false)
  })

  it('passes light text on a dimmed mid-tone wallpaper', () => {
    expect(wallpaperContrast('#f0f3f7', '#6a7a90', 40).pass).toBe(true)
  })

  it('more dim helps light text and hurts dark text', () => {
    expect(wallpaperContrast('#f0f3f7', '#a0a8b8', 0).ratio).toBeLessThan(wallpaperContrast('#f0f3f7', '#a0a8b8', 50).ratio)
    expect(wallpaperContrast('#1c2430', '#a0a8b8', 0).ratio).toBeGreaterThan(wallpaperContrast('#1c2430', '#a0a8b8', 50).ratio)
  })
})
