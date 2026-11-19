import * as simpleIcons from 'simple-icons'
import { expect, it } from 'vitest'
import { isKnownHost } from './faviconQuality'
import { faviconCacheKey } from './favicon'
import { KNOWN_ICONS, knownIconFor } from './knownIcons'
import { buildBrandIndex } from '../../scripts/build-brand-index.mjs'
import overrides from './brandDomains.json'
import { brandSlugFor } from './brandDomains'

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
  expect(faviconCacheKey('https://www.google.com/maps/dir/a/b')).toBe('https://www.google.com/maps')
  expect(faviconCacheKey('https://www.google.com/search?q=maps')).toBe('https://www.google.com')
  expect(faviconCacheKey('https://maps.google.com/')).toBe('https://maps.google.com')
})

it('gives every product path in the known table its own favicon cache key', () => {
  for (const entry of KNOWN_ICONS.filter(known => known.prefix)) {
    for (const host of entry.hosts) {
      expect(faviconCacheKey(`https://${host}${entry.prefix}/page`)).toBe(`https://${host}${entry.prefix}`)
      expect(faviconCacheKey(`https://${host}/elsewhere`)).toBe(`https://${host}`)
    }
  }
})

it('loads the known table for every bundled host', () => {
  expect(KNOWN_ICONS.flatMap(entry => entry.hosts).filter(host => !isKnownHost(host))).toEqual([])
})

it('leaves brand marks to the precomputed index', () => {
  const index = buildBrandIndex(simpleIcons, overrides)
  expect(brandSlugFor(index, 'https://www.youtube.com')).toBe('youtube')
  expect(brandSlugFor(index, 'https://www.instagram.com')).toBe('instagram')
  expect(brandSlugFor(index, 'https://dify.ai/apps')).toBe('dify')
  // Every remaining entry exists for its icon URLs, not for a brand.
  expect(KNOWN_ICONS.every(entry => entry.urls.length > 0)).toBe(true)
})
