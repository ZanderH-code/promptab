import type { ProfileV2 } from '../schema/profile'
import { adjustLightness, hexToOklch, mixOklch, oklchToHex, pickOnColor, toRgba } from './oklch'

export type BaseColors = ProfileV2['theme']['color']
export type ThemeMode = 'dark' | 'light'
export type TokenMap = Record<`--mnt-${string}`, string>
export type DeriveOptions = {
  /** Minimum contrast for readable text, icons and danger on both bg and surface (4.5 AA, 7 AAA). */
  minContrast?: number
}

export const DEFAULT_MIN_CONTRAST = 4.5

/** Danger keeps one hue and chroma in every theme; only its lightness adapts to the page. */
const DANGER = { l: 0.66, c: 0.19, h: 25 }
const ELEVATED_LIGHTNESS = 0.04
const ACCENT_STRONG_SHIFT = 0.06

/** The base colours that apply in `mode`: the light variant when the theme has one, else the base set. */
export function themeColorsFor(theme: { color: BaseColors; colorLight?: BaseColors }, mode: ThemeMode): BaseColors {
  return mode === 'light' && theme.colorLight ? theme.colorLight : theme.color
}

/**
 * The complete `--mnt-*` colour token map for four base colours (bg, surface, text, accent).
 * All shades and mixes are OKLCH; readable variants change lightness only.
 */
export function deriveTokens(colors: BaseColors, mode: ThemeMode, options: DeriveOptions = {}): TokenMap {
  const min = options.minContrast ?? DEFAULT_MIN_CONTRAST
  const { bg, surface, text, accent } = colors
  const grounds = [bg, surface]
  const readable = (color: string) => adjustLightness(color, grounds, min)

  const shift = (hex: string, delta: number) => {
    const c = hexToOklch(hex)
    return oklchToHex({ ...c, l: Math.min(1, Math.max(0, c.l + delta)) })
  }
  const danger = readable(oklchToHex(DANGER))

  const tokens: TokenMap = {
    '--mnt-bg': bg,
    '--mnt-bg-elevated': shift(bg, ELEVATED_LIGHTNESS),
    '--mnt-surface': surface,
    '--mnt-surface-hover': mixOklch(surface, text, 0.06),
    '--mnt-surface-active': mixOklch(surface, text, 0.12),
    '--mnt-text': text,
    '--mnt-text-muted': readable(mixOklch(bg, text, 0.55)),
    '--mnt-text-faint': mixOklch(bg, text, 0.35),
    '--mnt-accent': accent,
    '--mnt-accent-soft': toRgba(accent, 0.12),
    '--mnt-accent-strong': shift(accent, mode === 'dark' ? ACCENT_STRONG_SHIFT : -ACCENT_STRONG_SHIFT),
    '--mnt-accent-text': readable(accent),
    '--mnt-on-accent': pickOnColor(accent),
    '--mnt-danger': danger,
    '--mnt-danger-soft': toRgba(danger, 0.14),
    '--mnt-border': toRgba(text, 0.12),
    '--mnt-border-strong': toRgba(text, 0.22),
    '--mnt-overlay': toRgba(mixOklch(bg, '#000000', mode === 'dark' ? 0.5 : 0.2), 0.6),
  }
  for (let i = 1; i <= 9; i++) tokens[`--mnt-shade-${i}`] = mixOklch(bg, text, (i - 1) / 8)
  return tokens
}
