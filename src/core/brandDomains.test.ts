import { describe, expect, it } from 'vitest'
import { brandSlugFor, hostChain, registrableDomain, type BrandIndex } from './brandDomains'

const index = (hosts: Record<string, string>, paths?: Record<string, string>): BrandIndex => ({ version: 1, hosts, paths })

describe('registrableDomain', () => {
  it('handles plain and multi-label suffixes', () => {
    expect(registrableDomain('www.bilibili.com')).toBe('bilibili.com')
    expect(registrableDomain('music.163.com')).toBe('163.com')
    expect(registrableDomain('a.b.example.co.uk')).toBe('example.co.uk')
    expect(registrableDomain('example.com.cn')).toBe('example.com.cn')
    expect(registrableDomain('localhost')).toBe('localhost')
  })
})

describe('hostChain', () => {
  it('walks parents and stops at the registrable domain', () => {
    expect(hostChain('a.b.example.co.uk')).toEqual(['a.b.example.co.uk', 'b.example.co.uk', 'example.co.uk'])
    expect(hostChain('mail.google.com')).toEqual(['mail.google.com', 'google.com'])
    expect(hostChain('google.com')).toEqual(['google.com'])
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
    expect(brandSlugFor(index({ 'co.uk': 'wrong' }), 'https://a.b.example.co.uk/')).toBeNull()
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
