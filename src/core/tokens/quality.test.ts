import { describe, expect, it } from 'vitest'
import { DEFAULT_DARK, DEFAULT_LIGHT } from '../schema/defaults'
import { checkTheme, fixThemeLightness } from './quality'
import { contrastRatio, hexToOklch } from './oklch'

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('checkTheme', () => {
  it('passes the default dark and light themes', () => {
    expect(checkTheme(DEFAULT_DARK, 'dark').ok).toBe(true)
  })

  it('flags the legacy light default, whose pale accent is unreadable on paper, and fixes it', () => {
    const report = checkTheme(DEFAULT_LIGHT, 'light')
    expect(report.failures.map(c => c.id)).toEqual(['accent-bg', 'accent-surface'])
    expect(fixThemeLightness(DEFAULT_LIGHT, 'light').report.ok).toBe(true)
  })

  it('reports each failing pair with its ratio', () => {
    const report = checkTheme({ bg: '#102932', surface: '#18343e', text: '#3b5560', accent: '#1c4a52' }, 'dark')
    expect(report.ok).toBe(false)
    const ids = report.failures.map(c => c.id)
    expect(ids).toContain('text-bg')
    expect(ids).toContain('text-surface')
    expect(ids).toContain('accent-bg')
    const textBg = report.checks.find(c => c.id === 'text-bg')!
    expect(textBg.required).toBe(4.5)
    expect(textBg.ratio).toBeCloseTo(contrastRatio('#3b5560', '#102932'), 5)
    expect(textBg.pass).toBe(false)
  })

  it('uses the stricter requirement when asked', () => {
    const colors = { bg: '#16171a', surface: '#1f2024', text: '#8a8a8a', accent: '#8ab4f8' }
    expect(checkTheme(colors, 'dark').checks.find(c => c.id === 'text-bg')!.pass).toBe(true)
    expect(checkTheme(colors, 'dark', { minContrast: 7 }).checks.find(c => c.id === 'text-bg')!.pass).toBe(false)
  })
})

describe('fixThemeLightness', () => {
  const bad = { bg: '#102932', surface: '#18343e', text: '#5a7680', accent: '#1c6a62' }

  it('fixes text and accent by lightness only and clears the report', () => {
    const fix = fixThemeLightness(bad, 'dark')
    expect(fix.report.ok).toBe(true)
    expect(checkTheme(fix.colors, 'dark').ok).toBe(true)
    expect(fix.colors.bg).toBe(bad.bg)
    expect(fix.colors.surface).toBe(bad.surface)
    expect(fix.changes.map(c => c.key).sort()).toEqual(['accent', 'text'])
    for (const key of ['text', 'accent'] as const) {
      const before = hexToOklch(bad[key]), after = hexToOklch(fix.colors[key])
      expect(hueDistance(before.h, after.h), key).toBeLessThan(4)
      expect(after.c, key).toBeLessThanOrEqual(before.c + 0.01)
      expect(after.l, key).toBeGreaterThan(before.l)
    }
  })

  it('works in light mode by darkening', () => {
    const colors = { bg: '#f1ede6', surface: '#faf8f4', text: '#a29a90', accent: '#e8a58a' }
    const fix = fixThemeLightness(colors, 'light')
    expect(fix.report.ok).toBe(true)
    expect(hexToOklch(fix.colors.text).l).toBeLessThan(hexToOklch(colors.text).l)
  })

  it('does not touch a theme that already passes', () => {
    const fix = fixThemeLightness(DEFAULT_DARK, 'dark')
    expect(fix.changes).toEqual([])
    expect(fix.colors).toEqual(DEFAULT_DARK)
  })

  it('can aim for 7:1', () => {
    const fix = fixThemeLightness(DEFAULT_DARK, 'dark', { minContrast: 7 })
    expect(checkTheme(fix.colors, 'dark', { minContrast: 7 }).ok).toBe(true)
  })

  it('reports what lightness alone cannot fix', () => {
    const fix = fixThemeLightness({ bg: '#333333', surface: '#cccccc', text: '#999999', accent: '#aaaaaa' }, 'dark')
    expect(fix.report.ok).toBe(false)
  })
})
