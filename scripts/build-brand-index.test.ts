import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as simpleIcons from 'simple-icons'
import { describe, expect, it } from 'vitest'
import { brandSlugFor } from '../src/core/brandDomains'
import { COMMON_SITES } from '../e2e/fixtures/common-sites'
import { buildBrandIndex } from './build-brand-index.mjs'

const overrides = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/core/brandDomains.json'), 'utf8'))
const generic = buildBrandIndex(simpleIcons, { suffixes: overrides.suffixes })
const full = buildBrandIndex(simpleIcons, overrides)
const expectSlugSites = COMMON_SITES.filter(site => site.expectSlug)

describe('generic rules', () => {
  it('maps a source host whose label is the slug', () => {
    expect(generic.hosts['bilibili.com']).toBe('bilibili')
    expect(generic.hosts['spotify.com']).toBe('spotify')
    expect(generic.hosts['notion.so']).toBe('notion')
  })

  it('maps a product subdomain exactly, not its parent domain', () => {
    expect(generic.hosts['ads.google.com']).toBe('googleads')
    expect(generic.hosts['google.com']).toBeUndefined()
    expect(generic.hosts['apple.com']).toBe('apple')
  })

  it('drops a subdomain claimed by several unrelated products', () => {
    expect(generic.hosts['developers.google.com']).toBeUndefined()
  })

  it('ignores repositories, design files, wikis and CDNs', () => {
    for (const host of ['github.com', 'github.io', 'figma.com', 'wikipedia.org', 'wikimedia.org', 'gstatic.com']) {
      expect(generic.hosts[host]).toBeUndefined()
    }
    expect(Object.keys(generic.hosts).some(host => host.endsWith('.github.io'))).toBe(false)
    expect(Object.keys(generic.hosts).some(host => host.endsWith('.googleusercontent.com'))).toBe(false)
  })

  it('does not let a sibling product claim a shared parent domain', () => {
    // simple-icons sources for Google AdSense / Facebook Gaming point at the parent domain.
    expect(generic.hosts['google.com']).toBeUndefined()
    expect(generic.hosts['facebook.com']).toBeUndefined()
    expect(generic.hosts['stackoverflow.com']).toBeUndefined()
  })

  it('never emits a bare public suffix', () => {
    for (const suffix of overrides.suffixes) expect(generic.hosts[suffix]).toBeUndefined()
    expect(generic.hosts.com).toBeUndefined()
  })
})

describe('curated overrides', () => {
  it('resolves product subdomains and aliases', () => {
    const cases: Array<[string, string]> = [
      ['https://mail.google.com/mail/u/0/', 'gmail'],
      ['https://music.163.com', 'neteasecloudmusic'],
      ['https://weixin.qq.com', 'wechat'],
      ['https://x.com', 'x'],
      ['https://twitter.com/home', 'x'],
      ['https://youtu.be/abc', 'youtube'],
      ['https://b23.tv/abc', 'bilibili'],
      ['https://www.google.com/maps', 'googlemaps'],
      ['https://www.apple.com/app-store/', 'appstore'],
    ]
    for (const [url, slug] of cases) expect(brandSlugFor(full, url)).toBe(slug)
  })

  it('keeps qq.com and weixin.qq.com distinct', () => {
    expect(brandSlugFor(full, 'https://im.qq.com')).toBe('qq')
    expect(brandSlugFor(full, 'https://weixin.qq.com')).toBe('wechat')
    expect(brandSlugFor(full, 'https://qq.com')).toBe('qq')
  })

  it('falls back to google for unknown Google product subdomains', () => {
    expect(brandSlugFor(full, 'https://keep.google.com')).toBe('google')
    expect(brandSlugFor(full, 'https://www.google.com/search?q=1')).toBe('google')
  })
})

describe('false positives', () => {
  it('does not resolve GitHub Pages user sites', () => {
    expect(brandSlugFor(full, 'https://alice.github.io/project')).toBeNull()
    expect(brandSlugFor(full, 'https://alice.github.io')).toBeNull()
  })

  it('does not resolve sites whose brand simple-icons does not ship', () => {
    for (const site of COMMON_SITES.filter(entry => !entry.expectSlug)) {
      expect(brandSlugFor(full, site.url), site.name).toBeNull()
    }
  })
})

describe('fixture coverage', () => {
  it('resolves every expectSlug from the fixture', () => {
    for (const site of expectSlugSites) {
      expect(brandSlugFor(full, site.url), `${site.name} (${site.url})`).toBe(site.expectSlug)
    }
  })

  it('covers the generic rules alone for the majority of the fixture', () => {
    const matched = expectSlugSites.filter(site => brandSlugFor(generic, site.url) === site.expectSlug).length
    expect(matched).toBeGreaterThanOrEqual(50)
  })

  it('keeps the emitted index under 150 KB', () => {
    const bytes = Buffer.byteLength(JSON.stringify(full))
    expect(bytes).toBeLessThan(150 * 1024)
  })
})
