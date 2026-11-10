import { describe, expect, it } from 'vitest'
import { defaults } from '../../core/model'
import { DEFAULT_DIM, DEFAULT_GLASS, DEFAULT_GRADIENT_ANGLE, DEFAULT_MEDIA, DEFAULT_RADIUS, RANGES } from '../../core/schema/defaults'
import { appearanceDefaults, backgroundDefaults, maxColumnsDefault } from './rowDefaults'
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
})
