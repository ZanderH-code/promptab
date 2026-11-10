import { beforeEach, describe, expect, it } from 'vitest'
import { WALLPAPER_PREVIEW_KEY, readWallpaperPreview, saveWallpaperPreview } from './wallpaperPreview'

const dataUrl = (fill = 'A') => `data:image/jpeg;base64,${fill.repeat(32)}`

describe('wallpaper preview', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the preview for its asset', () => {
    saveWallpaperPreview('asset-a', dataUrl())
    expect(readWallpaperPreview('asset-a')).toBe(dataUrl())
  })

  it('ignores and removes a preview for another asset', () => {
    saveWallpaperPreview('asset-a', dataUrl())
    expect(readWallpaperPreview('asset-b')).toBeNull()
    expect(localStorage.getItem(WALLPAPER_PREVIEW_KEY)).toBeNull()
  })

  it('writes nothing over 64 KB', () => {
    saveWallpaperPreview('asset-a', dataUrl())
    saveWallpaperPreview('asset-a', `data:image/jpeg;base64,${'A'.repeat(64 * 1024)}`)
    expect(localStorage.getItem(WALLPAPER_PREVIEW_KEY)).toBeNull()
    expect(readWallpaperPreview('asset-a')).toBeNull()
  })

  it('ignores corrupt JSON and a different version', () => {
    localStorage.setItem(WALLPAPER_PREVIEW_KEY, '{')
    expect(readWallpaperPreview('asset-a')).toBeNull()
    localStorage.setItem(WALLPAPER_PREVIEW_KEY, JSON.stringify({ version: 2, asset: 'asset-a', dataUrl: dataUrl() }))
    expect(readWallpaperPreview('asset-a')).toBeNull()
  })
})
