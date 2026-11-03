import { expect, it } from 'vitest'
import { migrateV1 } from './migrate/v1'
import { defaults } from './model'
import { countUnchangedStarterSites, removeUnchangedStarterSites, STARTER_SITES } from './starter-sites'

it('removes only unchanged starter shortcuts, even when moved to another group', async () => {
  const profile = await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'p', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unused') } })
  const edited = { ...STARTER_SITES[0], name: 'My YouTube' }
  const userLink = { ...STARTER_SITES[1], id: 'my-link' }
  profile.bookmarks.groups[0].items = [edited, userLink, structuredClone(STARTER_SITES[2])]
  profile.bookmarks.groups.push({ id: 'moved', name: 'Moved', collapsed: false, items: [structuredClone(STARTER_SITES[3])] })
  expect(countUnchangedStarterSites(profile)).toBe(2)
  const result = removeUnchangedStarterSites(profile)
  expect(result.bookmarks.groups[0].items).toEqual([edited, userLink])
  expect(result.bookmarks.groups[1].items).toEqual([])
  expect(profile.bookmarks.groups[1].items).toHaveLength(1)
})
