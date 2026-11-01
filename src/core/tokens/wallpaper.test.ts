import { describe, expect, it } from 'vitest'
import { dimToPass, shadeColor, wallpaperContrast } from './wallpaper'

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

  it('finds the smallest dim that lets light text pass, and none for dark text', () => {
    const dim = dimToPass('#f0f3f7', '#c0c8d8', 4.5, 80)
    expect(dim).not.toBeNull()
    expect(wallpaperContrast('#f0f3f7', '#c0c8d8', dim!).pass).toBe(true)
    expect(wallpaperContrast('#f0f3f7', '#c0c8d8', dim! - 1).pass).toBe(false)
    expect(dimToPass('#1c2430', '#6a7a90', 4.5, 80)).toBeNull()
  })

  it('more dim helps light text and hurts dark text', () => {
    expect(wallpaperContrast('#f0f3f7', '#a0a8b8', 0).ratio).toBeLessThan(wallpaperContrast('#f0f3f7', '#a0a8b8', 50).ratio)
    expect(wallpaperContrast('#1c2430', '#a0a8b8', 0).ratio).toBeGreaterThan(wallpaperContrast('#1c2430', '#a0a8b8', 50).ratio)
  })
})
