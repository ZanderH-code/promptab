import { describe, expect, it } from 'vitest'
import { galleryColors, validateGalleryPack } from './catalog'

const pack = { kind: 'mnt.theme-pack', packVersion: 2, cssApiVersion: 1, meta: { name: 'Test', author: 'Author', tags: ['dark'], prompt: { en: 'A dark theme', 'zh-CN': '深色主题' } }, theme: { mode: 'dark', color: { bg: '#10141b', surface: '#161b22', text: '#ffffff', accent: '#a8f0db' } } }

describe('gallery validation', () => {
  it('accepts approved metadata and a valid pack', () => expect(validateGalleryPack(pack)).toEqual([]))
  it('rejects unknown keys and incomplete metadata', () => expect(validateGalleryPack({ ...pack, extra: true, meta: { ...pack.meta, mystery: true, prompt: { en: 'Only English' } } }).join(' ')).toMatch(/unknown|prompt/i))
  it('rejects unsafe CSS and URLs anywhere in metadata', () => expect(validateGalleryPack({ ...pack, css: '@import url(https://example.com/x);', meta: { ...pack.meta, author: 'https://example.com' } }).join(' ')).toMatch(/CSS|URL/i))
  it('accepts safe layout, widgets and adjustable variables while rejecting unknown nested fields', () => {
    const candidate = { ...pack, layout: { areas: ['overview bookmarks'], columns: ['1fr', '1fr'], areaStyles: { overview: { padding: 12 } } }, widgets: [
      { id: 'clock', type: 'clock', area: 'overview', order: 0, props: { size: 1.5 } },
      { id: 'bookmarks', type: 'bookmarks', area: 'bookmarks', order: 0, props: { style: 'list' } },
    ], variables: [{ type: 'range', name: '--glow', label: { en: 'Glow', 'zh-CN': '光晕' }, min: 0, max: 10, unit: 'px', default: 3 }] }
    expect(validateGalleryPack(candidate)).toEqual([])
    expect(validateGalleryPack({ ...candidate, widgets: [{ ...candidate.widgets[0], props: { mystery: true } }, candidate.widgets[1]] }).join(' ')).toMatch(/unknown/i)
    expect(validateGalleryPack({ ...candidate, variables: [{ ...candidate.variables[0], mystery: true }] }).join(' ')).toMatch(/unknown/i)
    expect(validateGalleryPack({ ...candidate, layout: { ...candidate.layout, areaStyles: { overview: { mystery: true } } } }).join(' ')).toMatch(/unknown/i)
    expect(validateGalleryPack({ ...candidate, widgets: [candidate.widgets[0], { ...candidate.widgets[1], hidden: true }] }).join(' ')).toMatch(/bookmarks/i)
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
