import { describe, expect, it } from 'vitest'
import { defaults } from '../model'
import { migrateV1 } from '../migrate/v1'
import { createThemeLibrary, MAX_SAVED_THEMES } from './library'

function memoryBackend() {
  const values = new Map<string, string>()
  return {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => { values.set(key, value) },
  }
}

async function profile() {
  return migrateV1(defaults, { id: () => 'profile', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unexpected') } })
}

describe('theme library', () => {
  it('saves portable themes, renames them, and removes them', async () => {
    const library = createThemeLibrary(memoryBackend(), { id: () => 'saved-1', now: () => '2026-01-01T00:00:00Z' })
    const saved = await library.save(await profile(), '  Warm Study  ')
    expect(saved.name).toBe('Warm Study')
    expect(saved.pack).not.toHaveProperty('bookmarks')
    await library.rename(saved.id, 'Cool Desk')
    expect((await library.read())[0]).toMatchObject({ name: 'Cool Desk', pack: { meta: { name: 'Cool Desk' } } })
    await library.remove(saved.id)
    expect(await library.read()).toEqual([])
  })

  it('enforces the library limit of fifty themes', async () => {
    const library = createThemeLibrary(memoryBackend(), { id: (() => { let id = 0; return () => `saved-${++id}` })() })
    const current = await profile()
    for (let index = 0; index < MAX_SAVED_THEMES; index++) await library.save(current, `Theme ${index + 1}`)
    await expect(library.save(current, 'Over limit')).rejects.toThrow('Theme library is full')
    expect(await library.read()).toHaveLength(MAX_SAVED_THEMES)
  })
})
