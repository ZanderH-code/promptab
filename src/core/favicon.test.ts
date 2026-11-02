import { describe, it, expect } from 'vitest'
import { normalizeUrl, faviconUrl, faviconSources } from './favicon'
describe('website icons', () => {
 it('normalizes domains while preserving full paths', () => { expect(normalizeUrl(' example.com/a ')).toBe('https://example.com/a'); expect(normalizeUrl('http://localhost:3000/a')).toBe('http://localhost:3000/a') })
 it('rejects non-web schemes', () => { expect(normalizeUrl('javascript:alert(1)')).toBeNull() })
 it('uses the website origin for its icon', () => { expect(faviconUrl('https://example.com/path?q=1')).toBe('https://example.com/favicon.ico'); expect(faviconUrl('bad url')).toBeNull() })
 it('skips Chromium’s private favicon endpoint in Firefox', () => {
  const api = { runtime: { getURL: (path: string) => `moz-extension://test${path}` } }
  expect(faviconSources('https://example.com/path', api, true)).toEqual(['https://example.com/favicon.ico'])
  expect(faviconSources('https://example.com/path', api, false)).toEqual(['moz-extension://test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fpath&size=64', 'https://example.com/favicon.ico'])
 })
})
