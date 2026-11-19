import { describe, expect, it } from 'vitest'
import { allocateOpenSequence, wallpaperRotationIndex } from './wallpaper'

describe('wallpaper rotation', () => {
  const rotation = { images: ['a', 'b', 'c'], interval: 'hour' as const }

  it('allocates concurrent openings under a lock', async () => {
    localStorage.clear()
    let previous = Promise.resolve()
    const locks = { request: (_name: string, callback: () => number) => {
      const result = previous.then(callback)
      previous = result.then(() => undefined)
      return result
    } }
    const values = await Promise.all(Array.from({ length: 20 }, () => allocateOpenSequence(locks)))
    expect(values).toEqual(Array.from({ length: 20 }, (_, index) => index))
  })

  it('does not update shared storage without a working lock', async () => {
    localStorage.setItem('mnt:wallpaper:open-sequence:v1', '12')
    expect(Number.isSafeInteger(await allocateOpenSequence(undefined))).toBe(true)
    expect(Number.isSafeInteger(await allocateOpenSequence({ request: async () => { throw new Error('unavailable') } }))).toBe(true)
    expect(localStorage.getItem('mnt:wallpaper:open-sequence:v1')).toBe('12')
  })

  it('advances with each tab opening, hour, and day interval', () => {
    expect(wallpaperRotationIndex({ ...rotation, interval: 'open' }, 0, 0)).toBe(0)
    expect(wallpaperRotationIndex({ ...rotation, interval: 'open' }, 0, 4)).toBe(1)
    const midday = new Date(2026, 0, 1, 12).getTime()
    expect(wallpaperRotationIndex(rotation, midday + 60 * 60 * 1000, 0)).toBe((wallpaperRotationIndex(rotation, midday, 0) + 1) % rotation.images.length)
    const daily = { ...rotation, interval: 'day' as const }
    expect(wallpaperRotationIndex(daily, midday + 24 * 60 * 60 * 1000, 0)).toBe((wallpaperRotationIndex(daily, midday, 0) + 1) % rotation.images.length)
  })

  it('moves to the next image at month and year ends', () => {
    const images = { images: ['a', 'b', 'c', 'd', 'e'] }
    for (const [before, after] of [[new Date(2026, 3, 30, 23), new Date(2026, 4, 1, 0)], [new Date(2026, 1, 28, 23), new Date(2026, 2, 1, 0)], [new Date(2026, 11, 31, 23), new Date(2027, 0, 1, 0)]]) {
      const hourly = { ...images, interval: 'hour' as const }, daily = { ...images, interval: 'day' as const }
      expect(wallpaperRotationIndex(hourly, after.getTime())).toBe((wallpaperRotationIndex(hourly, before.getTime()) + 1) % 5)
      expect(wallpaperRotationIndex(daily, after.getTime())).toBe((wallpaperRotationIndex(daily, before.getTime()) + 1) % 5)
    }
  })
})
