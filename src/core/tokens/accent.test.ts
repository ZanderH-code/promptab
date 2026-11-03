import { describe, expect, it } from 'vitest'
import { accentPalette } from './accent'
import { contrastRatio } from './oklch'
import { themeColorsFor } from './derive'
import { defaults } from '../model'
import { migrateV1 } from '../migrate/v1'

describe('accent palette', () => {
  it('derives readable accents for every preset and both modes', async () => {
    const profile = await migrateV1(defaults, { id: () => 'test', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
    for (const mode of ['dark', 'light'] as const) {
      const colors = themeColorsFor(profile.theme, mode)
      for (const accent of accentPalette(profile.theme, mode)) {
        expect(contrastRatio(accent, colors.bg)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(accent, colors.surface)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
