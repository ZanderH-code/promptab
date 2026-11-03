import type { ProfileV2 } from '../schema/profile'
import { fixThemeLightness } from './quality'
import { themeColorsFor, type ThemeMode } from './derive'

const PRESET_ACCENTS = ['#90d5cd', '#1e6f68', '#e08a63', '#b04f26', '#8ab4f8', '#2a5fc4', '#7fb0de', '#3d6f9e', '#a8c686', '#44722a', '#f2a07b', '#b3472a', '#4ade80', '#137a3a', '#8fc1ff', '#2563b0', '#ffd400', '#0033cc']

/** Accent swatches from the built-in palettes, adjusted against the active theme's backgrounds. */
export function accentPalette(theme: ProfileV2['theme'], mode: ThemeMode): string[] {
  const base = themeColorsFor(theme, mode)
  const minContrast = theme.preset === 'contrast' ? 7 : 4.5
  const candidates = [base.accent, ...PRESET_ACCENTS]
  return [...new Set(candidates.map(accent => fixThemeLightness({ ...base, accent }, mode, { minContrast }).colors.accent))]
}
