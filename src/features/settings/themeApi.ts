/** Theme helpers for the settings UI, adapting the core token engine, quality checks and presets. */
import { fontStack } from '../../app/useTheme'
import type { ProfileV2 } from '../../core/schema/profile'
import { DEFAULT_MIN_CONTRAST, deriveTokens, themeColorsFor, type BaseColors, type ThemeMode } from '../../core/tokens/derive'
import { checkTheme, fixThemeLightness, type CheckId } from '../../core/tokens/quality'
import { PRESETS, applyPreset } from '../../presets'

export type { BaseColors, ThemeMode }
export { PRESETS, applyPreset }
export type ThemeState = ProfileV2['theme']

export const FONT_KEYS = ['system', 'serif', 'mono', 'rounded'] as const
export const isFontKey = (value: string): value is (typeof FONT_KEYS)[number] => (FONT_KEYS as readonly string[]).includes(value)

/** The base colours shown and edited for a mode (the same ones the page renders). */
export const colorsFor = (theme: ThemeState, mode: ThemeMode): BaseColors => themeColorsFor(theme, mode)

/** Returns the theme with `colors` stored for `mode`. Any manual edit leaves the named preset. */
export function withColors(theme: ThemeState, mode: ThemeMode, colors: BaseColors): ThemeState {
  const { preset: _preset, ...rest } = theme
  return mode === 'dark' ? { ...rest, color: colors } : { ...rest, colorLight: colors }
}

/** Applies a partial theme edit and drops the preset marker. */
export function editTheme(theme: ThemeState, changes: Partial<ThemeState>): ThemeState {
  const { preset: _preset, ...rest } = theme
  return { ...rest, ...changes }
}

/** The contrast level the page is rendered with (the High contrast preset asks for AAA). */
export const minContrastFor = (theme: ThemeState) => (theme.preset === 'contrast' ? 7 : DEFAULT_MIN_CONTRAST)

/** The checks that matter to a person editing colours; each names its two colours. */
export type ContrastIssue = { id: CheckId; fg: 'colorText' | 'colorMuted' | 'accent' | 'colorOnAccent'; bg: 'background' | 'colorSurface' | 'accent'; ratio: number; min: number }
const PAIRS: Record<CheckId, Pick<ContrastIssue, 'fg' | 'bg'>> = {
  'text-bg': { fg: 'colorText', bg: 'background' }, 'text-surface': { fg: 'colorText', bg: 'colorSurface' },
  'muted-bg': { fg: 'colorMuted', bg: 'background' }, 'muted-surface': { fg: 'colorMuted', bg: 'colorSurface' },
  'accent-bg': { fg: 'accent', bg: 'background' }, 'accent-surface': { fg: 'accent', bg: 'colorSurface' },
  'on-accent': { fg: 'colorOnAccent', bg: 'accent' },
}

export function contrastIssues(theme: ThemeState, mode: ThemeMode): ContrastIssue[] {
  const report = checkTheme(colorsFor(theme, mode), mode, { minContrast: minContrastFor(theme) })
  return report.failures.map(check => ({ id: check.id, ...PAIRS[check.id], ratio: check.ratio, min: check.required }))
}

/** Colours with only the lightness of text and accent adjusted until the checks pass. */
export function fixedColors(theme: ThemeState, mode: ThemeMode): BaseColors {
  return fixThemeLightness(colorsFor(theme, mode), mode, { minContrast: minContrastFor(theme) }).colors
}

/** Real derived tokens for a preset thumbnail: colours from the engine plus the preset's radius and fonts. */
export function thumbnailTokens(theme: ThemeState, mode: ThemeMode): Record<string, string> {
  return {
    ...deriveTokens(colorsFor(theme, mode), mode, { minContrast: minContrastFor(theme) }),
    '--mnt-radius': `${theme.radius}px`,
    '--mnt-font-ui': fontStack(theme.font.ui),
    '--mnt-font-display': fontStack(theme.font.display),
  }
}
