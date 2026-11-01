import { DEFAULT_MIN_CONTRAST } from './derive'
import { contrastRatio } from './oklch'

export type WallpaperContrast = { ground: string; ratio: number; required: number; pass: boolean }

const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16)

/** The wallpaper colour once the dim shade (black at `dim` percent) is laid over it. */
export function shadeColor(hex: string, dim: number): string {
  const keep = 1 - Math.min(100, Math.max(0, dim)) / 100
  return '#' + [0, 1, 2].map(i => Math.round(channel(hex, i) * keep).toString(16).padStart(2, '0')).join('')
}

/** The smallest dim (at most `max`) that makes the text readable, or null when no dim can (e.g. dark text). */
export function dimToPass(text: string, average: string, required: number, max: number, from = 0): number | null {
  for (let dim = Math.max(0, Math.ceil(from)); dim <= max; dim++) if (wallpaperContrast(text, average, dim, required).pass) return dim
  return null
}

/** Contrast of the text colour against the estimated average colour of a dimmed wallpaper. */
export function wallpaperContrast(text: string, average: string, dim: number, required = DEFAULT_MIN_CONTRAST): WallpaperContrast {
  const ground = shadeColor(average, dim)
  const ratio = contrastRatio(text, ground)
  return { ground, ratio, required, pass: ratio >= required }
}
