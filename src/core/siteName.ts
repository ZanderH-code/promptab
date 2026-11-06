/**
 * Bundled host (plus optional product path) to display name. Kept separate from the icon table:
 * this module is only loaded from the lazy shortcut editor and bookmark/Infinity import paths.
 */
export type KnownSiteName = { hosts: string[]; prefix?: string; name: string }

export const KNOWN_SITE_NAMES: KnownSiteName[] = [
  { hosts: ['www.google.com'], prefix: '/maps', name: 'Google Maps' },
  { hosts: ['maps.google.com'], name: 'Google Maps' },
  { hosts: ['chatgpt.com', 'www.chatgpt.com'], name: 'ChatGPT' },
  { hosts: ['gemini.google.com'], name: 'Gemini' },
  { hosts: ['aistudio.google.com'], name: 'Google AI Studio' },
  { hosts: ['ai.google.dev'], name: 'Google AI for Developers' },
  { hosts: ['notebooklm.google.com'], name: 'NotebookLM' },
  { hosts: ['v0.app', 'www.v0.app', 'v0.dev', 'www.v0.dev'], name: 'v0' },
  { hosts: ['chat.deepseek.com', 'www.deepseek.com', 'deepseek.com'], name: 'DeepSeek' },
  { hosts: ['grok.com', 'www.grok.com'], name: 'Grok' },
  { hosts: ['claude.ai', 'www.claude.ai'], name: 'Claude' },
  { hosts: ['www.perplexity.ai', 'perplexity.ai'], name: 'Perplexity' },
  { hosts: ['outlook.live.com', 'outlook.office.com'], name: 'Outlook' },
  { hosts: ['mail.google.com'], name: 'Gmail' },
  { hosts: ['www.youtube.com', 'youtube.com', 'm.youtube.com'], name: 'YouTube' },
  { hosts: ['www.reddit.com', 'reddit.com'], name: 'Reddit' },
  { hosts: ['www.instagram.com', 'instagram.com'], name: 'Instagram' },
  { hosts: ['www.amazon.com', 'amazon.com'], name: 'Amazon' },
  { hosts: ['www.wikipedia.org', 'wikipedia.org'], name: 'Wikipedia' },
  { hosts: ['www.tradingview.com', 'tradingview.com'], name: 'TradingView' },
  { hosts: ['coinmarketcap.com', 'www.coinmarketcap.com'], name: 'CoinMarketCap' },
  { hosts: ['www.coingecko.com', 'coingecko.com'], name: 'CoinGecko' },
  { hosts: ['www.interactivebrokers.com', 'interactivebrokers.com'], name: 'Interactive Brokers' },
  { hosts: ['www.wealthsimple.com', 'wealthsimple.com'], name: 'Wealthsimple' },
  { hosts: ['dify.ai', 'www.dify.ai', 'cloud.dify.ai'], name: 'Dify' },
  { hosts: ['github.com', 'www.github.com'], name: 'GitHub' },
]

/** Common two-level public suffixes; a longer suffix list is not needed for display names. */
const TWO_LEVEL_SUFFIXES = new Set([
  'co.uk', 'com.cn', 'com.au', 'co.jp', 'co.nz', 'co.in', 'com.br', 'com.mx', 'com.sg',
  'com.hk', 'com.tw', 'co.kr', 'co.za', 'com.tr', 'com.ar', 'com.pl', 'co.il', 'com.my',
  'com.ph', 'com.vn', 'com.pk', 'com.eg', 'com.sa', 'co.id', 'co.th', 'com.ua', 'com.ru',
])
const GENERIC_TITLES = new Set(['home', 'homepage', 'welcome', '首页', '主页', 'log in', 'sign in', 'dashboard'])
const TITLE_SEPARATORS = /\s+[|–—·]\s+|\s+-\s+|:\s+/

function parse(input: string) {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url : null
  } catch { return null }
}

function titleCase(label: string) {
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : ''
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

function titleParts(text: string) {
  return text.split(TITLE_SEPARATORS).map(part => part.trim()).filter(Boolean)
}

function siteNameKeys(url: string) {
  return [knownSiteName(url), domainSiteName(url)].filter((name): name is string => !!name).map(normalizeName)
}

/** Bundled display name for a known host, honouring an optional product path prefix. */
export function knownSiteName(input: string): string | null {
  const url = parse(input)
  if (!url) return null
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/+$/, '') || '/'
  return KNOWN_SITE_NAMES.find(entry => entry.hosts.includes(host) && (!entry.prefix || path === entry.prefix || path.startsWith(entry.prefix + '/')))?.name ?? null
}

/** Main label of the registrable domain: claude.ai → Claude, www.example.co.uk → Example. */
export function domainSiteName(input: string): string {
  const url = parse(input)
  if (!url) return ''
  const host = url.hostname.toLowerCase()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  if (host.includes(':') || host.startsWith('[')) return host.replace(/^\[|\]$/g, '')
  const labels = host.replace(/^(www|m)\./, '').split('.')
  if (labels.length === 1) return titleCase(labels[0])
  const suffix = labels.slice(-2).join('.')
  const label = labels.length >= 3 && TWO_LEVEL_SUFFIXES.has(suffix) ? labels[labels.length - 3] : labels[labels.length - 2]
  return titleCase(label)
}

/** Trims a page title to the site's own name, dropping "Home"-style separators and suffixes. */
export function cleanSiteTitle(title: string, url = ''): string {
  const text = title.trim()
  if (!text) return ''
  const parts = titleParts(text)
  if (parts.length < 2) return text
  const names = siteNameKeys(url)
  const preferred = parts.find(part => names.includes(normalizeName(part)))
  if (preferred) return preferred
  const meaningful = parts.filter(part => !GENERIC_TITLES.has(part.toLowerCase()))
  const first = meaningful[0]
  if (first && first.length <= 32) return first
  if (meaningful.length) return meaningful.reduce((shortest, part) => part.length < shortest.length ? part : shortest)
  return text
}

const MAX_TIDY_TITLE = 40

function shortenTitle(value: string) {
  if (value.length <= MAX_TIDY_TITLE) return value
  const clipped = value.slice(0, MAX_TIDY_TITLE)
  const boundary = clipped.lastIndexOf(' ')
  return `${(boundary > 0 ? clipped.slice(0, boundary) : clipped).trimEnd()}…`
}

/**
 * Tidies an imported bookmark title only when it clearly carries a site name, a generic segment,
 * or is over-long. Short titles the user chose are kept verbatim.
 */
export function tidyImportedTitle(title: string, url = ''): string {
  const raw = title.trim()
  if (!raw) return ''
  if (raw.length > MAX_TIDY_TITLE) return shortenTitle(cleanSiteTitle(raw, url))
  const names = siteNameKeys(url)
  const shouldTidy = titleParts(raw).some(part => GENERIC_TITLES.has(part.toLowerCase()) || names.includes(normalizeName(part)))
  return shouldTidy ? cleanSiteTitle(raw, url) : raw
}

/** Known name first, then a cleaned page title, then the registrable domain. */
export function suggestSiteName(input: string, title?: string): string {
  const known = knownSiteName(input)
  if (known) return known
  const cleaned = title ? cleanSiteTitle(title, input) : ''
  if (cleaned) return cleaned
  const url = parse(input)
  if (!url) return ''
  const host = url.hostname.toLowerCase()
  // While the user is still typing a hostname (no dot yet), do not suggest a partial label.
  if (!host.includes('.') && !host.includes(':') && host !== 'localhost') return ''
  return domainSiteName(input)
}
