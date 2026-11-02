import type { ProfileV2 } from '../core/schema/profile'
import { parseThemePack, type ThemePack } from '../core/schema/themePack'

/** Preset order as shown in the picker (DESIGN §9). Each id has a `<id>.json` partial theme pack beside this file. */
export const PRESET_IDS = ['tide', 'paper', 'graphite', 'mist', 'moss', 'dusk', 'terminal', 'glass', 'contrast'] as const
export type PresetId = (typeof PRESET_IDS)[number]
export const DEFAULT_PRESET_ID: PresetId = 'tide'

const files = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' })

export const PRESETS: readonly ThemePack[] = PRESET_IDS.map(id => {
  const pack = parseThemePack(files[`./${id}.json`])
  if (pack.id !== id) throw new Error(`Preset file ${id}.json declares id "${pack.id}"`)
  return pack
})

export function getPreset(id: string): ThemePack | undefined {
  return PRESETS.find(preset => preset.id === id)
}

/**
 * Apply a preset to a profile and return the new profile; `profile` is not modified.
 *
 * Only `theme` and `background` change. Bookmarks, layout, widgets, prefs, search, custom code/variables, meta
 * and wallpaper resources are kept as they are, so switching away and back never loses a wallpaper. A preset that
 * wants a wallpaper (Glass) uses the existing image or video with its glass/dim, and otherwise falls back to its
 * own plain background with glass 0. Recording the change in history is the caller's job.
 */
export function applyPreset(profile: ProfileV2, preset: ThemePack): ProfileV2 {
  const theme: Record<string, unknown> = { ...profile.theme }
  for (const [key, value] of Object.entries(preset.theme)) if (value !== undefined) theme[key] = value
  if (preset.theme.colorLight === undefined) delete theme.colorLight
  theme.preset = preset.id

  const { image, video, rotation } = profile.background
  const wallpaperType = profile.background.type === 'video' && video ? 'video' : image ? 'image' : video ? 'video' : undefined
  let background = profile.background
  if (preset.wallpaper && wallpaperType) {
    theme.glass = preset.wallpaper.glass
    background = { type: wallpaperType, dim: preset.wallpaper.dim, ...(image && { image }), ...(video && { video }), ...(rotation && { rotation }) }
  } else if (preset.background) {
    const { type, color, gradient, dim } = preset.background
    background = { type, dim: dim ?? profile.background.dim, ...(color && { color }), ...(gradient && { gradient }), ...(image && { image }), ...(video && { video }), ...(rotation && { rotation }) }
  }
  return { ...profile, theme: theme as ProfileV2['theme'], background }
}
