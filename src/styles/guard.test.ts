import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generate, parse, walk, type CssNode } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { sanitizeCss } from '../core/css/sanitize'

const here = (name: string) => fileURLToPath(new URL(name, import.meta.url))
const read = (name: string) => readFileSync(here(name), 'utf8')

type Rule = { selectors: string[]; important: Map<string, boolean> }

/** Every rule inside `@layer <name> { ... }` blocks of a stylesheet. */
function layerRules(css: string, layer: string): Rule[] {
  const rules: Rule[] = []
  walk(parse(css), {
    visit: 'Atrule',
    enter(node) {
      if (node.name !== 'layer' || !node.block || node.prelude == null || generate(node.prelude).trim() !== layer) return
      walk(node.block, {
        visit: 'Rule',
        enter(rule) {
          const selectors = rule.prelude.type === 'SelectorList' ? rule.prelude.children.toArray().map(child => generate(child)) : [generate(rule.prelude)]
          const important = new Map<string, boolean>()
          rule.block.children.forEach((child: CssNode) => { if (child.type === 'Declaration') important.set(child.property, child.important !== false) })
          rules.push({ selectors, important })
        },
      })
    },
  })
  return rules
}

describe('guard layer', () => {
  const guard = layerRules(read('guard.css'), 'guard')

  it('marks every declaration important, since important rules in earlier layers beat any later layer', () => {
    expect(guard.length).toBeGreaterThan(0)
    for (const rule of guard) for (const [property, important] of rule.important) expect({ selectors: rule.selectors, property, important }).toMatchObject({ important: true })
  })

  it('is the first layer and user CSS is the last, so user !important cannot reach it', () => {
    const order = /@layer\s+([^;{]+);/.exec(read('layers.css'))![1].split(',').map(name => name.trim())
    expect(order[0]).toBe('guard')
    expect(order.at(-1)).toBe('user')
    expect(sanitizeCss('.mnt-settings-entry { display: none !important; }').layered).toMatch(/^@layer user\s*\{/)
  })

  it.each(['.mnt-settings-entry', '.mnt-header', '.mnt-banners', '.mnt-banner'])('keeps %s visible, clickable and in flow', selector => {
    const properties = new Set(guard.filter(rule => rule.selectors.includes(selector)).flatMap(rule => [...rule.important.keys()]))
    for (const property of ['visibility', 'opacity', 'pointer-events', 'transform', 'filter', 'clip-path']) expect(properties).toContain(property)
  })

  it('keeps the page root from being hidden, collapsed or clipped', () => {
    const properties = new Set(guard.filter(rule => rule.selectors.includes('.mnt-root')).flatMap(rule => [...rule.important.keys()]))
    for (const property of ['display', 'visibility', 'opacity', 'overflow', 'clip-path']) expect(properties).toContain(property)
  })

  it('is the only stylesheet that uses !important', () => {
    const files = [here('../style.css'), ...readdirSync(here('.')).filter(name => name.endsWith('.css') && name !== 'guard.css').map(here)]
    for (const file of files) expect({ file, important: /!\s*important/i.test(readFileSync(file, 'utf8')) }).toEqual({ file, important: false })
  })
})
