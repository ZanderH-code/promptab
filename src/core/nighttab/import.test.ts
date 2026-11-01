import { describe, expect, it } from 'vitest'
import { migrateV1 } from '../migrate/v1'
import { defaults } from '../model'
import { parseNightTabBackup } from './import'

const fixture = JSON.stringify({
  groups: [{ name: 'Work', bookmarks: [
    { name: 'Docs', url: 'https://docs.example', color: '#123456', letter: 'D' },
    { name: 'Unsafe', url: 'javascript:alert(1)', letter: '!' },
  ] }],
  theme: { accent: '#aabbcc', background: { type: 'gradient', angle: 80, stops: ['#101010', '#303030'] }, radius: 10, font: 'Oswald' },
  extensionField: true,
})

async function profile() {
  return migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'profile', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
}

describe('nightTab backup importer', () => {
  it('maps groups, safe links, theme fields and warns about unknown fields', async () => {
    const result = parseNightTabBackup(fixture, await profile())
    expect(result.count).toBe(1)
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Work', items: [{ name: 'Docs', url: 'https://docs.example', color: '#123456', icon: 'D', iconMode: 'text' }] })
    expect(result.profile.theme).toMatchObject({ color: { accent: '#aabbcc' }, radius: 10, font: { display: 'barlow-condensed' } })
    expect(result.profile.background).toMatchObject({ type: 'gradient', gradient: { angle: 80, stops: ['#101010', '#303030'] } })
    expect(result.warnings).toContain('Ignored unrecognized field: extensionField')
  })

  it('warns without throwing for unrecognized structures', async () => {
    const result = parseNightTabBackup(JSON.stringify({ exportVersion: 1, mystery: true }), await profile())
    expect(result.count).toBe(0)
    expect(result.warnings).toContain('No bookmark groups were found')
    expect(result.warnings).toContain('Ignored unrecognized field: exportVersion')
  })
})
