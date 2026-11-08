import { describe, expect, it } from 'vitest'
import { brandSlugFor, type BrandIndex } from './brandDomains'

const index = (hosts: Record<string, string>, paths?: Record<string, string>, extra: Partial<BrandIndex> = {}): BrandIndex => ({ version: 1, hosts, paths, ...extra })

describe('registrable domain handling', () => {
  it('walks parents only down to the registrable domain', () => {
    expect(brandSlugFor(index({ 'example.co.uk': 'example' }, undefined, { suffixes: ['co.uk'] }), 'https://a.b.example.co.uk/')).toBe('example')
    expect(brandSlugFor(index({ 'example.com.cn': 'example' }, undefined, { suffixes: ['com.cn'] }), 'https://example.com.cn/')).toBe('example')
    expect(brandSlugFor(index({ '163.com': 'netease' }), 'https://music.163.com/')).toBe('netease')
    expect(brandSlugFor(index({ 'localhost': 'local' }), 'https://localhost:3000/')).toBe('local')
  })

  it('never looks above the registrable domain', () => {
    expect(brandSlugFor(index({ 'co.uk': 'wrong' }, undefined, { suffixes: ['co.uk'] }), 'https://a.b.example.co.uk/')).toBeNull()
  })
})

describe('brandSlugFor', () => {
  it('prefers the exact host, then parents', () => {
    const data = index({ 'google.com': 'google', 'mail.google.com': 'gmail' })
    expect(brandSlugFor(data, 'https://mail.google.com/mail/u/0/')).toBe('gmail')
    expect(brandSlugFor(data, 'https://calendar.google.com/')).toBe('google')
    expect(brandSlugFor(data, 'https://google.com/search?q=1')).toBe('google')
  })

  it('does not walk past the registrable domain', () => {
    expect(brandSlugFor(index({ 'example.com': 'example' }), 'https://notexample.com/')).toBeNull()
  })

  it('uses host+path rules before host rules', () => {
    const paths = { 'www.google.com/maps': 'googlemaps', 'www.apple.com/app-store': 'appstore' }
    const data = index({ 'google.com': 'google', 'apple.com': 'apple' }, paths)
    expect(brandSlugFor(data, 'https://www.google.com/maps')).toBe('googlemaps')
    expect(brandSlugFor(data, 'https://www.google.com/maps/dir/a/b')).toBe('googlemaps')
    expect(brandSlugFor(data, 'https://www.google.com/search?q=maps')).toBe('google')
    expect(brandSlugFor(data, 'https://www.apple.com/app-store/')).toBe('appstore')
    expect(brandSlugFor(data, 'https://www.apple.com/')).toBe('apple')
  })

  it('returns null for invalid input', () => {
    expect(brandSlugFor(index({}), 'not a url')).toBeNull()
  })
})
