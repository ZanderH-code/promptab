import { generate, parse, walk, type CssNode, type Rule } from 'css-tree'

/**
 * Valid CSS that reliably looks wrong on the page. These came from real AI-written themes: names read
 * literally (`.mnt-bookmark-tile` as one tile, `.mnt-search-input` as the search bar) and Latin
 * typography habits applied to Chinese text. They are warnings, not errors: the CSS still applies.
 */
export type CssPitfall =
  /** A border, background or shadow on the whole websites widget boxes every website at once. */
  | { kind: 'websites-box'; selector: string; line: number; column: number }
  /** A border, background or shadow on the bare search field draws a second box inside the search bar. */
  | { kind: 'search-input-box'; selector: string; line: number; column: number }
  /** A border on a group heading doubles the hairline rule it already draws. */
  | { kind: 'group-title-border'; selector: string; line: number; column: number }
  /** Wide letter-spacing on text that is Chinese in a Chinese interface spreads characters apart. */
  | { kind: 'cjk-tracking'; selector: string; line: number; column: number }

const WEBSITES = /^mnt-(?:group|bookmark-(?:tile|list|minimal|card|icon-only))$/
const BOX = /^(?:border(?!-collapse|-spacing|-radius)(?:-.*)?|background(?:-color|-image)?|box-shadow|outline)$/
const NONE = /^(?:none|0|0px|transparent|initial|unset|inherit|revert(?:-layer)?)$/i
/** Elements whose text follows the interface language. */
const LOCALIZED = new Set(['mnt-date', 'mnt-group-title', 'mnt-link-name', 'mnt-folder-name', 'mnt-search-input'])

/** Class names in the part of a selector that picks the styled element (after the last combinator). */
function subjectClasses(selector: CssNode): string[] {
  let classes: string[] = []
  walk(selector, {
    visit: 'Selector',
    enter(node) {
      if (node.type !== 'Selector') return
      node.children.forEach(child => {
        if (child.type === 'Combinator') classes = []
        else if (child.type === 'ClassSelector') classes.push(child.name)
      })
    },
  })
  return classes
}

/** Letter-spacing wider than about 0.08em (or 1.5px), the point where CJK text starts to look scattered. */
function wideTracking(value: string): boolean {
  const match = /^(-?[\d.]+)(em|rem|px)$/i.exec(value.trim())
  if (!match) return false
  const size = Number(match[1])
  return match[2].toLowerCase() === 'px' ? size > 1.5 : size > 0.08
}

/** Finds the pitfalls in a stylesheet. `cjk` adds the letter-spacing check for Chinese interfaces. */
export function findCssPitfalls(source: string, { cjk = false } = {}): CssPitfall[] {
  if (!source.trim()) return []
  let ast: CssNode
  try { ast = parse(source, { positions: true, parseValue: false, parseRulePrelude: true, onParseError: () => {} }) } catch { return [] }
  const found: CssPitfall[] = []
  const seen = new Set<string>()
  const add = (pitfall: CssPitfall) => {
    const key = `${pitfall.kind}:${pitfall.selector}`
    if (!seen.has(key)) { seen.add(key); found.push(pitfall) }
  }
  walk(ast, {
    visit: 'Rule',
    enter(node: Rule) {
      if (node.prelude.type !== 'SelectorList') return
      const declarations: { property: string; value: string }[] = []
      node.block.children.forEach(child => { if (child.type === 'Declaration') declarations.push({ property: child.property.toLowerCase(), value: generate(child.value).trim() }) })
      const at = { line: node.loc?.start.line ?? 1, column: node.loc?.start.column ?? 1 }
      const boxed = declarations.some(({ property, value }) => BOX.test(property) && !NONE.test(value))
      const bordered = declarations.some(({ property, value }) => /^border(?:-(?:top|bottom|block(?:-start|-end)?))?$/.test(property) && !NONE.test(value))
      const tracked = declarations.some(({ property, value }) => property === 'letter-spacing' && wideTracking(value))
      node.prelude.children.forEach(selector => {
        const classes = subjectClasses(selector)
        const text = generate(selector)
        if (boxed && classes.some(name => WEBSITES.test(name))) add({ kind: 'websites-box', selector: text, ...at })
        if (boxed && classes.includes('mnt-search-input')) add({ kind: 'search-input-box', selector: text, ...at })
        if (bordered && classes.includes('mnt-group-title')) add({ kind: 'group-title-border', selector: text, ...at })
        if (cjk && tracked && classes.some(name => LOCALIZED.has(name))) add({ kind: 'cjk-tracking', selector: text, ...at })
      })
    },
  })
  return found
}
