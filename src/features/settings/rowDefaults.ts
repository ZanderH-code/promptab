import type { ProfileV2 } from '../../core/schema/profile'
import { colorsFor, type ThemeMode } from './themeApi'

/** The default values the Appearance rows compare against, read from a default profile. */
export function appearanceDefaults(profile: ProfileV2, mode: ThemeMode) {
  const colors = colorsFor(profile.theme, mode)
  return {
    mode: profile.theme.mode,
    colorBg: colors.bg,
    colorSurface: colors.surface,
    colorText: colors.text,
    colorAccent: colors.accent,
    fontDisplay: profile.theme.font.display,
    fontUi: profile.theme.font.ui,
    radius: profile.theme.radius,
    shadow: profile.theme.shadow,
    glass: profile.theme.glass,
    density: profile.theme.density,
    scale: profile.theme.scale,
  }
}

/** The shortcuts widget's Max columns default, as the default profile stores it. */
export function maxColumnsDefault(profile: ProfileV2): number | undefined {
  const widget = profile.widgets.find(item => item.type === 'bookmarks')
  return widget?.type === 'bookmarks' ? widget.props.maxColumns : undefined
}
