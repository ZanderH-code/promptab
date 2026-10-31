import { describe, it, expect } from 'vitest'
import { normalizeUrl, faviconUrl } from './favicon'
describe('website icons', () => {
 it('normalizes domains while preserving full paths', () => { expect(normalizeUrl(' example.com/a ')).toBe('https://example.com/a'); expect(normalizeUrl('http://localhost:3000/a')).toBe('http://localhost:3000/a') })
 it('rejects non-web schemes', () => { expect(normalizeUrl('javascript:alert(1)')).toBeNull() })
 it('uses the website origin for its icon', () => { expect(faviconUrl('https://example.com/path?q=1')).toBe('https://example.com/favicon.ico'); expect(faviconUrl('bad url')).toBeNull() })
})
