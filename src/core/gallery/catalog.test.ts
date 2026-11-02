import { describe, expect, it } from 'vitest'
import { galleryColors, validateGalleryPack } from './catalog'

const pack = { kind: 'mnt.theme-pack', packVersion: 2, cssApiVersion: 1, meta: { name: 'Test', author: 'Author', tags: ['dark'], prompt: { en: 'A dark theme', 'zh-CN': '深色主题' } }, theme: { mode: 'dark', color: { bg: '#10141b', surface: '#161b22', text: '#ffffff', accent: '#a8f0db' } } }

describe('gallery validation', () => {
  it('accepts approved metadata and a valid pack', () => expect(validateGalleryPack(pack)).toEqual([]))
  it('rejects unknown keys and incomplete metadata', () => expect(validateGalleryPack({ ...pack, extra: true, meta: { ...pack.meta, mystery: true, prompt: { en: 'Only English' } } }).join(' ')).toMatch(/unknown|prompt/i))
  it('rejects unsafe CSS and URLs anywhere in metadata', () => expect(validateGalleryPack({ ...pack, css: '@import url(https://example.com/x);', meta: { ...pack.meta, author: 'https://example.com' } }).join(' ')).toMatch(/CSS|URL/i))
  it('rejects layout, widgets and variables', () => {
    for (const key of ['layout', 'widgets', 'variables']) expect(validateGalleryPack({ ...pack, [key]: [] }).join(' ')).toMatch(new RegExp(key))
  })
  it('indexes the active light palette', () => {
    const theme = { ...pack.theme, mode: 'light' as const, colorLight: { bg: '#ffffff', surface: '#f5f5f5', text: '#111111', accent: '#123456' } }
    expect(galleryColors(theme)).toEqual(theme.colorLight)
    expect(galleryColors(pack.theme)).toEqual(pack.theme.color)
  })
  it('rejects low contrast and oversized packs', () => {
    expect(validateGalleryPack({ ...pack, theme: { ...pack.theme, color: { ...pack.theme.color, text: '#111111' } } }).join(' ')).toMatch(/contrast/i)
    expect(validateGalleryPack({ ...pack, css: ' '.repeat(70000) }).join(' ')).toMatch(/size|large/i)
  })
})
