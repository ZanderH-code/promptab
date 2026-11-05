import { describe, it, expect } from 'vitest'
import { normalizeUrl, faviconUrl, browserFaviconUrl } from './favicon'
describe('website icons', () => {
 it('normalizes domains while preserving full paths', () => { expect(normalizeUrl(' example.com/a ')).toBe('https://example.com/a'); expect(normalizeUrl('http://localhost:3000/a')).toBe('http://localhost:3000/a') })
 it('rejects non-web schemes', () => { expect(normalizeUrl('javascript:alert(1)')).toBeNull() })
 it('uses the website origin for its icon', () => { expect(faviconUrl('https://example.com/path?q=1')).toBe('https://example.com/favicon.ico'); expect(faviconUrl('https://icons.example.test')).toBe('https://icons.example.test/favicon.ico'); expect(faviconUrl('bad url')).toBeNull() })
 it('supports Chromium’s 128 and 64 pixel favicon requests and skips Firefox’s private endpoint', () => {
  const api = { runtime: { getURL: (path: string) => `chrome-extension://test${path}` } }
  expect(browserFaviconUrl('https://example.com/path', api, false, 128)).toBe('chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=128')
  expect(browserFaviconUrl('https://example.com/path', api, false, 64)).toBe('chrome-extension://test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=64')
  expect(browserFaviconUrl('https://example.com/path', api, true)).toBeNull()
 })
})
