/**
 * nightTab colour rules, written from its documented behaviour (no nightTab code): a ramp of shades of one
 * hue between two lightness values, reversed for the light style, and black or white text by luminance.
 */

export type Rgb = { r: number; g: number; b: number }

const hex2 = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')
export const rgbHex = ({ r, g, b }: Rgb) => `#${hex2(r)}${hex2(g)}${hex2(b)}`

export function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/** HSL (degrees, percent, percent) to RGB channels 0-255, rounded like a browser does. */
export function hslRgb(h: number, s: number, l: number): Rgb {
  const sat = Math.min(100, Math.max(0, s)) / 100, light = Math.min(100, Math.max(0, l)) / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const hue = (((h % 360) + 360) % 360) / 60
  const x = chroma * (1 - Math.abs((hue % 2) - 1))
  const [r, g, b] = hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0] : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma] : hue < 5 ? [x, 0, chroma] : [chroma, 0, x]
  const m = light - chroma / 2
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

/** White text below a weighted luminance of 0.55, black from it up. */
export function textOn(color: Rgb | string): string {
  const { r, g, b } = typeof color === 'string' ? hexRgb(color) : color
  return (0.2721 * r + 0.7152 * g + 0.1255 * b) / 255 < 0.55 ? '#ffffff' : '#000000'
}

export type Ramp = {
  /** `shade(1)` is the page colour, `shade(2)` a plate on it, `shade(3)` that plate hovered, and so on. */
  shade: (role: number) => string
  text: (role: number) => string
}

/** The primary shade ramp: `count` shades of one hue from `start` to `end` % lightness. */
export function primaryRamp(hue: number, saturation: number, start: number, end: number, count: number, light: boolean): Ramp {
  const n = Math.max(2, Math.round(count))
  const shades = Array.from({ length: n }, (_, k) => rgbHex(hslRgb(hue, saturation, Math.round(start + (end - start) * k / (n - 1)))))
  const shade = (role: number) => shades[light ? n - Math.min(n, role) : Math.min(n, role) - 1]
  return { shade, text: role => textOn(shade(role)) }
}
