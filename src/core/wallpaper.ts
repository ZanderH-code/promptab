export type WallpaperRotation = { images: string[]; interval: 'open' | 'hour' | 'day' }

export function wallpaperRotationIndex(rotation: WallpaperRotation, now = Date.now(), openSequence = 0): number {
  if (!rotation.images.length) return 0
  const date = new Date(now)
  const tick = rotation.interval === 'open' ? openSequence
    : rotation.interval === 'hour'
      ? (((date.getFullYear() * 12 + date.getMonth()) * 31 + date.getDate()) * 24 + date.getHours())
      : Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000))
  return Math.abs(tick) % rotation.images.length
}
