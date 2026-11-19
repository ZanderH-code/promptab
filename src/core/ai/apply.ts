import type { ProfileV2 } from '../schema/profile'
import { PACK_KIND, PACK_VERSION, type AiPack } from './pack'
import { variableValue } from './variable'
import { portableCss } from '../css/sanitize'
import { portableWidget, type ProfileWidget } from './merge'

export { applyPack } from './merge'

type Variable = ProfileV2['custom']['variables'][number]

/** A shareable theme excludes personal content and wallpaper assets. */
export function exportThemePack(profile: ProfileV2): AiPack {
  const { mode, color, colorLight, radius, shadow, glass, density, scale, iconShape, iconSize } = profile.theme
  const font = Object.fromEntries(Object.entries(profile.theme.font).filter(([, value]) => !value.startsWith('mnt-asset:'))) as Partial<ProfileV2['theme']['font']>
  const { type, color: backgroundColor, gradient, dim } = profile.background
  const widgets = profile.widgets.map(portableWidget).filter(Boolean) as ProfileWidget[]
  return {
    kind: PACK_KIND, packVersion: PACK_VERSION, meta: { name: profile.custom.sourcePack?.name ?? 'Exported theme' },
    theme: { mode, color, colorLight, font, radius, shadow, glass, density, scale, iconShape, iconSize },
    background: { type: type === 'image' || type === 'video' ? 'theme' : type, ...(type === 'color' ? { color: backgroundColor } : {}), ...(type === 'gradient' ? { gradient } : {}), dim },
    layout: profile.layout,
    widgets,
    css: portableCss(profile.custom.css).css,
    variables: profile.custom.variables.map(variable => ({ ...variable, default: variableValue(variable, profile.custom.values[variable.name]) } as Variable)),
  }
}
