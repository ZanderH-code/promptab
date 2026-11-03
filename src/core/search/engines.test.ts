import { describe, expect, it } from 'vitest'
import { searchUrl } from '../model'
import { LEGACY_SEARCH_ENGINES, SEARCH_ENGINES } from './engines'

describe('search engine presets', () => {
  it('keeps the supported presets in the requested order with valid templates', () => {
    expect(SEARCH_ENGINES.map(({ name }) => name)).toEqual([
      'Google', 'Bing', 'DuckDuckGo', 'Brave Search', 'Startpage', 'Ecosia', 'Qwant', 'Yahoo', 'Yandex', 'Kagi', 'Perplexity',
    ])
    expect(SEARCH_ENGINES.map(({ template }) => template)).toEqual([
      'https://www.google.com/search?q={query}',
      'https://www.bing.com/search?q={query}',
      'https://duckduckgo.com/?q={query}',
      'https://search.brave.com/search?q={query}',
      'https://www.startpage.com/sp/search?query={query}',
      'https://www.ecosia.org/search?q={query}',
      'https://www.qwant.com/?q={query}',
      'https://search.yahoo.com/search?p={query}',
      'https://yandex.com/search/?text={query}',
      'https://kagi.com/search?q={query}',
      'https://www.perplexity.ai/search?q={query}',
    ])
    for (const engine of SEARCH_ENGINES) {
      expect(engine.template.match(/\{query\}/g)).toHaveLength(1)
      expect(new URL(engine.template.replace('{query}', 'test')).protocol).toBe('https:')
      expect(searchUrl(engine.template, 'cats & dogs')).not.toContain('cats & dogs')
    }
  })

  it('keeps Baidu available to legacy migration recognition only', () => {
    expect(LEGACY_SEARCH_ENGINES.find(engine => engine.id === 'baidu')).toMatchObject({
      name: { 'zh-CN': '百度', en: 'Baidu' },
    })
    expect(SEARCH_ENGINES.map(engine => engine.id)).not.toContain('baidu')
  })
})
