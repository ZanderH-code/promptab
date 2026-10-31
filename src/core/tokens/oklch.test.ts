import { describe, expect, it } from 'vitest'
import { adjustLightness, contrastRatio, hexToOklch, mixOklch, oklchToHex, pickOnColor, toRgba } from './oklch'

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('oklch conversion', () => {
  it('maps black, white and a known colour to expected OKLCH values', () => {
    expect(hexToOklch('#000000').l).toBeCloseTo(0, 3)
    expect(hexToOklch('#ffffff').l).toBeCloseTo(1, 3)
    expect(hexToOklch('#ffffff').c).toBeLessThan(0.001)
    const red = hexToOklch('#ff0000')
    expect(red.l).toBeCloseTo(0.628, 2)
    expect(red.c).toBeCloseTo(0.2577, 2)
    expect(red.h).toBeCloseTo(29.2, 0)
  })

  it('round-trips hex colours', () => {
    for (const hex of ['#102932', '#eeeae5', '#90d5cd', '#b4532a', '#ffd400', '#3d6f9e', '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex)
    }
  })

  it('gamut-maps by reducing chroma while keeping lightness and hue', () => {
    const out = hexToOklch(oklchToHex({ l: 0.9, c: 0.4, h: 250 }))
    expect(out.c).toBeLessThan(0.4)
    expect(out.l).toBeCloseTo(0.9, 1)
    expect(hueDistance(out.h, 250)).toBeLessThan(4)
  })
})

describe('contrast', () => {
  it('matches WCAG reference ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
    expect(contrastRatio('#ffffff', '#777777')).toBe(contrastRatio('#777777', '#ffffff'))
  })

  it('picks black or white for text on an accent', () => {
    expect(pickOnColor('#ffd400')).toBe('#000000')
    expect(pickOnColor('#90d5cd')).toBe('#000000')
    expect(pickOnColor('#1d3a8a')).toBe('#ffffff')
    expect(pickOnColor('#b4532a')).toBe('#ffffff')
  })
})

describe('mixing', () => {
  it('returns the endpoints and a lightness between them', () => {
    expect(mixOklch('#102932', '#eeeae5', 0)).toBe('#102932')
    expect(mixOklch('#102932', '#eeeae5', 1)).toBe('#eeeae5')
    const mid = hexToOklch(mixOklch('#102932', '#eeeae5', 0.5))
    expect(mid.l).toBeGreaterThan(hexToOklch('#102932').l)
    expect(mid.l).toBeLessThan(hexToOklch('#eeeae5').l)
  })

  it('takes the hue of the chromatic side when the other is neutral', () => {
    const mixed = hexToOklch(mixOklch('#000000', '#3d6f9e', 0.5))
    expect(hueDistance(mixed.h, hexToOklch('#3d6f9e').h)).toBeLessThan(4)
  })

  it('formats alpha colours', () => {
    expect(toRgba('#102932', 0.12)).toBe('rgb(16 41 50 / 12%)')
  })
})

describe('adjustLightness', () => {
  const bg = '#102932'
  it('leaves an already readable colour untouched', () => {
    expect(adjustLightness('#eeeae5', bg, 4.5)).toBe('#eeeae5')
  })

  it('reaches the ratio against one or several backgrounds', () => {
    const fixed = adjustLightness('#3a6a66', [bg, '#18343e'], 4.5)
    expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(fixed, '#18343e')).toBeGreaterThanOrEqual(4.5)
    const dark = adjustLightness('#d9a28c', '#f1ede6', 7)
    expect(contrastRatio(dark, '#f1ede6')).toBeGreaterThanOrEqual(7)
  })

  it('changes lightness only: hue is kept and chroma never grows', () => {
    const cases: [string, string][] = [['#d9a28c', '#f1ede6'], ['#3a6a66', '#102932'], ['#6a8fd0', '#e9eef2'], ['#c0a0e0', '#ffffff'], ['#a8c686', '#18201a']]
    for (const [fg, against] of cases) {
      const before = hexToOklch(fg)
      const after = hexToOklch(adjustLightness(fg, against, 4.5))
      expect(hueDistance(before.h, after.h)).toBeLessThan(4)
      expect(after.c).toBeLessThanOrEqual(before.c + 0.01)
    }
  })

  it('moves as little as possible', () => {
    const before = hexToOklch('#5b8f8a')
    const after = hexToOklch(adjustLightness('#5b8f8a', bg, 4.5))
    expect(after.l).toBeGreaterThan(before.l)
    expect(after.l - before.l).toBeLessThan(0.12)
  })
})
