import type { ProfileV2 } from '../schema/profile'
import { darkSurface, lightSurface } from '../schema/defaults'
import { PACK_PARTS, type AiPack, type PackPart } from './pack'

type PackColors = NonNullable<NonNullable<AiPack['theme']>['color']>

/** Fills in the surface colour a pack may leave out, the same way the settings panel derives it. */
const withSurface = (colors: PackColors, derive: (bg: string, text: string) => string) => ({ ...colors, surface: colors.surface ?? derive(colors.bg, colors.text) })

/**
 * Merges the chosen parts of a pack into a profile. Parts the pack does not carry, and parts not chosen,
 * leave the profile as it was. Bookmarks and wallpaper images are never touched.
 * The result is not validated here; the caller runs it through the profile schema.
 */
export function applyPack(profile: ProfileV2, pack: AiPack, parts: Iterable<PackPart> = PACK_PARTS, now = new Date().toISOString()): ProfileV2 {
  const chosen = new Set(parts)
  let next = profile
  let touched = false

  if (chosen.has('theme') && pack.theme && Object.keys(pack.theme).length) {
    const { color, colorLight, font, mode, ...rest } = pack.theme
    const { preset: _preset, ...theme } = profile.theme
    next = {
      ...next,
      theme: {
        ...theme, ...rest,
        ...(mode ? { mode } : {}),
        ...(color ? { color: withSurface(color, darkSurface) } : {}),
        ...(colorLight ? { colorLight: withSurface(colorLight, (bg) => lightSurface(bg)) } : {}),
        ...(font ? { font: { display: font.display ?? theme.font.display, ui: font.ui ?? theme.font.ui } } : {}),
      },
    }
    touched = true
  }

  if (chosen.has('background') && pack.background && Object.keys(pack.background).length) {
    next = { ...next, background: { ...next.background, ...pack.background } }
    touched = true
  }

  if (chosen.has('layout') && pack.layout && Object.keys(pack.layout).length) {
    next = { ...next, layout: { ...next.layout, ...pack.layout, breakpoints: pack.layout.breakpoints ? { ...next.layout.breakpoints, ...pack.layout.breakpoints } : next.layout.breakpoints, areaStyles: pack.layout.areaStyles ? { ...pack.layout.areaStyles } : next.layout.areaStyles } }
    touched = true
  }

  if (chosen.has('widgets') && pack.widgets?.length) {
    const byId = new Map(pack.widgets.map(widget => [widget.id, widget]))
    next = { ...next, widgets: next.widgets.map(widget => byId.get(widget.id) ?? widget) }
    touched = true
  }

  if (chosen.has('css') && typeof pack.css === 'string' && pack.css.trim() !== '') {
    next = { ...next, custom: { ...next.custom, css: pack.css, cssEnabled: true } }
    touched = true
  }

  if (!touched) return profile
  const name = pack.meta?.name
  return {
    ...next,
    meta: { ...next.meta, updatedAt: now },
    custom: { ...next.custom, ...(name ? { sourcePack: { name, importedAt: now } } : {}) },
  }
}
