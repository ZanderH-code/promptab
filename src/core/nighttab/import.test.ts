import { describe, expect, it } from 'vitest'
import { migrateV1 } from '../migrate/v1'
import { defaults } from '../model'
import { parseNightTabBackup } from './import'

const fixture = JSON.stringify({
  nightTab: true,
  version: '7.2.0',
  bookmark: [{ name: { text: 'Work', show: true }, collapse: true, toolbar: {}, items: [
    { url: 'https://docs.example', display: { name: { text: 'Docs' }, visual: { type: 'letter', letter: { text: 'D' } } }, color: { by: 'custom', rgb: { r: 18, g: 52, b: 86 } }, accent: { by: 'theme', rgb: { r: 170, g: 187, b: 204 } } },
    { url: 'javascript:alert(1)', display: { name: { text: 'Unsafe' }, visual: { type: 'letter', letter: { text: '!' } } } },
  ] }],
  state: { theme: { accent: { by: 'custom', rgb: { r: 170, g: 187, b: 204 } }, style: 'light', radius: 10, font: { display: { name: 'Oswald' }, ui: { name: 'System' } }, background: { type: 'gradient', gradient: { angle: 80, start: { rgb: { r: 16, g: 16, b: 16 } }, end: { rgb: { r: 48, g: 48, b: 48 } } } } } },
  extensionField: true,
})

async function profile() {
  return migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'profile', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('unused')) })
}

describe('nightTab backup importer', () => {
  it('maps groups, safe links, theme fields and warns about unknown fields', async () => {
    const result = parseNightTabBackup(fixture, await profile())
    expect(result.count).toBe(1)
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Work', collapsed: true, items: [{ name: 'Docs', url: 'https://docs.example', color: '#123456', icon: 'D', iconMode: 'text' }] })
    expect(result.profile.theme).toMatchObject({ mode: 'light', color: { accent: '#aabbcc' }, radius: 10, font: { display: 'barlow-condensed', ui: 'system' } })
    expect(result.profile.background).toMatchObject({ type: 'gradient', gradient: { angle: 80, stops: ['#101010', '#303030'] } })
    expect(result.warnings).toContain('Ignored unrecognized field: extensionField')
  })

  it('warns without throwing for unrecognized structures', async () => {
    const result = parseNightTabBackup(JSON.stringify({ exportVersion: 1, mystery: true }), await profile())
    expect(result.count).toBe(0)
    expect(result.warnings).toContain('No bookmark groups were found')
    expect(result.warnings).toContain('Ignored unrecognized field: exportVersion')
  })

  it('maps an unmarked bookmark array cautiously and warns about the missing marker', async () => {
    const result = parseNightTabBackup(JSON.stringify({ bookmark: [{ name: { text: 'Personal', show: true }, collapse: false, toolbar: {}, items: [{ url: 'https://example.org', display: { name: { text: 'Example' }, visual: { type: 'icon', icon: { name: 'globe' } } }, color: { by: 'theme' } }] }] }), await profile())
    expect(result.count).toBe(1)
    expect(result.profile.bookmarks.groups.at(-1)).toMatchObject({ name: 'Personal', items: [{ name: 'Example', iconMode: 'lucide', iconName: 'globe' }] })
    expect(result.warnings).toContain('Backup is missing the nightTab format marker; imported recognized fields only')
  })
})
