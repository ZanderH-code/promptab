// @vitest-environment node
import { readFileSync } from 'node:fs'
import { generate, parse, walk, type CssNode } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, DARK_COLORS, DARK_SURFACE_MIX, DEFAULT_CONTENT_WIDTH, DEFAULT_RADIUS, DEFAULT_SHADOW, LIGHT_COLORS, LIGHT_SURFACE_MIX, darkSurface, lightSurface, mixHex } from './defaults'

// Contract check: tokens.css & layout.css provide first-paint fallback styles before JS hydrates,
// so their custom properties and narrow breakpoint must stay in sync with schema defaults.
const tokensCss = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8')
const layoutCss = readFileSync(new URL('../../styles/layout.css', import.meta.url), 'utf8')

function ruleDeclarations(css: string, selector: string): Map<string, string> {
  const decls = new Map<string, string>()
  walk(parse(css, { parseCustomProperty: true }), {
    visit: 'Rule',
    enter(rule) {
      if (generate(rule.prelude).trim() !== selector) return
      rule.block.children.forEach((child: CssNode) => {
        if (child.type === 'Declaration') decls.set(child.property, generate(child.value).trim())
      })
    },
  })
  return decls
}

function mediaPreludes(css: string): string[] {
  const preludes: string[] = []
  walk(parse(css), {
    visit: 'Atrule',
    enter(atrule) {
      if (atrule.name === 'media' && atrule.prelude) preludes.push(generate(atrule.prelude).trim())
    },
  })
  return preludes
}

describe('schema defaults', () => {
  it('match the M0 tokens declared in tokens.css', () => {
    const root = ruleDeclarations(tokensCss, ':root')
    const light = ruleDeclarations(tokensCss, ':root[data-theme="light"]')
    expect(root.get('--mnt-bg')).toBe(DARK_COLORS.bg)
    expect(root.get('--mnt-text')).toBe(DARK_COLORS.text)
    expect(root.get('--mnt-accent')).toBe(DARK_COLORS.accent)
    expect(root.get('--mnt-radius')).toBe(`${DEFAULT_RADIUS}px`)
    expect(root.get('--mnt-content-width')).toBe(`min(${DEFAULT_CONTENT_WIDTH}px,88vw)`)
    expect(root.get('--mnt-shadow-strength')).toBe(String(DEFAULT_SHADOW))
    expect(root.get('--mnt-shadow-color')).toContain(`${DEFAULT_SHADOW}%`)
    expect(root.get('--mnt-surface')).toContain(`${Math.round(DARK_SURFACE_MIX * 100)}%`)
    expect(light.get('--mnt-bg')).toBe(LIGHT_COLORS.bg)
    expect(light.get('--mnt-text')).toBe(LIGHT_COLORS.text)
    expect(light.get('--mnt-surface')).toContain(`${Math.round(LIGHT_SURFACE_MIX * 100)}%`)
  })

  it('keeps the CSS narrow breakpoint aligned with the shared breakpoint value', () => {
    expect(mediaPreludes(layoutCss)).toContain(`(max-width:${BREAKPOINTS.narrowMax}px)`)
  })

  it('derives lowercase #rrggbb surfaces', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(darkSurface('#102932')).toMatch(/^#[\da-f]{6}$/)
    expect(lightSurface('#eeeae4')).toMatch(/^#[\da-f]{6}$/)
  })
})
