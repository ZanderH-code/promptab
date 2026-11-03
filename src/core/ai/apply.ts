import type { ProfileV2 } from '../schema/profile'
import { darkSurface, lightSurface } from '../schema/defaults'
import { areaNames } from '../layout/grid'
import { PACK_KIND, PACK_VERSION, PACK_PARTS, type AiPack, type PackPart } from './pack'
import { variableValue } from './variable'
import { portableCss } from '../css/sanitize'

type Variable = ProfileV2['custom']['variables'][number]
type PackColors = NonNullable<NonNullable<AiPack['theme']>['color']>

/** Fills in the surface colour a pack may leave out, the same way the settings panel derives it. */
const withSurface = (colors: PackColors, derive: (bg: string, text: string) => string) => ({ ...colors, surface: colors.surface ?? derive(colors.bg, colors.text) })

type ProfileWidget = ProfileV2['widgets'][number]

function portableWidget(widget: ProfileWidget): ProfileWidget | null {
  const allowed: Partial<Record<ProfileWidget['type'], string[]>> = {
    clock: ['size', 'align', 'hour12', 'seconds', 'hours', 'minutes', 'pad', 'separator', 'separatorSpacing', 'eyebrow'],
    date: ['size', 'align', 'format', 'weekday', 'day', 'month', 'year', 'order', 'separator', 'separatorSpacing', 'weekdayStyle', 'monthStyle', 'ordinal', 'uppercase'],
    search: ['size', 'align'], bookmarks: ['size', 'align', 'style', 'maxColumns', 'showGroupTitles', 'showAdd', 'iconColor'],
    greeting: ['size', 'align'], text: ['size', 'align', 'muted'], spacer: ['size', 'align', 'height'], toolbar: ['size', 'align', 'actions'],
    weather: ['size', 'align', 'unit', 'showForecast'],
  }
  const props = allowed[widget.type]
  if (!props) return null
  return { ...widget, props: Object.fromEntries(Object.entries(widget.props).filter(([key]) => props.includes(key))) } as ProfileWidget
}

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
    const existingIds = new Set(next.widgets.map(widget => widget.id))
    const newWidgets = pack.widgets.filter(widget => !existingIds.has(widget.id)).map(portableWidget).filter(Boolean) as ProfileWidget[]
    next = { ...next, widgets: [...next.widgets.map(widget => {
      const incoming = byId.get(widget.id)
      return incoming && incoming.type === widget.type ? { ...incoming, props: { ...widget.props, ...incoming.props } } as typeof widget : widget
    }), ...newWidgets] }
    if (chosen.has('layout') && pack.layout && Object.keys(pack.layout).length) {
      const grids = [next.layout.areas, ...Object.values(next.layout.breakpoints ?? {}).map(grid => grid.areas)]
      const common = areaNames(grids[0]).filter(area => grids.every(grid => areaNames(grid).includes(area)))
      const fallback = common.includes('overview') ? 'overview' : common[0]
      if (fallback) next = { ...next, widgets: next.widgets.map(widget => common.includes(widget.area) ? widget : { ...widget, area: fallback }) }
    }
    touched = true
  }

  if (chosen.has('css') && typeof pack.css === 'string') {
    next = { ...next, custom: { ...next.custom, css: pack.css, cssEnabled: true } }
    touched = true
  }

  if (chosen.has('css') && pack.variables !== undefined) {
    const old = new Map(profile.custom.variables.map(variable => [variable.name, variable]))
    const values = Object.fromEntries(pack.variables.map(variable => {
      const previous = old.get(variable.name)
      const compatible = !!pack.meta?.name && pack.meta.name === profile.custom.sourcePack?.name && previous?.type === variable.type && (variable.type !== 'range' || (previous.type === 'range' && previous.unit === variable.unit))
      return [variable.name, variableValue(variable, compatible ? profile.custom.values[variable.name] : undefined)]
    }))
    next = { ...next, custom: { ...next.custom, variables: pack.variables, values } }
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
