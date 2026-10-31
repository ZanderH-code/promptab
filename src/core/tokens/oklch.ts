/**
 * Pure OKLCH colour operations on `#rrggbb` strings (Björn Ottosson's OKLab, sRGB gamut).
 *
 * Everything the theme system derives (shades, mixes, lightness fixes) goes through here so steps are
 * perceptually even. Contrast uses the WCAG 2 relative luminance, since that is what the guideline measures.
 */

export type Oklch = { l: number; c: number; h: number }
export type Rgb = [number, number, number]

const HEX = /^#[\da-f]{6}$/i
const EPSILON = 1e-6
/** Below this chroma a colour is treated as neutral and its hue is meaningless. */
const NEUTRAL_CHROMA = 0.004

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToRgb(hex: string): Rgb {
  if (!HEX.test(hex)) throw new Error(`Expected #RRGGBB colour, got "${hex}"`)
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
}

function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToLinear(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(v => toLinear(v / 255))
  const [l, a, bb] = linearToOklab(r, g, b)
  const c = Math.hypot(a, bb)
  const h = c < EPSILON ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { l, c, h }
}

function inGamut(rgb: Rgb) {
  return rgb.every(v => v >= -EPSILON && v <= 1 + EPSILON)
}

function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  return oklabToLinear(l, c * Math.cos(rad), c * Math.sin(rad))
}

/** Convert to hex; out-of-gamut colours lose chroma (never lightness or hue) until they fit sRGB. */
export function oklchToHex(color: Oklch): string {
  const l = Math.min(1, Math.max(0, color.l))
  let c = Math.max(0, color.c)
  const h = color.h
  if (!inGamut(oklchToLinear({ l, c, h }))) {
    let lo = 0, hi = c
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklchToLinear({ l, c: mid, h }))) lo = mid
      else hi = mid
    }
    c = lo
  }
  return rgbToHex(oklchToLinear({ l, c, h }).map(v => fromLinear(Math.min(1, Math.max(0, v))) * 255) as Rgb)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => toLinear(v / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio, 1-21, symmetric in its arguments. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Black or white, whichever reads better on `background`. */
export function pickOnColor(background: string): '#000000' | '#ffffff' {
  return contrastRatio('#000000', background) >= contrastRatio('#ffffff', background) ? '#000000' : '#ffffff'
}

/** Mix `amount` (0-1) of `b` into `a` by interpolating OKLCH (hue along the shortest arc). */
export function mixOklch(a: string, b: string, amount: number): string {
  if (amount <= 0) return a.toLowerCase()
  if (amount >= 1) return b.toLowerCase()
  const x = hexToOklch(a), y = hexToOklch(b)
  let hx = x.h, hy = y.h
  if (x.c < NEUTRAL_CHROMA) hx = hy
  else if (y.c < NEUTRAL_CHROMA) hy = hx
  const delta = ((hy - hx + 540) % 360) - 180
  return oklchToHex({
    l: x.l + (y.l - x.l) * amount,
    c: x.c + (y.c - x.c) * amount,
    h: (hx + delta * amount + 360) % 360,
  })
}

/** Same hue and chroma at another lightness (chroma is reduced only to stay inside sRGB). */
export function withLightness(hex: string, l: number): string {
  return oklchToHex({ ...hexToOklch(hex), l })
}

/** `rgb(r g b / a%)` for translucent layers, from a hex colour and an alpha of 0-1. */
export function toRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${r} ${g} ${b} / ${Math.round(alpha * 1000) / 10}%)`
}

const STEPS = 1000

/**
 * Change only the OKLCH lightness of `fg` until it reaches `minRatio` against every colour in `against`,
 * moving as little as possible. Returns `fg` unchanged when it already passes, and the closest
 * attainable colour (black or white) when no lightness can satisfy all backgrounds.
 */
export function adjustLightness(fg: string, against: string | readonly string[], minRatio: number): string {
  const backgrounds = typeof against === 'string' ? [against] : against
  const passes = (hex: string) => backgrounds.every(bg => contrastRatio(hex, bg) >= minRatio)
  const normal = fg.toLowerCase()
  if (passes(normal)) return normal

  const origin = hexToOklch(fg)
  const base = { c: origin.c, h: origin.h }
  const at = (l: number) => oklchToHex({ ...base, l })
  let best: { hex: string; distance: number } | undefined
  for (let i = 0; i <= STEPS; i++) {
    const l = i / STEPS
    const distance = Math.abs(l - origin.l)
    if (best && distance >= best.distance) continue
    const hex = at(l)
    if (passes(hex)) best = { hex, distance }
  }
  if (best) return best.hex
  // Unreachable: fall back to whichever extreme has the best worst-case ratio.
  const worst = (hex: string) => Math.min(...backgrounds.map(bg => contrastRatio(hex, bg)))
  const dark = at(0), light = at(1)
  return worst(dark) >= worst(light) ? dark : light
}
