import { describe, expect, it } from 'vitest'
import { assetFontFamily, detectFont, isAssetFont } from './font'

const bytes = (head: string, length = 16) => Uint8Array.from({ length }, (_, i) => head.charCodeAt(i) || 0)
const ID = 'ab12cd34ef56'.padEnd(64, '0')

describe('detectFont', () => {
  it('recognizes woff2, otf and ttf signatures', () => {
    expect(detectFont(bytes('wOF2'))).toBe('woff2')
    expect(detectFont(bytes('OTTO'))).toBe('otf')
    expect(detectFont(bytes('true'))).toBe('ttf')
    expect(detectFont(Uint8Array.from([0, 1, 0, 0, ...new Array(12).fill(0)]))).toBe('ttf')
  })

  it('rejects images, scripts, old woff and tiny files', () => {
    expect(detectFont(bytes('\x89PNG\r\n\x1a\n'))).toBeUndefined()
    expect(detectFont(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeUndefined()
    expect(detectFont(bytes('wOFF'))).toBeUndefined()
    expect(detectFont(bytes('wOF2', 4))).toBeUndefined()
  })
})

describe('asset fonts', () => {
  it('derives a stable family name from the asset id', () => {
    expect(isAssetFont(`mnt-asset:${ID}`)).toBe(true)
    expect(isAssetFont('serif')).toBe(false)
    expect(isAssetFont('mnt-asset:abc')).toBe(false)
    expect(assetFontFamily(`mnt-asset:${ID}`)).toBe('MntFont-ab12cd34ef56')
  })
})
