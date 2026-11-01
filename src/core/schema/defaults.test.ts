// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, DARK_COLORS, DARK_SURFACE_MIX, DEFAULT_CONTENT_WIDTH, DEFAULT_RADIUS, DEFAULT_SHADOW, LIGHT_COLORS, LIGHT_SURFACE_MIX, darkSurface, lightSurface, mixHex } from './defaults'

// The tsconfig has no Node types and Vite blanks CSS imports in tests, so load the stylesheet through an untyped dynamic import.
const { readFileSync } = await import(/* @vite-ignore */ ['node', 'fs'].join(':'))
const tokens: string = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8')
const layout: string = readFileSync(new URL('../../styles/layout.css', import.meta.url), 'utf8')
const rootBlock = /:root\s*\{([^}]*)\}/.exec(tokens)![1]
const lightBlock = /:root\[data-theme="light"\]\s*\{([^}]*)\}/.exec(tokens)![1]
const declared = (block: string, name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(block)?.[1].trim()

describe('schema defaults', () => {
  it('match the M0 tokens in tokens.css', () => {
    expect(declared(rootBlock, '--mnt-bg')).toBe(DARK_COLORS.bg)
    expect(declared(rootBlock, '--mnt-text')).toBe(DARK_COLORS.text)
    expect(declared(rootBlock, '--mnt-accent')).toBe(DARK_COLORS.accent)
    expect(declared(rootBlock, '--mnt-radius')).toBe(`${DEFAULT_RADIUS}px`)
    expect(declared(rootBlock, '--mnt-content-width')).toBe(`min(${DEFAULT_CONTENT_WIDTH}px, 88vw)`)
    expect(declared(rootBlock, '--mnt-shadow-color')).toContain(`black) ${DEFAULT_SHADOW}%`)
    expect(declared(rootBlock, '--mnt-surface')).toContain(`${Math.round(DARK_SURFACE_MIX * 100)}%`)
    expect(declared(lightBlock, '--mnt-bg')).toBe(LIGHT_COLORS.bg)
    expect(declared(lightBlock, '--mnt-text')).toBe(LIGHT_COLORS.text)
    expect(declared(lightBlock, '--mnt-surface')).toContain(`${Math.round(LIGHT_SURFACE_MIX * 100)}%`)
  })

  it('keeps the CSS narrow breakpoint aligned with the shared breakpoint value', () => {
    expect(layout).toMatch(new RegExp(`@media\\s*\\(max-width:\\s*${BREAKPOINTS.narrowMax}px\\)`))
  })

  it('derives lowercase #rrggbb surfaces', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(darkSurface('#102932')).toMatch(/^#[\da-f]{6}$/)
    expect(lightSurface('#eeeae4')).toMatch(/^#[\da-f]{6}$/)
  })
})
