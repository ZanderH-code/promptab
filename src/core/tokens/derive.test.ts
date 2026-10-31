import { describe, expect, it } from 'vitest'
import { DEFAULT_DARK, DEFAULT_LIGHT } from '../schema/defaults'
import { deriveTokens, themeColorsFor } from './derive'
import { contrastRatio } from './oklch'

const palettes = {
  dark: [DEFAULT_DARK, { bg: '#16171a', surface: '#1f2024', text: '#e6e6e6', accent: '#8ab4f8' }, { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffd400' }, { bg: '#0b0f0b', surface: '#111811', text: '#c8f7c5', accent: '#1f5f3a' }],
  light: [DEFAULT_LIGHT, { bg: '#f1ede6', surface: '#faf8f4', text: '#2f2b27', accent: '#e8a58a' }, { bg: '#e9eef2', surface: '#f6f8fa', text: '#22303c', accent: '#3d6f9e' }],
} as const

describe('deriveTokens', () => {
  it('exposes the documented token names', () => {
    const t = deriveTokens(DEFAULT_DARK, 'dark')
    for (const name of ['bg', 'bg-elevated', 'surface', 'surface-hover', 'surface-active', 'text', 'text-muted', 'text-faint', 'accent', 'accent-soft', 'accent-strong', 'accent-text', 'on-accent', 'danger', 'danger-soft', 'border', 'border-strong', 'overlay']) {
      expect(t[`--mnt-${name}`], name).toBeTruthy()
    }
    for (let i = 1; i <= 9; i++) expect(t[`--mnt-shade-${i}`], `shade-${i}`).toMatch(/^#[\da-f]{6}$/)
    expect(t['--mnt-bg']).toBe(DEFAULT_DARK.bg)
    expect(t['--mnt-shade-1']).toBe(DEFAULT_DARK.bg)
    expect(t['--mnt-shade-9']).toBe(DEFAULT_DARK.text)
  })

  it('is deterministic', () => {
    expect(deriveTokens(DEFAULT_DARK, 'dark')).toEqual(deriveTokens(DEFAULT_DARK, 'dark'))
  })

  it('picks black or white on-accent with at least 4.5:1', () => {
    for (const [mode, list] of Object.entries(palettes)) {
      for (const colors of list) {
        const t = deriveTokens(colors, mode as 'dark' | 'light')
        expect(['#000000', '#ffffff']).toContain(t['--mnt-on-accent'])
        expect(contrastRatio(t['--mnt-on-accent'], colors.accent)).toBeGreaterThanOrEqual(4.5)
      }
    }
    expect(deriveTokens({ ...DEFAULT_DARK, accent: '#ffd400' }, 'dark')['--mnt-on-accent']).toBe('#000000')
    expect(deriveTokens({ ...DEFAULT_DARK, accent: '#1d3a8a' }, 'dark')['--mnt-on-accent']).toBe('#ffffff')
  })

  it('makes accent-text, muted text and danger readable on bg and surface', () => {
    for (const [mode, list] of Object.entries(palettes)) {
      for (const colors of list) {
        const t = deriveTokens(colors, mode as 'dark' | 'light')
        for (const token of ['--mnt-accent-text', '--mnt-text-muted', '--mnt-danger']) {
          expect(contrastRatio(t[token as `--mnt-${string}`], colors.bg), `${mode} ${token} on bg`).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(t[token as `--mnt-${string}`], colors.surface), `${mode} ${token} on surface`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('honours a stricter minimum contrast', () => {
    const colors = { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#ffd400' }
    const t = deriveTokens(colors, 'dark', { minContrast: 7 })
    for (const token of ['--mnt-accent-text', '--mnt-text-muted', '--mnt-danger'] as const) {
      expect(contrastRatio(t[token], colors.surface)).toBeGreaterThanOrEqual(7)
    }
  })

  it('keeps an accent that is already readable unchanged', () => {
    expect(deriveTokens(DEFAULT_DARK, 'dark')['--mnt-accent-text']).toBe(DEFAULT_DARK.accent)
  })

  it('keeps the fixed danger colour red-ish in both modes', () => {
    for (const mode of ['dark', 'light'] as const) {
      const danger = deriveTokens(mode === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT, mode)['--mnt-danger']
      const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(danger.slice(i, i + 2), 16))
      expect(r).toBeGreaterThan(g)
      expect(r).toBeGreaterThan(b)
    }
  })

  it('makes dark elevated surfaces lighter than bg', () => {
    const t = deriveTokens(DEFAULT_DARK, 'dark')
    expect(t['--mnt-bg-elevated']).not.toBe(t['--mnt-bg'])
    expect(t['--mnt-border']).toMatch(/^rgb\(\d+ \d+ \d+ \/ 12%\)$/)
    expect(t['--mnt-border-strong']).toMatch(/\/ 22%\)$/)
    expect(t['--mnt-accent-soft']).toMatch(/\/ 12%\)$/)
  })
})

describe('themeColorsFor', () => {
  const theme = { color: DEFAULT_DARK, colorLight: DEFAULT_LIGHT }
  it('uses the light variant when present and falls back to base colours', () => {
    expect(themeColorsFor(theme, 'light')).toBe(DEFAULT_LIGHT)
    expect(themeColorsFor(theme, 'dark')).toBe(DEFAULT_DARK)
    expect(themeColorsFor({ color: DEFAULT_DARK }, 'light')).toBe(DEFAULT_DARK)
  })
})
