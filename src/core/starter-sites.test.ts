import { expect, it } from 'vitest'
import { migrateV1 } from './migrate/v1'
import { defaults } from './model'
import { countUnchangedStarterSites, isUnchangedStarterSite, removeUnchangedStarterSites, upgradeStarterSites } from './starter-migration'
import { STARTER_SITES } from './starter-sites'

it('recognizes unchanged starters from earlier bundled icon sets', () => {
  const amazon = { ...STARTER_SITES[5], iconMode: 'lucide' as const, iconName: 'shopping-bag' }
  const outlook = { ...STARTER_SITES[7], iconMode: 'lucide' as const, iconName: 'mail' }
  const legacyAmazon = { ...STARTER_SITES[5], iconMode: 'text' as const }
  expect(isUnchangedStarterSite(amazon)).toBe(true)
  expect(isUnchangedStarterSite(outlook)).toBe(true)
  expect(isUnchangedStarterSite(legacyAmazon)).toBe(true)
  expect(isUnchangedStarterSite({ ...amazon, name: 'My Amazon' })).toBe(false)
})

it('uses automatic lookup for Amazon, ChatGPT and Outlook', () => {
  expect(STARTER_SITES.filter(site => ['starter-amazon', 'starter-chatgpt', 'starter-outlook'].includes(site.id))).toMatchObject([
    { icon: 'A', iconMode: 'auto' }, { icon: '✦', iconMode: 'auto' }, { icon: 'O', iconMode: 'auto' },
  ])
})

it('upgrades only untouched starter shortcuts to the current shape', async () => {
  const profile = await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'p', now: () => '2026-01-01T00:00:00Z', add: async () => { throw new Error('unused') } })
  const legacyAmazon = { ...STARTER_SITES[5], iconMode: 'text' as const }
  const legacyChatgpt = { ...STARTER_SITES[6], iconMode: 'text' as const }
  const editedOutlook = { ...STARTER_SITES[7], iconMode: 'text' as const, name: 'Work mail' }
  const manual = { ...STARTER_SITES[4], iconMode: 'text' as const, name: 'Reddit reading' }
  profile.bookmarks.groups[0].items = [legacyAmazon, legacyChatgpt, editedOutlook, manual]
  const upgraded = upgradeStarterSites(profile)
  expect(upgraded.bookmarks.groups[0].items).toMatchObject([
    { id: 'starter-amazon', iconMode: 'auto' }, { id: 'starter-chatgpt', iconMode: 'auto' },
    { id: 'starter-outlook', iconMode: 'text', name: 'Work mail' }, { id: 'starter-reddit', iconMode: 'text', name: 'Reddit reading' },
  ])
  expect(upgradeStarterSites(upgraded)).toBe(upgraded)
})

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
