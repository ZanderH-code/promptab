export const SEARCH_ENGINES = [
  { id: 'google', name: 'Google', template: 'https://www.google.com/search?q={query}', host: /(^|\.)google\./ },
  { id: 'bing', name: 'Bing', template: 'https://www.bing.com/search?q={query}', host: /(^|\.)bing\.com$/ },
  { id: 'duckduckgo', name: 'DuckDuckGo', template: 'https://duckduckgo.com/?q={query}', host: /(^|\.)duckduckgo\.com$/ },
  { id: 'brave', name: 'Brave Search', template: 'https://search.brave.com/search?q={query}', host: /(^|\.)search\.brave\.com$/ },
  { id: 'startpage', name: 'Startpage', template: 'https://www.startpage.com/sp/search?query={query}', host: /(^|\.)startpage\.com$/ },
  { id: 'ecosia', name: 'Ecosia', template: 'https://www.ecosia.org/search?q={query}', host: /(^|\.)ecosia\.org$/ },
  { id: 'qwant', name: 'Qwant', template: 'https://www.qwant.com/?q={query}', host: /(^|\.)qwant\.com$/ },
  { id: 'yahoo', name: 'Yahoo', template: 'https://search.yahoo.com/search?p={query}', host: /(^|\.)yahoo\.com$/ },
  { id: 'yandex', name: 'Yandex', template: 'https://yandex.com/search/?text={query}', host: /(^|\.)yandex\.com$/ },
  { id: 'kagi', name: 'Kagi', template: 'https://kagi.com/search?q={query}', host: /(^|\.)kagi\.com$/ },
  { id: 'perplexity', name: 'Perplexity', template: 'https://www.perplexity.ai/search?q={query}', host: /(^|\.)perplexity\.ai$/ },
] as const

const legacyBaidu = {
  id: 'baidu', host: /(^|\.)baidu\.com$/, name: { 'zh-CN': '百度', en: 'Baidu' },
} as const

type Language = 'zh-CN' | 'en'

/** Engines recognized while migrating v1 templates, including the removed Baidu preset. */
export const LEGACY_SEARCH_ENGINES = [
  ...SEARCH_ENGINES.map(engine => ({
    id: engine.id,
    host: engine.host,
    name: { 'zh-CN': engine.name, en: engine.name },
  })),
  legacyBaidu,
] as const

export function recognizeSearchEngine(template: string, language: Language) {
  let host = ''
  try { host = new URL(template.replaceAll('{query}', 'test')).hostname.toLowerCase() } catch { /* validated by the caller */ }
  const engine = LEGACY_SEARCH_ENGINES.find(candidate => candidate.host.test(host))
  return engine ? { id: engine.id, name: engine.name[language] } : null
}
