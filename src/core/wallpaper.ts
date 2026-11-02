type SequenceLock = { request(name: string, callback: () => number): Promise<number> }

export async function allocateOpenSequence(locks: SequenceLock | undefined): Promise<number> {
  try {
    if (locks) return await locks.request('mnt:wallpaper:open-sequence:v1', () => {
      const key = 'mnt:wallpaper:open-sequence:v1'
      const current = Number.parseInt(localStorage.getItem(key) ?? '0', 10)
      const next = Number.isSafeInteger(current) && current >= 0 && current < Number.MAX_SAFE_INTEGER ? current : 0
      localStorage.setItem(key, String(next + 1))
      return next
    })
  } catch { /* Fall back without modifying the shared counter. */ }
  return Math.floor(Math.random() * 0x100000000)
}

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
