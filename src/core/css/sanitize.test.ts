import { describe, expect, it } from 'vitest'
import { MAX_CSS_BYTES, MAX_CSS_RULES, resolveCssAssets, sanitizeCss } from './sanitize'

const ASSET = `mnt-asset:${'a'.repeat(64)}`
const codes = (css: string) => sanitizeCss(css).errors.map(error => error.code)

describe('sanitizeCss', () => {
  it('wraps valid css in the user layer and reports its stats', () => {
    const result = sanitizeCss('/* c */ .mnt-clock { color: var(--mnt-accent); } @media (min-width: 600px) { .mnt-link { gap: 4px } }')
    expect(result).toMatchObject({ ok: true, errors: [], rules: 3, usesImportant: false })
    expect(result.layered.startsWith('@layer user{')).toBe(true)
    expect(result.layered.endsWith('}')).toBe(true)
    expect(result.layered).not.toContain('/*')
    expect(result.classNames.sort()).toEqual(['mnt-clock', 'mnt-link'])
  })

  it('accepts empty css and produces no layer', () => {
    expect(sanitizeCss('  \n ')).toMatchObject({ ok: true, css: '', layered: '' })
  })

  it.each([
    ['@import', '@import "https://evil.test/a.css"; a{color:red}', 'at-rule'],
    ['@import url', '@import url(https://evil.test/a.css);', 'at-rule'],
    ['@namespace', '@namespace svg url(http://www.w3.org/2000/svg);', 'at-rule'],
    ['@charset', '@charset "utf-8"; a{color:red}', 'at-rule'],
    ['@page', '@page { margin: 1cm }', 'at-rule'],
    ['escaped at-rule', '@\\69mport "x.css";', 'escape'],
  ])('rejects %s', (_name, css, code) => {
    expect(codes(css)).toContain(code)
    expect(sanitizeCss(css).layered).toBe('')
  })

  it.each([
    ['external url', 'a{background:url(https://evil.test/x.png)}'],
    ['quoted external url', 'a{background:url("http://evil.test/x.png")}'],
    ['protocol relative', 'a{background:url(//evil.test/x.png)}'],
    ['relative url', 'a{background:url(x.png)}'],
    ['javascript url', 'a{background:url("javascript:alert(1)")}'],
    ['non-image data url', 'a{background:url(data:text/html;base64,AAAA)}'],
    ['url inside a custom property', 'a{--x:url(https://evil.test/x.png)}'],
    ['image-set string', 'a{background:image-set("https://evil.test/x.png" 1x)}'],
    ['src() string', 'a{background:src("https://evil.test/x.png")}'],
    ['nested in a function', 'a{background:linear-gradient(red,blue),url(https://evil.test/x.png)}'],
  ])('rejects %s', (_name, css) => {
    const result = sanitizeCss(css)
    expect(result.ok).toBe(false)
    expect(result.errors[0].code).toBe('url')
  })

  it('allows data:image, local asset and fragment urls', () => {
    expect(sanitizeCss('a{background:url(data:image/png;base64,iVBORw0KGgo=)}').ok).toBe(true)
    expect(sanitizeCss('a{mask:url(#m);filter:url(#f)}').ok).toBe(true)
    const withAsset = sanitizeCss(`a{background:url(${ASSET})}`)
    expect(withAsset).toMatchObject({ ok: true, assets: [ASSET] })
    expect(sanitizeCss('a{background:url(mnt-asset:abc)}').ok).toBe(false)
  })

  it('limits @font-face sources to local assets', () => {
    expect(sanitizeCss(`@font-face{font-family:Mine;src:url(${ASSET}) format("woff2")}`).ok).toBe(true)
    expect(sanitizeCss('@font-face{font-family:X;src:url(https://evil.test/f.woff2)}').errors[0].code).toBe('font-url')
    expect(sanitizeCss('@font-face{font-family:X;src:url(data:image/png;base64,AAAA)}').errors[0].code).toBe('font-url')
    expect(sanitizeCss('@font-face{font-family:X;src:local("Arial")}').ok).toBe(true)
  })

  it.each([
    ['-moz-binding', 'a{-moz-binding:url(#x)}'],
    ['behavior', 'a{behavior:url(x.htc)}'],
  ])('rejects the %s property', (_name, css) => {
    expect(codes(css)).toContain('property')
  })

  it('rejects expression() and escaped function or property names', () => {
    expect(codes('a{width:expression(alert(1))}')).toContain('function')
    // Whether the parser or the escape check stops them, they never pass.
    expect(sanitizeCss('a{background:u\\72l(https://evil.test/x.png)}').ok).toBe(false)
    expect(sanitizeCss('a{-moz-\\62inding:url(#x)}').ok).toBe(false)
    expect(sanitizeCss('a{background:\\75rl(https://evil.test/x.png)}').ok).toBe(false)
  })

  it('rejects syntax errors and unbalanced brackets so the wrapper cannot be escaped', () => {
    expect(codes('a{color:red')).toContain('unbalanced')
    expect(codes('a{color:red}}')).toContain('unbalanced')
    expect(codes('a{color:red}} @layer escape{ b{color:red}')).toContain('unbalanced')
    expect(codes('a{background:url(x}')).toContain('unbalanced')
    expect(codes('a{color:red} /* } */ b{')).toContain('unbalanced')
    expect(sanitizeCss('a{content:"}"} /* { */ b{color:red}').ok).toBe(true)
    // A closing brace smuggled through a declaration cannot leave the layer: the result is a single balanced block.
    const attempt = sanitizeCss('a{color:red} } body{display:none}')
    expect(attempt.ok).toBe(false)
    expect(attempt.layered).toBe('')
  })

  it('reports line and column of the first problem', () => {
    const result = sanitizeCss('a{color:red}\n\n b{background:url(https://evil.test/x)}')
    expect(result.errors[0]).toMatchObject({ code: 'url', line: 3 })
  })

  it('enforces the size and rule limits', () => {
    expect(codes(`a{content:"${'x'.repeat(MAX_CSS_BYTES)}"}`)).toEqual(['too-large'])
    const many = Array.from({ length: MAX_CSS_RULES + 1 }, (_, i) => `.r${i}{order:${i}}`).join('')
    expect(codes(many)).toEqual(['too-many-rules'])
    expect(sanitizeCss(Array.from({ length: MAX_CSS_RULES }, (_, i) => `.r${i}{order:${i}}`).join('')).ok).toBe(true)
  })

  it('notes !important usage without blocking it', () => {
    expect(sanitizeCss('a{color:red!important}')).toMatchObject({ ok: true, usesImportant: true })
  })

  it('keeps keyframes, supports, container and property rules', () => {
    expect(sanitizeCss('@keyframes k{from{opacity:0}to{opacity:1}} @supports (display:grid){a{display:grid}} @container (min-width:300px){a{gap:2px}} @property --glow{syntax:"<length>";inherits:false;initial-value:0px}').ok).toBe(true)
  })
})

describe('resolveCssAssets', () => {
  it('swaps asset references for resolved urls and neutralizes unknown ones', () => {
    const css = `a{background:url(${ASSET})}b{background:url(mnt-asset:${'b'.repeat(64)})}`
    const resolved = resolveCssAssets(css, new Map([[ASSET, 'blob:test/1']]))
    expect(resolved).toBe('a{background:url(blob:test/1)}b{background:url(data:,)}')
  })
})
