import { DEFAULT_MIN_CONTRAST, deriveTokens, type BaseColors, type DeriveOptions, type ThemeMode } from './derive'
import { adjustLightness, contrastRatio } from './oklch'

export type CheckId = 'text-bg' | 'text-surface' | 'muted-bg' | 'muted-surface' | 'accent-bg' | 'accent-surface' | 'on-accent'

export type ContrastCheck = { id: CheckId; fg: string; bg: string; ratio: number; required: number; pass: boolean }

export type ThemeReport = {
  mode: ThemeMode
  minContrast: number
  checks: ContrastCheck[]
  /** The subset of `checks` that miss their requirement. */
  failures: ContrastCheck[]
  ok: boolean
}

export type ThemeFix = {
  colors: BaseColors
  changes: { key: 'text' | 'accent'; from: string; to: string }[]
  /** Report for the fixed colours; not ok when lightness alone cannot satisfy the backgrounds. */
  report: ThemeReport
}

/**
 * Contrast report for a base-colour set. Text and accent are checked as given (they are the values the
 * user chose); muted text and on-accent are checked as the derived tokens, so a failure there means the
 * backgrounds leave no room for readable text at all.
 */
export function checkTheme(colors: BaseColors, mode: ThemeMode, options: DeriveOptions = {}): ThemeReport {
  const minContrast = options.minContrast ?? DEFAULT_MIN_CONTRAST
  const tokens = deriveTokens(colors, mode, { minContrast })
  const { bg, surface, text, accent } = colors
  const muted = tokens['--mnt-text-muted']
  const onAccent = tokens['--mnt-on-accent']
  const pair = (id: CheckId, fg: string, ground: string, required = minContrast): ContrastCheck => {
    const ratio = contrastRatio(fg, ground)
    return { id, fg, bg: ground, ratio, required, pass: ratio >= required }
  }
  const checks = [
    pair('text-bg', text, bg),
    pair('text-surface', text, surface),
    pair('muted-bg', muted, bg),
    pair('muted-surface', muted, surface),
    pair('accent-bg', accent, bg),
    pair('accent-surface', accent, surface),
    pair('on-accent', onAccent, accent, DEFAULT_MIN_CONTRAST),
  ]
  const failures = checks.filter(check => !check.pass)
  return { mode, minContrast, checks, failures, ok: failures.length === 0 }
}

/**
 * One-click fix: change only the OKLCH lightness of text and accent until they read on both bg and surface.
 * Hue and chroma (within sRGB) are kept, and bg and surface are never touched.
 */
export function fixThemeLightness(colors: BaseColors, mode: ThemeMode, options: DeriveOptions = {}): ThemeFix {
  const minContrast = options.minContrast ?? DEFAULT_MIN_CONTRAST
  const grounds = [colors.bg, colors.surface]
  const fixed: BaseColors = { ...colors }
  const changes: ThemeFix['changes'] = []
  for (const key of ['text', 'accent'] as const) {
    const to = adjustLightness(colors[key], grounds, minContrast)
    if (to !== colors[key].toLowerCase()) {
      fixed[key] = to
      changes.push({ key, from: colors[key], to })
    }
  }
  return { colors: fixed, changes, report: checkTheme(fixed, mode, { minContrast }) }
}
