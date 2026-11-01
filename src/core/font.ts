export const MAX_FONT_BYTES = 2 * 1024 * 1024
const ASSET_FONT = /^mnt-asset:([a-f0-9]{64})$/

/** Built-in font keys: system stacks and the bundled OFL fonts. */
export const FONT_KEYS = ['system', 'serif', 'mono', 'rounded', 'barlow-condensed', 'cormorant', 'outfit'] as const
export const isFontKey = (value: string): value is (typeof FONT_KEYS)[number] => (FONT_KEYS as readonly string[]).includes(value)

export type FontFormat = 'woff2' | 'ttf' | 'otf'

/** Identifies a font file by its signature, so a renamed image or script is never accepted as a font. */
export function detectFont(bytes: Uint8Array): FontFormat | undefined {
  if (bytes.length < 12) return undefined
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  if (tag === 'wOF2') return 'woff2'
  if (tag === 'OTTO') return 'otf'
  if (tag === 'true' || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return 'ttf'
  return undefined
}

/** The font reference is an uploaded asset rather than one of the built-in keys. */
export const isAssetFont = (ref: string) => ASSET_FONT.test(ref)

/** A family name that is stable for one uploaded file and cannot clash with installed fonts. */
export const assetFontFamily = (ref: string) => `MntFont-${ref.slice('mnt-asset:'.length, 'mnt-asset:'.length + 12)}`
