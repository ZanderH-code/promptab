import { generate, parse, tokenTypes, tokenize, walk, type CssNode } from 'css-tree'

/** Limits from PLAN §4.6. */
export const MAX_CSS_BYTES = 64 * 1024
export const MAX_CSS_RULES = 2000

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

const ALLOWED_AT_RULES = new Set(['media', 'supports', 'keyframes', '-webkit-keyframes', 'font-face', 'container', 'layer', 'property'])
const FORBIDDEN_PROPERTIES = new Set(['-moz-binding', 'behavior'])
/** Functions whose bare string arguments are loaded as URLs. */
const URL_STRING_FUNCTIONS = new Set(['image-set', '-webkit-image-set', 'image', 'src', 'cross-fade', '-webkit-cross-fade'])
const ASSET_URL = /^mnt-asset:[a-f0-9]{64}$/
const ASSET_GLOBAL = /mnt-asset:[a-f0-9]{64}/g

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
      const allowedHere = inFontFace ? ASSET_URL.test(value) : ASSET_URL.test(value) || /^data:image\//i.test(value) || value.startsWith('#')
      if (!allowedHere) fail(inFontFace ? 'font-url' : 'url', node, value.length > 60 ? `${value.slice(0, 57)}...` : value)
      else if (ASSET_URL.test(value)) assets.add(value)
    }
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
          if (name === 'expression' || name === 'url') fail('function', node, name)
          else if (URL_STRING_FUNCTIONS.has(name)) {
            for (const child of node.children) if (child.type === 'String') checkUrl(child.value, child, inFontFace)
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

/** Replaces `mnt-asset:` references with resolved URLs; unknown assets become an empty data URL. */
export function resolveCssAssets(css: string, urls: ReadonlyMap<string, string>): string {
  return css.replace(ASSET_GLOBAL, reference => urls.get(reference) ?? 'data:,')
}
