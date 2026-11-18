import { describe, expect, it } from 'vitest'
import { CSS_API_CLASSES } from './api'
import { CLASS_NOTES } from './notes'
import { findCssPitfalls } from './pitfalls'

const kinds = (css: string, cjk = false) => findCssPitfalls(css, { cjk }).map(pitfall => pitfall.kind)

describe('findCssPitfalls', () => {
  it('flags a box drawn around the whole websites widget', () => {
    expect(kinds('.mnt-bookmark-tile { border: 1px solid red; }')).toEqual(['websites-box'])
    expect(kinds('.mnt-group { background: var(--mnt-surface); }')).toEqual(['websites-box'])
    expect(kinds('[data-widget="bookmarks"] .mnt-bookmark-card { box-shadow: 0 2px 8px black; }')).toEqual(['websites-box'])
  })

  it('leaves single websites, radius and none values alone', () => {
    expect(kinds('.mnt-bookmark-tile .mnt-link-icon { border: 1px solid red; }')).toEqual([])
    expect(kinds('.mnt-group { border-radius: 12px; gap: 8px; }')).toEqual([])
    expect(kinds('.mnt-group { border: none; background: transparent; box-shadow: none; }')).toEqual([])
  })

  it('flags a box inside the search bar but not on the bar itself', () => {
    expect(kinds('.mnt-search-input { border-bottom: 1px solid var(--mnt-accent); }')).toEqual(['search-input-box'])
    expect(kinds('.mnt-search-input:focus { outline: 2px solid red; }')).toEqual(['search-input-box'])
    expect(kinds('.mnt-search:focus-within { border-color: var(--mnt-accent); }\n.mnt-search-input { caret-color: red; }')).toEqual([])
  })

  it('flags a second rule under a group heading', () => {
    expect(kinds('.mnt-group-title { border-bottom: 1px solid var(--mnt-border); }')).toEqual(['group-title-border'])
    expect(kinds('.mnt-group-title { color: var(--mnt-text-muted); }')).toEqual([])
  })

  it('flags wide tracking on localized text only in a Chinese interface', () => {
    const css = '.mnt-date { letter-spacing: 0.2em; text-transform: uppercase; }'
    expect(kinds(css, true)).toEqual(['cjk-tracking'])
    expect(kinds(css, false)).toEqual([])
    expect(kinds('.mnt-date { letter-spacing: 0.05em; }', true)).toEqual([])
    expect(kinds('.mnt-clock { letter-spacing: 0.2em; }', true)).toEqual([])
    expect(kinds('.mnt-link-name { letter-spacing: 2px; }', true)).toEqual(['cjk-tracking'])
  })

  it('reports each selector once with its position', () => {
    const found = findCssPitfalls('.mnt-clock { color: red; }\n.mnt-group, .mnt-bookmark-list { border: 1px solid; background: red; }')
    expect(found).toEqual([
      { kind: 'websites-box', selector: '.mnt-group', line: 2, column: 1 },
      { kind: 'websites-box', selector: '.mnt-bookmark-list', line: 2, column: 1 },
    ])
  })

  it('ignores empty or broken input', () => {
    expect(findCssPitfalls('   ')).toEqual([])
    expect(() => findCssPitfalls('.mnt-group { border: ')).not.toThrow()
  })
})

describe('CLASS_NOTES', () => {
  it('describes every public class in both languages', () => {
    for (const name of CSS_API_CLASSES) {
      expect(CLASS_NOTES[name].en.length).toBeGreaterThan(10)
      expect(CLASS_NOTES[name].zh.length).toBeGreaterThan(4)
    }
  })
})
