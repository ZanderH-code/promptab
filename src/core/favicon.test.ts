import { describe, it, expect, vi } from 'vitest'
import { normalizeUrl, initialFaviconSources, browserFaviconUrl, ICON_CACHE_KEY, readIconCache, writeIconCache } from './favicon'
describe('website icons', () => {
 it('normalizes domains while preserving full paths', () => { expect(normalizeUrl(' example.com/a ')).toBe('https://example.com/a'); expect(normalizeUrl('http://localhost:3000/a')).toBe('http://localhost:3000/a') })
 it('rejects non-web schemes', () => { expect(normalizeUrl('javascript:alert(1)')).toBeNull() })
 it('uses the website origin for its icon fallback', () => {
  expect(initialFaviconSources('https://example.com/path?q=1', undefined, true)).toEqual(['https://example.com/favicon.ico'])
  expect(initialFaviconSources('https://icons.example.test', undefined, true)).toEqual(['https://icons.example.test/favicon.ico'])
  expect(initialFaviconSources('bad url', undefined, true)).toEqual([])
 })
 it('supports Chromium’s 128 and 64 pixel favicon requests and skips Firefox’s private endpoint', () => {
  const api = { runtime: { getURL: (path: string) => `chrome-extension://test${path}` } }
  expect(browserFaviconUrl('https://example.com/path', api, false, 128)).toBe('chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=128')
  expect(browserFaviconUrl('https://example.com/path', api, false, 64)).toBe('chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=64')
  expect(browserFaviconUrl('https://example.com/path', api, true)).toBeNull()
 })
})

describe('icon cache memory', () => {
 it('keeps its own writes in memory and still picks up writes from other tabs', () => {
  const entry = { url: 'https://a.test/favicon.ico', savedAt: 1, expiresAt: 2 }
  writeIconCache({ 'https://a.test': entry })
  const parse = vi.spyOn(JSON, 'parse')
  try {
   expect(readIconCache()['https://a.test']).toEqual(entry)
   expect(readIconCache()['https://a.test']).toEqual(entry)
   expect(parse).not.toHaveBeenCalled()
   localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({ 'https://b.test': entry }))
   expect(Object.keys(readIconCache())).toEqual(['https://b.test'])
   expect(parse).toHaveBeenCalledTimes(1)
  } finally { parse.mockRestore(); localStorage.removeItem(ICON_CACHE_KEY) }
 })
})
