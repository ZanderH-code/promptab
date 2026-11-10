import { describe, expect, it } from 'vitest'
import { defaults } from '../../core/model'
import { DEFAULT_AREA_STYLE, DEFAULT_BOOKMARKS, DEFAULT_CLOCK, DEFAULT_CONTENT_WIDTH, DEFAULT_DATE, DEFAULT_DATE_ORDER, DEFAULT_DIM, DEFAULT_GLASS, DEFAULT_GRADIENT_ANGLE, DEFAULT_MEDIA, DEFAULT_RADIUS, DEFAULT_WIDGET, RANGES } from '../../core/schema/defaults'
import { defaultWeekStart } from '../../core/layout/formats'
import { appearanceDefaults, backgroundDefaults, bookmarkDefaults, layoutDefaults, maxColumnsDefault, widgetDefaults } from './rowDefaults'
import { defaultProfile } from './sectionDefaults'
import { colorsFor } from './themeApi'

describe('row defaults', () => {
  it('appearance rows compare against the default profile, not a copied table', async () => {
    const profile = await defaultProfile('en')
    const values = appearanceDefaults(profile, 'dark')
    expect(values).toMatchObject({
      mode: profile.theme.mode,
      colorBg: colorsFor(profile.theme, 'dark').bg,
      colorSurface: colorsFor(profile.theme, 'dark').surface,
      colorText: colorsFor(profile.theme, 'dark').text,
      colorAccent: colorsFor(profile.theme, 'dark').accent,
      fontDisplay: profile.theme.font.display,
      fontUi: profile.theme.font.ui,
      radius: profile.theme.radius,
      shadow: profile.theme.shadow,
      glass: profile.theme.glass,
      density: profile.theme.density,
      scale: profile.theme.scale,
    })
    expect(values.radius).toBe(DEFAULT_RADIUS)
    expect(values.glass).toBe(DEFAULT_GLASS)
    expect(values.radius).toBeGreaterThanOrEqual(RANGES.radius.min)
    expect(values.radius).toBeLessThanOrEqual(RANGES.radius.max)
  })

  it('Max columns reads the default bookmarks widget', async () => {
    const profile = await defaultProfile('en')
    expect(maxColumnsDefault(profile)).toBe(defaults.columns)
    expect(maxColumnsDefault(profile)).toBe(6)
  })

  it('background rows compare against the default profile and the schema media defaults', async () => {
    const profile = await defaultProfile('en')
    const values = backgroundDefaults(profile)
    expect(values.dim).toBe(profile.background.dim)
    expect(values.dim).toBe(DEFAULT_DIM)
    expect(values.gradientAngle).toBe(DEFAULT_GRADIENT_ANGLE)
    expect(values.image.blur).toBe(RANGES.blur.min)
    expect(values.image.grayscale).toBe(RANGES.grayscale.min)
    expect(values.image.vignette).toBe(RANGES.vignette.min)
    expect(values.image.scale).toBe(DEFAULT_MEDIA.scale)
    expect(values.image.scale).toBeGreaterThanOrEqual(RANGES.scale.min)
    expect(values.image.scale).toBeLessThanOrEqual(RANGES.scale.max)
    expect(values.image.position).toBe(DEFAULT_MEDIA.position)
    expect(values.video).toEqual({ blur: RANGES.blur.min, grayscale: RANGES.grayscale.min })
  })

  it('layout rows compare against the default profile', async () => {
    const profile = await defaultProfile('en')
    const values = layoutDefaults(profile)
    expect(values).toEqual({
      contentWidth: profile.layout.contentWidth,
      gap: profile.layout.gap,
      alignment: profile.layout.align === 'center-left' ? 'left' : 'center',
      iconSize: profile.theme.iconSize,
      iconShape: profile.theme.iconShape,
    })
    expect(values.contentWidth).toBe(DEFAULT_CONTENT_WIDTH)
    expect(DEFAULT_AREA_STYLE.blur).toBe(RANGES.blur.min)
    expect(DEFAULT_AREA_STYLE.opacity).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_AREA_STYLE.opacity).toBeLessThanOrEqual(100)
  })

  it('bookmark and search rows read the default profile', async () => {
    const profile = await defaultProfile('en')
    const values = bookmarkDefaults(profile)
    const widget = profile.widgets.find(item => item.type === 'bookmarks')
    expect(values.maxColumns).toBe(widget?.type === 'bookmarks' ? widget.props.maxColumns : undefined)
    expect(values).toMatchObject({
      style: DEFAULT_BOOKMARKS.style,
      source: DEFAULT_BOOKMARKS.source,
      showGroupTitles: DEFAULT_BOOKMARKS.showGroupTitles,
      iconColor: DEFAULT_BOOKMARKS.iconColor,
    })
    expect(profile.prefs.openSearchInNewTab).toBe(false)
  })

  it('clock, date and common widget rows read the default profile', async () => {
    const profile = await defaultProfile('en')
    const values = widgetDefaults(profile, 'en')
    const clock = profile.widgets.find(item => item.type === 'clock')
    const date = profile.widgets.find(item => item.type === 'date')
    const sample = profile.widgets[0]
    expect(values.size).toBe(sample?.props.size ?? DEFAULT_WIDGET.size)
    expect(values.align).toBe(sample?.props.align ?? DEFAULT_WIDGET.align)
    expect(values.clock.hour12).toBe(clock?.type === 'clock' ? clock.props.hour12 ?? false : false)
    expect(values.clock).toMatchObject({ hours: DEFAULT_CLOCK.hours, minutes: DEFAULT_CLOCK.minutes, seconds: DEFAULT_CLOCK.seconds, hour12: DEFAULT_CLOCK.hour12, separator: DEFAULT_CLOCK.separator, spacing: DEFAULT_CLOCK.spacing })
    expect(values.date).toMatchObject({ weekday: DEFAULT_DATE.weekday, day: DEFAULT_DATE.day, month: DEFAULT_DATE.month, year: DEFAULT_DATE.year, ordinal: DEFAULT_DATE.ordinal, uppercase: DEFAULT_DATE.uppercase, weekNumber: DEFAULT_DATE.weekNumber, weekdayStyle: DEFAULT_DATE.weekdayStyle, monthStyle: DEFAULT_DATE.monthStyle, separator: DEFAULT_DATE.separator })
    expect(values.date.weekStart).toBe(date?.type === 'date' ? date.props.weekStart ?? defaultWeekStart('en') : defaultWeekStart('en'))
    expect(values.date.order).toEqual([...DEFAULT_DATE_ORDER])
  })
})
