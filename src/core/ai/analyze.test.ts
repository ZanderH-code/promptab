import { describe, expect, it, vi } from 'vitest'
import * as sanitize from '../css/sanitize'
import { parseProfileV2 } from '../schema/profile'
import { analyzeCandidate } from './analyze'

vi.mock('../css/sanitize', async importOriginal => {
  const actual = await importOriginal<typeof sanitize>()
  return { ...actual, sanitizeCss: vi.fn(actual.sanitizeCss) }
})

describe('analyzeCandidate', () => {
  it('sanitizes the pack CSS once per analysis', async () => {
    const { defaults } = await import('../model')
    const { migrateV1 } = await import('../migrate/v1')
    const profile = parseProfileV2(await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'p', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) }))
    const analysis = analyzeCandidate({ lang: 'css', code: '.mnt-clock { color: red !important }' }, profile)
    expect(analysis.problems).toEqual([])
    expect(analysis.warnings.some(warning => warning.kind === 'css-important')).toBe(true)
    expect(sanitize.sanitizeCss).toHaveBeenCalledTimes(1)
  })
})
