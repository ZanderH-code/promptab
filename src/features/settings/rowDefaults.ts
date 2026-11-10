import { DEFAULT_BOOKMARKS, DEFAULT_CLOCK, DEFAULT_DATE, DEFAULT_DATE_ORDER, DEFAULT_GRADIENT_ANGLE, DEFAULT_MEDIA, DEFAULT_WIDGET } from '../../core/schema/defaults'
import { defaultWeekStart } from '../../core/layout/formats'
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

/** The Background rows' defaults: the overlay from the default profile, media from the schema's neutral values. */
export function backgroundDefaults(profile: ProfileV2) {
  return {
    dim: profile.background.dim,
    gradientAngle: DEFAULT_GRADIENT_ANGLE,
    image: DEFAULT_MEDIA,
    video: { blur: DEFAULT_MEDIA.blur, grayscale: DEFAULT_MEDIA.grayscale },
  }
}

/** The Layout rows' defaults, read from the default profile. */
export function layoutDefaults(profile: ProfileV2) {
  return {
    contentWidth: profile.layout.contentWidth,
    gap: profile.layout.gap,
    alignment: profile.layout.align === 'center-left' ? 'left' : 'center',
    iconSize: profile.theme.iconSize,
    iconShape: profile.theme.iconShape,
  }
}

/** The bookmarks widget's row defaults, read from the default profile where it stores them. */
export function bookmarkDefaults(profile: ProfileV2) {
  const widget = profile.widgets.find(item => item.type === 'bookmarks')
  const props = widget?.type === 'bookmarks' ? widget.props : {}
  return {
    style: props.style ?? DEFAULT_BOOKMARKS.style,
    source: props.source ?? DEFAULT_BOOKMARKS.source,
    showGroupTitles: props.showGroupTitles ?? DEFAULT_BOOKMARKS.showGroupTitles,
    iconColor: props.iconColor ?? DEFAULT_BOOKMARKS.iconColor,
    maxColumns: maxColumnsDefault(profile),
  }
}

/** The clock, date and common widget props' defaults, read from the default profile. */
export function widgetDefaults(profile: ProfileV2, language: string) {
  const clock = profile.widgets.find(item => item.type === 'clock')
  const date = profile.widgets.find(item => item.type === 'date')
  const sample = profile.widgets[0]
  const cp = clock?.type === 'clock' ? clock.props : {}
  const dp = date?.type === 'date' ? date.props : {}
  return {
    size: sample?.props.size ?? DEFAULT_WIDGET.size,
    align: sample?.props.align ?? DEFAULT_WIDGET.align,
    clock: {
      hours: cp.hours ?? DEFAULT_CLOCK.hours,
      minutes: cp.minutes ?? DEFAULT_CLOCK.minutes,
      seconds: cp.seconds ?? DEFAULT_CLOCK.seconds,
      hour12: cp.hour12 ?? DEFAULT_CLOCK.hour12,
      separator: cp.separator ?? DEFAULT_CLOCK.separator,
      spacing: cp.separatorSpacing ?? DEFAULT_CLOCK.spacing,
    },
    date: {
      weekday: dp.weekday ?? DEFAULT_DATE.weekday,
      day: dp.day ?? DEFAULT_DATE.day,
      month: dp.month ?? DEFAULT_DATE.month,
      year: dp.year ?? DEFAULT_DATE.year,
      ordinal: dp.ordinal ?? DEFAULT_DATE.ordinal,
      uppercase: dp.uppercase ?? DEFAULT_DATE.uppercase,
      weekNumber: dp.weekNumber ?? DEFAULT_DATE.weekNumber,
      weekStart: dp.weekStart ?? defaultWeekStart(language),
      weekdayStyle: dp.weekdayStyle ?? DEFAULT_DATE.weekdayStyle,
      monthStyle: dp.monthStyle ?? DEFAULT_DATE.monthStyle,
      separator: dp.separator ?? DEFAULT_DATE.separator,
      order: dp.order ?? [...DEFAULT_DATE_ORDER],
    },
  }
}
