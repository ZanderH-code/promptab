/**
 * Default design values for profile v2.
 *
 * These constants mirror `src/styles/tokens.css` (the M0 tokens) and must be kept in sync with it;
 * `defaults.test.ts` reads the stylesheet and fails if they drift. Ranges are shared with the profile schema.
 */

export const BREAKPOINTS = { narrowMax: 639, mediumMax: 1024 } as const

export const RANGES = {
  radius: { min: 0, max: 28 },
  shadow: { min: 0, max: 100 },
  glass: { min: 0, max: 100 },
  dim: { min: 0, max: 80 },
  blur: { min: 0, max: 40 },
  grayscale: { min: 0, max: 100 },
  vignette: { min: 0, max: 100 },
  scale: { min: 0.5, max: 2 },
  contentWidth: { min: 480, max: 1920 },
  gap: { min: 0, max: 200 },
} as const

export const DEFAULT_RADIUS = 14
/** Shadow strength 0-100; 40 is the 40% black shadow colour of `--mnt-shadow-color`. */
export const DEFAULT_SHADOW = 40
export const DEFAULT_GLASS = 0
export const DEFAULT_CONTENT_WIDTH = 960
export const DEFAULT_GAP = 24
/** Wallpaper shade, matches the legacy overlay default. */
export const DEFAULT_DIM = 35
/** Neutral wallpaper adjustments applied on upload and when one media row resets. */
export const DEFAULT_MEDIA = { blur: RANGES.blur.min, grayscale: RANGES.grayscale.min, scale: 1, vignette: RANGES.vignette.min, position: 'center' } as const
/** Angle a gradient starts with when the background type switches to gradient. */
export const DEFAULT_GRADIENT_ANGLE = 135

export const DARK_COLORS = { bg: '#102932', text: '#eeeae5', accent: '#90d5cd' } as const
export const LIGHT_COLORS = { bg: '#eeeae4', text: '#302d29' } as const

/** Share of `--mnt-text` mixed into `--mnt-bg` for `--mnt-surface` in the dark theme. */
export const DARK_SURFACE_MIX = 0.06
/** Share of white mixed into `--mnt-bg` for `--mnt-surface` in the light theme. */
export const LIGHT_SURFACE_MIX = 0.45

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** Mix `amount` (0-1) of `other` into `base`, in sRGB; both are lowercase #rrggbb. */
export function mixHex(base: string, other: string, amount: number): string {
  const a = channels(base), b = channels(other)
  return `#${a.map((value, i) => Math.round(value * (1 - amount) + b[i] * amount).toString(16).padStart(2, '0')).join('')}`
}

/** Dark-theme surface derived from a background, approximating the tokens.css formula. */
export function darkSurface(bg: string, text: string = DARK_COLORS.text): string {
  return mixHex(bg, text, DARK_SURFACE_MIX)
}

/** Light-theme surface derived from a background, approximating the tokens.css formula. */
export function lightSurface(bg: string): string {
  return mixHex(bg, '#ffffff', LIGHT_SURFACE_MIX)
}

export const DEFAULT_DARK = { ...DARK_COLORS, surface: darkSurface(DARK_COLORS.bg) }
export const DEFAULT_LIGHT = { ...LIGHT_COLORS, surface: lightSurface(LIGHT_COLORS.bg), accent: DARK_COLORS.accent }
