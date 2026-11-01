import { contrastRatio } from './oklch'

/** Brand marks need at least 3:1 against their configured tile colour. */
export function brandIconColor(hex: string, tile: string) {
  const brand = `#${hex}`
  const background = tile.match(/^#[\da-f]{6}$/i) ? tile : '#ffffff'
  return contrastRatio(brand, background) < 3 ? 'var(--mnt-text)' : brand
}
