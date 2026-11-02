import { describe, expect, it } from 'vitest'
import { wallpaperRotationIndex } from './wallpaper'

describe('wallpaper rotation', () => {
  const rotation = { images: ['a', 'b', 'c'], interval: 'hour' as const }

  it('advances with each tab opening, hour, and day interval', () => {
    expect(wallpaperRotationIndex({ ...rotation, interval: 'open' }, 0, 0)).toBe(0)
    expect(wallpaperRotationIndex({ ...rotation, interval: 'open' }, 0, 4)).toBe(1)
    const midday = new Date(2026, 0, 1, 12).getTime()
    expect(wallpaperRotationIndex(rotation, midday + 60 * 60 * 1000, 0)).toBe((wallpaperRotationIndex(rotation, midday, 0) + 1) % rotation.images.length)
    const daily = { ...rotation, interval: 'day' as const }
    expect(wallpaperRotationIndex(daily, midday + 24 * 60 * 60 * 1000, 0)).toBe((wallpaperRotationIndex(daily, midday, 0) + 1) % rotation.images.length)
  })
})
