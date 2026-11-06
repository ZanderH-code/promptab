import { expect, it } from 'vitest'
import { isKnownHost } from './faviconQuality'
import { iconCacheKey, isAllowedIconUrl, KNOWN_ICONS, knownIconFor } from './knownIcons'
import { knownBrand } from './knownBrands'

const MAPS_ICON = 'https://www.gstatic.com/images/branding/productlogos/maps_2025_round/v1/web-512dp/logo_maps_2025_round_color_1x_web_512dp.png'

it('matches known hosts, ignoring www variants only when listed', () => {
  expect(knownIconFor('https://chatgpt.com/')?.urls).toContain('https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png')
  expect(knownIconFor('https://www.chatgpt.com/')?.urls).toContain('https://chatgpt.com/unauth-mweb/images/chatgpt-icon-512x512.png')
  expect(knownIconFor('https://outlook.live.com/mail/0/')?.urls).toContain('https://res.public.onecdn.static.microsoft/assets/mail/pwa/v4/pngs/apple-touch-icon.png')
  expect(knownIconFor('https://unknown.example.test/')).toBeNull()
  expect(knownIconFor('not a url')).toBeNull()
})

it('matches a product path prefix without capturing the rest of the host', () => {
  expect(knownIconFor('https://www.google.com/maps')?.prefix).toBe('/maps')
  expect(knownIconFor('https://www.google.com/maps/dir/a/b')?.prefix).toBe('/maps')
  expect(knownIconFor('https://www.google.com/search?q=maps')).toBeNull()
  expect(knownIconFor('https://maps.google.com/')?.urls).toContain(MAPS_ICON)
  expect(iconCacheKey('https://www.google.com/maps/dir/a/b')).toBe('https://www.google.com/maps')
  expect(iconCacheKey('https://www.google.com/search?q=maps')).toBe('https://www.google.com')
  expect(iconCacheKey('https://maps.google.com/')).toBe('https://maps.google.com')
})

it('allows cross-origin requests only for URLs listed in the matching entry', () => {
  expect(isAllowedIconUrl('https://www.google.com/maps', MAPS_ICON)).toBe(true)
  expect(isAllowedIconUrl('https://www.google.com/search', MAPS_ICON)).toBe(false)
  expect(isAllowedIconUrl('https://www.google.com/maps', 'https://www.gstatic.com/other/logo.png')).toBe(false)
  expect(isAllowedIconUrl('https://chatgpt.com', 'https://chatgpt.com/unauth-mweb/images/favicon.svg')).toBe(true)
  expect(isAllowedIconUrl('https://example.com', 'https://example.com/favicon.ico')).toBe(true)
  expect(isAllowedIconUrl('https://example.com', 'https://evil.example/favicon.ico')).toBe(false)
})

it('loads the known table for every bundled host', () => {
  expect(KNOWN_ICONS.flatMap(entry => entry.hosts).filter(host => !isKnownHost(host))).toEqual([])
})

it('bundles brand marks and marks wordmark sites as brand-preferred', () => {
  expect(knownBrand('youtube')).toMatchObject({ slug: 'youtube', hex: 'FF0000' })
  expect(knownBrand('googlegemini')?.title).toBe('Google Gemini')
  expect(knownBrand('missing')).toBeNull()
  expect(knownIconFor('https://dify.ai/apps')).toMatchObject({ preferBrand: true, brand: 'dify' })
})
