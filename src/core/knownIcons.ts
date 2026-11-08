import { normalizeUrl } from './favicon'

export type KnownIcon = {
  /** Exact hostnames, lowercase. Add www variants explicitly. */
  hosts: string[]
  /** When set, only this path and its children match; other paths on the host keep their own cache entry. */
  prefix?: string
  /** Stable official icon URLs. Cross-origin requests are allowed only for URLs listed here. */
  urls: string[]
}

// Keep prefixed entries before other entries for the same host: the first match wins.
export const KNOWN_ICONS: KnownIcon[] = [
  // Google Maps lives under www.google.com/maps; keep it separate from the rest of www.google.com.
  { hosts: ['www.google.com'], urls: ['https://www.gstatic.com/images/branding/productlogos/maps_2025_round/v1/web-512dp/logo_maps_2025_round_color_1x_web_512dp.png'], prefix: '/maps' },
  // maps.google.com serves the same product at the root path.
  { hosts: ['maps.google.com'], urls: ['https://www.gstatic.com/images/branding/productlogos/maps_2025_round/v1/web-512dp/logo_maps_2025_round_color_1x_web_512dp.png'] },
  // chatgpt.com moved its icons under /unauth-mweb/images; the five fixed root paths all return 404.
  { hosts: ['chatgpt.com', 'www.chatgpt.com'], urls: ['https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png', 'https://chatgpt.com/unauth-mweb/images/favicon.svg'] },
  // v0 serves an SPA that answers 200 text/html for every fixed path.
  { hosts: ['v0.app', 'www.v0.app', 'v0.dev', 'www.v0.dev'], urls: ['https://v0.app/assets/icon.svg', 'https://v0.app/chat-static/assets/icon-dark-512x512.png'] },
  // AI Studio publishes a stable product logo on gstatic.
  { hosts: ['aistudio.google.com'], urls: ['https://www.gstatic.com/images/branding/productlogos/ai_studio/v1/web-512dp/logo_ai_studio_color_1x_web_512dp.png'] },
  // Google AI for Developers publishes a PWA icon.
  { hosts: ['ai.google.dev'], urls: ['https://ai.google.dev/_pwa/googledevai/icons/icon-512x512.png'] },
  // The Google AI landing page uses the gradient Google G.
  { hosts: ['ai.google'], urls: ['https://www.gstatic.com/images/branding/googleg_gradient/svg/googleg_gradient_standard_48px.svg'] },
  // NotebookLM publishes a stable SVG through gstatic.
  { hosts: ['notebooklm.google.com'], urls: ['https://www.gstatic.com/tailwind/_/static/branding/v6/light_mode/favicon/favicon.svg'] },
  // DeepSeek answers every root path on chat with a WAF HTML page.
  { hosts: ['chat.deepseek.com', 'www.deepseek.com', 'deepseek.com'], urls: ['https://www.deepseek.com/favicon.ico'] },
  // Grok publishes stable SVG and 512 px PNG icons at the site root.
  { hosts: ['grok.com', 'www.grok.com'], urls: ['https://grok.com/images/favicon.svg', 'https://grok.com/images/android-chrome-512x512.png'] },
  // Outlook redirects the fixed paths to a login page; Microsoft onecdn serves the touch icon.
  { hosts: ['outlook.live.com', 'outlook.office.com'], urls: ['https://res.public.onecdn.static.microsoft/assets/mail/pwa/v4/pngs/apple-touch-icon.png', 'https://outlook.live.com/mail/favicon.ico'] },
  // Reddit serves a stable 128 px precomposed touch icon.
  { hosts: ['www.reddit.com', 'reddit.com'], urls: ['https://www.reddit.com/apple-touch-icon-precomposed.png'] },
  // TradingView publishes a 512 px app icon on its static host.
  { hosts: ['www.tradingview.com', 'tradingview.com'], urls: ['https://static.tradingview.com/static/images/favicon/android-chrome-512x512.png'] },
  // CoinMarketCap publishes a 512 px logo on its image host.
  { hosts: ['coinmarketcap.com', 'www.coinmarketcap.com'], urls: ['https://s2.coinmarketcap.com/static/cloud/img/logo_512x512_1.png'] },
  // Interactive Brokers publishes a 192 px home-screen icon.
  { hosts: ['www.interactivebrokers.com', 'interactivebrokers.com'], urls: ['https://www.interactivebrokers.com/images/web/favicons/home-screen-icon-192x192.png'] },
  // Wealthsimple publishes a touch icon at the root.
  { hosts: ['www.wealthsimple.com', 'wealthsimple.com'], urls: ['https://www.wealthsimple.com/apple-icon.png'] },
]

function parsed(input: string) {
  const normalized = normalizeUrl(input)
  return normalized ? new URL(normalized) : null
}

export function knownIconFor(input: string): KnownIcon | null {
  const url = parsed(input)
  if (!url) return null
  const host = url.hostname.toLowerCase()
  const path = url.pathname.replace(/\/+$/, '') || '/'
  return KNOWN_ICONS.find(entry => entry.hosts.includes(host) && (!entry.prefix || path === entry.prefix || path.startsWith(entry.prefix + '/'))) ?? null
}

/** Known entries with a path prefix keep separate cache entries per product path. */
export function knownCacheKey(input: string): string | null {
  const url = parsed(input)
  const known = knownIconFor(input)
  if (!url || !known?.prefix) return null
  return url.origin + known.prefix
}

/** Cache and discovery key: origin plus the known product path, or just the origin. */
export function iconCacheKey(input: string): string | null {
  const url = parsed(input)
  return url ? knownCacheKey(input) ?? url.origin : null
}

/** A cached URL may cross origins only when the known table lists it for this shortcut. */
export function isAllowedIconUrl(key: string, url: string): boolean {
  const known = knownIconFor(key)
  if (known?.urls.includes(url)) return true
  try { return new URL(url).origin === new URL(key).origin } catch { return false }
}
