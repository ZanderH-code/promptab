import { describe, expect, it } from 'vitest'
import { defaults, validate } from '../model'
import { migrateV1, projectV1 } from './v1'

const image = 'data:image/png;base64,aGVsbG8='
function dependencies() {
  const blobs = new Map<string, Blob>()
  let index = 0
  return {
    blobs,
    id: () => 'profile-id',
    now: () => '2026-01-01T00:00:00.000Z',
    add: async (blob: Blob) => { const ref = `mnt-asset:${(++index).toString(16).padStart(64, '0')}`; blobs.set(ref, blob); return ref },
    get: async (ref: string) => blobs.get(ref),
  }
}

describe('v1 migration', () => {
  it('round trips all legacy fields, including disabled widgets and layout options', async () => {
    const deps = dependencies()
    const settings = { ...defaults, language: 'en' as const, theme: 'light' as const, showClock: false, showDate: false, showSearch: false, hour12: true, columns: 9, alignment: 'left' as const, layout: 'split' as const, reverse: true, overlay: 68, shortcuts: [{ ...defaults.shortcuts[0], iconMode: 'text' as const }] }
    const profile = await migrateV1(settings, deps)
    expect(profile.meta).toMatchObject({ id: 'profile-id', createdAt: deps.now(), updatedAt: deps.now() })
    expect((await projectV1(profile, deps)).settings).toEqual(settings)
  })

  it.each([
    ['stacked', false, ['overview', 'bookmarks'], ['overview', 'bookmarks']],
    ['stacked', true, ['bookmarks', 'overview'], ['bookmarks', 'overview']],
    ['split', false, ['bookmarks overview'], ['overview', 'bookmarks']],
    ['split', true, ['overview bookmarks'], ['bookmarks', 'overview']],
  ] as const)('represents %s layout, reverse %s, at desktop and narrow sizes', async (layout, reverse, areas, narrow) => {
    const profile = await migrateV1({ ...defaults, layout, reverse }, dependencies())
    expect(profile.layout.areas).toEqual(areas)
    expect(profile.layout.breakpoints?.narrow?.areas).toEqual(narrow)
    expect(profile.widgets.filter(widget => ['clock', 'date', 'search'].includes(widget.id)).every(widget => widget.area === 'overview')).toBe(true)
    expect(profile.bookmarks.groups[0].name).toBe('常用')
  })

  it('uses legacy validation defaults for missing fields', async () => {
    const deps = dependencies()
    expect((await projectV1(await migrateV1({ language: 'en' }, deps), deps)).settings).toEqual(validate({ language: 'en' }))
  })

  it.each([null, [], { schemaVersion: 2 }, { schemaVersion: 0 }, { columns: 1 }, { shortcuts: 'broken' }])('rejects damaged or unknown input %j', async input => {
    await expect(migrateV1(input, dependencies())).rejects.toThrow()
  })

  it('migrates images and preserves both wallpaper sources with supplied blob taking precedence', async () => {
    const deps = dependencies()
    const settings = { ...defaults, wallpaper: image, shortcuts: [{ ...defaults.shortcuts[0], image }] }
    const supplied = new Blob(['separate'], { type: 'image/webp' })
    const profile = await migrateV1(settings, { ...deps, wallpaper: supplied })
    expect(profile.bookmarks.groups[0].items[0].image).toMatch(/^mnt-asset:[a-f0-9]{64}$/)
    expect(deps.blobs.get(profile.background.image!.asset)).toBe(supplied)
    const projected = await projectV1(profile, deps)
    expect(projected.settings).toEqual(settings)
    expect(projected.wallpaper).toBe(supplied)
  })

  it('rejects malformed inline data and missing assets', async () => {
    const deps = dependencies()
    await expect(migrateV1({ ...defaults, wallpaper: 'data:image/png;base64,%%%%' }, deps)).rejects.toThrow()
    const profile = await migrateV1({ ...defaults, shortcuts: [{ ...defaults.shortcuts[0], image }] }, deps)
    await expect(projectV1(profile, { get: async () => undefined })).rejects.toThrow()
  })
})
