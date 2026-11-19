import type { CssNode, WalkOptionsNoVisit } from 'css-tree'
import generate from 'css-tree/generator'
import parse from 'css-tree/parser'
import { tokenTypes, tokenize } from 'css-tree/tokenizer'
import walk from 'css-tree/walker'

export const CSS_SANITIZER_POLICY = {
  maxBytes: 64 * 1024,
  maxRules: 2000,
  allowedAtRules: ['media', 'supports', 'keyframes', '-webkit-keyframes', 'font-face', 'container', 'layer', 'property'],
  forbiddenProperties: ['-moz-binding', 'behavior'],
  forbiddenFunctions: ['expression', 'url'],
  urlStringFunctions: ['image-set', '-webkit-image-set', 'image', 'src', 'cross-fade', '-webkit-cross-fade'],
  assetUrlPattern: '^mnt-asset:[a-f0-9]{64}$',
  allowedImageUrlPrefix: 'data:image/',
  allowedFragmentPrefix: '#',
} as const

export const MAX_CSS_BYTES = CSS_SANITIZER_POLICY.maxBytes
export const MAX_CSS_RULES = CSS_SANITIZER_POLICY.maxRules

export type CssIssueCode =
  | 'syntax' | 'unbalanced' | 'too-large' | 'too-many-rules'
  | 'at-rule' | 'url' | 'font-url' | 'property' | 'function' | 'escape' | 'raw-value'
export type CssIssue = { code: CssIssueCode; line: number; column: number; detail?: string }

export type SanitizedCss = {
  ok: boolean
  /** Blocking problems; the CSS must not be applied while any exist. */
  errors: CssIssue[]
  /** Normalized CSS (comments removed) or '' when not ok. */
  css: string
  /** The same CSS wrapped in the `user` layer, ready to inject. */
  layered: string
  bytes: number
  rules: number
  usesImportant: boolean
  /** Class names the CSS selects, for stability checks against the public CSS API. */
  classNames: string[]
  /** `mnt-asset:` references that must be resolved to blob URLs before injection. */
  assets: string[]
}

const ALLOWED_AT_RULES = new Set<string>(CSS_SANITIZER_POLICY.allowedAtRules)
const FORBIDDEN_PROPERTIES = new Set<string>(CSS_SANITIZER_POLICY.forbiddenProperties)
/** Functions whose bare string arguments are loaded as URLs. */
const URL_STRING_FUNCTIONS = new Set<string>(CSS_SANITIZER_POLICY.urlStringFunctions)
const FORBIDDEN_FUNCTIONS = new Set<string>(CSS_SANITIZER_POLICY.forbiddenFunctions)
const ASSET_URL = new RegExp(CSS_SANITIZER_POLICY.assetUrlPattern)
const ASSET_GLOBAL = new RegExp(CSS_SANITIZER_POLICY.assetUrlPattern.slice(1, -1), 'g')
/** Functions whose result is only known once the page computes styles, so a URL could hide behind them. */
const INDIRECT_FUNCTIONS = new Set(['var', 'env', 'attr', 'if', 'inherit'])
/** Functions a URL-taking function may contain besides other URL-taking functions; none of them loads anything. */
const URL_ARGUMENT_FUNCTIONS = /^(?:type|calc|min|max|clamp|rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|(?:-webkit-)?(?:repeating-)?(?:linear|radial|conic)-gradient)$/

type FunctionNode = Extract<CssNode, { type: 'Function' }>
type UrlArgumentVisitor = {
  /** A string the function would load as a URL. */
  url(node: Extract<CssNode, { type: 'String' }>): void
  /** A node whose value cannot be checked here (an indirect or unknown function, or unparsed text). */
  blocked(node: CssNode, detail: string): void
}

/**
 * Walks every argument of a URL-taking function such as `image-set()`, not only its direct strings: a string
 * nested in another URL-taking function is a URL too, and `var()`/`env()`/`attr()` or an unknown function
 * could supply one when styles are computed.
 */
function visitUrlArguments(fn: FunctionNode, visitor: UrlArgumentVisitor) {
  const visit = (node: CssNode, loadsStrings: boolean) => {
    if (node.type === 'String') { if (loadsStrings) visitor.url(node); return }
    if (node.type === 'Raw') { if (node.value.trim()) visitor.blocked(node, 'raw'); return }
    let strings = loadsStrings
    if (node.type === 'Function') {
      const name = node.name.toLowerCase()
      if (INDIRECT_FUNCTIONS.has(name)) { visitor.blocked(node, name); return }
      if (URL_STRING_FUNCTIONS.has(name)) strings = true
      else if (!loadsStrings || URL_ARGUMENT_FUNCTIONS.test(name)) strings = false
      else { visitor.blocked(node, name); return }
    }
    if ('children' in node && node.children) for (const child of node.children) visit(child, strings)
  }
  for (const child of fn.children) visit(child, true)
}

const byteLength = (text: string) => new TextEncoder().encode(text).length

/** Counts brackets outside strings and comments; css-tree silently closes an unterminated block. */
function balanceIssue(source: string): CssIssue | null {
  const stack: { type: number; line: number; column: number }[] = []
  const lineStarts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1)
  const position = (offset: number) => {
    let low = 0, high = lineStarts.length - 1
    while (low < high) { const mid = (low + high + 1) >> 1; if (lineStarts[mid] <= offset) low = mid; else high = mid - 1 }
    return { line: low + 1, column: offset - lineStarts[low] + 1 }
  }
  const pairs: Record<number, number> = {
    [tokenTypes.RightCurlyBracket]: tokenTypes.LeftCurlyBracket,
    [tokenTypes.RightParenthesis]: tokenTypes.LeftParenthesis,
    [tokenTypes.RightSquareBracket]: tokenTypes.LeftSquareBracket,
  }
  let issue: CssIssue | null = null
  tokenize(source, (type, start) => {
    if (issue) return
    // A function token carries its own "(".
    if (type === tokenTypes.LeftCurlyBracket || type === tokenTypes.LeftParenthesis || type === tokenTypes.LeftSquareBracket) stack.push({ type, ...position(start) })
    else if (type === tokenTypes.Function) stack.push({ type: tokenTypes.LeftParenthesis, ...position(start) })
    else if (type in pairs) {
      const open = stack.pop()
      if (!open || open.type !== pairs[type]) issue = { code: 'unbalanced', ...position(start) }
    }
  })
  if (issue) return issue
  const unclosed = stack.at(-1)
  return unclosed ? { code: 'unbalanced', line: unclosed.line, column: unclosed.column } : null
}

function locate(node: CssNode): { line: number; column: number } {
  return { line: node.loc?.start.line ?? 1, column: node.loc?.start.column ?? 1 }
}

/**
 * Parses user CSS into an AST, rejects everything outside the whitelist and returns it wrapped in
 * `@layer user`. Syntax errors and unbalanced brackets are rejected here, so the wrapper cannot be escaped.
 */
export function sanitizeCss(source: string): SanitizedCss {
  const errors: CssIssue[] = []
  const classNames = new Set<string>()
  const assets = new Set<string>()
  const bytes = byteLength(source)
  let rules = 0
  let usesImportant = false
  const fail = (code: CssIssueCode, node: CssNode | { line: number; column: number }, detail?: string) => {
    const where = 'type' in node ? locate(node) : node
    errors.push({ code, line: where.line, column: where.column, ...(detail ? { detail } : {}) })
  }

  if (bytes > MAX_CSS_BYTES) fail('too-large', { line: 1, column: 1 }, String(bytes))
  const unbalanced = bytes > MAX_CSS_BYTES ? null : balanceIssue(source)
  if (unbalanced) errors.push(unbalanced)

  let ast: CssNode | null = null
  if (!errors.length && source.trim()) {
    ast = parse(source, {
      positions: true, parseValue: true, parseCustomProperty: true, parseAtrulePrelude: true, parseRulePrelude: true,
      onParseError: error => errors.push({ code: 'syntax', line: error.line ?? 1, column: error.column ?? 1, detail: error.message }),
    })
  }

  if (ast && !errors.length) {
    const checkUrl = (value: string, node: CssNode, inFontFace: boolean) => {
      const allowedHere = inFontFace ? ASSET_URL.test(value) : ASSET_URL.test(value) || value.toLowerCase().startsWith(CSS_SANITIZER_POLICY.allowedImageUrlPrefix) || value.startsWith(CSS_SANITIZER_POLICY.allowedFragmentPrefix)
      if (!allowedHere) fail(inFontFace ? 'font-url' : 'url', node, value.length > 60 ? `${value.slice(0, 57)}...` : value)
      else if (ASSET_URL.test(value)) assets.add(value)
    }
    // Nested URL functions are checked with the outermost one.
    const checkedFunctions = new WeakSet<CssNode>()
    walk(ast, function (node) {
      const inFontFace = this.atrule?.name.toLowerCase() === 'font-face'
      switch (node.type) {
        case 'Rule': rules++; break
        case 'Atrule': {
          rules++
          if (node.name.includes('\\')) fail('escape', node, node.name)
          else if (!ALLOWED_AT_RULES.has(node.name.toLowerCase())) fail('at-rule', node, `@${node.name}`)
          break
        }
        case 'ClassSelector': classNames.add(node.name); break
        case 'Declaration': {
          if (node.important) usesImportant = true
          if (node.property.includes('\\')) fail('escape', node, node.property)
          else if (FORBIDDEN_PROPERTIES.has(node.property.toLowerCase())) fail('property', node, node.property)
          if (node.value.type === 'Raw' && node.value.value.trim()) fail('raw-value', node, node.property)
          break
        }
        case 'Url': checkUrl(node.value, node, inFontFace); break
        case 'Function': {
          if (node.name.includes('\\')) { fail('escape', node, node.name); break }
          const name = node.name.toLowerCase()
          if (FORBIDDEN_FUNCTIONS.has(name)) fail('function', node, name)
          else if (URL_STRING_FUNCTIONS.has(name) && !checkedFunctions.has(node)) {
            walk(node, inner => { if (inner.type === 'Function') checkedFunctions.add(inner) })
            visitUrlArguments(node, {
              url: child => checkUrl(child.value, child, inFontFace),
              blocked: (child, detail) => fail(child.type === 'Raw' ? 'raw-value' : 'function', child, `${name}(${detail})`),
            })
          }
          break
        }
        case 'Raw': {
          // Anything the parser could not model must not hide a URL or import behind it.
          if (/url\s*\(|@import|expression\s*\(/i.test(node.value)) fail('raw-value', node)
          break
        }
        default: break
      }
    })
    if (rules > MAX_CSS_RULES) fail('too-many-rules', { line: 1, column: 1 }, String(rules))
  }

  const ok = errors.length === 0
  const css = ok && ast ? generate(ast) : ''
  return {
    ok, errors, css, bytes, rules, usesImportant,
    layered: ok && css ? `@layer user{${css}}` : '',
    classNames: [...classNames], assets: [...assets],
  }
}

/** Removes declarations containing local assets before sharing CSS. */
export function portableCss(source: string): { css: string | undefined; removed: number } {
  const checked = sanitizeCss(source)
  if (!checked.ok) return { css: undefined, removed: 0 }
  if (!checked.css) return { css: '', removed: 0 }
  const ast = parse(checked.css, { parseValue: true, parseCustomProperty: true })
  let removed = 0
  const affectedRules = new WeakSet<CssNode>()
  const visitor: WalkOptionsNoVisit = {
    leave(node, item, list) {
      if (node.type === 'Declaration' && item && list) {
        let referencesAsset = false
        const localUrl = (value: string) => ASSET_URL.test(value) || value.toLowerCase().startsWith(CSS_SANITIZER_POLICY.allowedImageUrlPrefix)
        walk(node.value, value => {
          if (value.type === 'Url' && localUrl(value.value)) referencesAsset = true
          else if (value.type === 'Function' && URL_STRING_FUNCTIONS.has(value.name.toLowerCase())) {
            visitUrlArguments(value, { url: child => { if (localUrl(child.value)) referencesAsset = true }, blocked: () => {} })
          }
        })
        if (referencesAsset) {
          if (this.rule) affectedRules.add(this.rule)
          if (this.atrule) affectedRules.add(this.atrule)
          list.remove(item)
          removed++
        }
      } else if ((node.type === 'Rule' || node.type === 'Atrule') && item && list && affectedRules.has(node) && node.block?.children.isEmpty) {
        list.remove(item)
      }
    },
  }
  walk(ast, visitor)
  const css = removed ? generate(ast) : source
  return { css: sanitizeCss(css).ok ? css : undefined, removed }
}

/** Replaces `mnt-asset:` references with resolved URLs; unknown assets become an empty data URL. */
export function resolveCssAssets(css: string, urls: ReadonlyMap<string, string>): string {
  return css.replace(ASSET_GLOBAL, reference => urls.get(reference) ?? 'data:,')
}
