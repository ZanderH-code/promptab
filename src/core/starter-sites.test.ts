import { expect, it } from 'vitest'
import { migrateV1 } from './migrate/v1'
import { defaults } from './model'
import { countUnchangedStarterSites, isUnchangedStarterSite, removeUnchangedStarterSites, STARTER_SITES } from './starter-sites'

it('recognizes unchanged starters from the earlier bundled icon set', () => {
  const amazon = { ...STARTER_SITES[5], iconMode: 'lucide' as const, iconName: 'shopping-bag' }
  const outlook = { ...STARTER_SITES[7], iconMode: 'lucide' as const, iconName: 'mail' }
  expect(isUnchangedStarterSite(amazon)).toBe(true)
  expect(isUnchangedStarterSite(outlook)).toBe(true)
  expect(isUnchangedStarterSite({ ...amazon, name: 'My Amazon' })).toBe(false)
})

it('lets new profiles auto-detect Amazon, ChatGPT and Outlook icons', () => {
  expect(STARTER_SITES.filter(site => ['starter-amazon', 'starter-chatgpt', 'starter-outlook'].includes(site.id))).toMatchObject([
    { icon: 'A', color: '#ff9900', iconMode: 'auto' },
    { icon: '✦', color: '#10a37f', iconMode: 'auto' },
    { icon: 'O', color: '#0078d4', iconMode: 'auto' },
  ])
})

it('still treats a stored copy of the earlier text-mode starters as unchanged', () => {
  for (const id of ['starter-amazon', 'starter-chatgpt', 'starter-outlook']) {
    const current = STARTER_SITES.find(site => site.id === id)!
    expect(isUnchangedStarterSite(current)).toBe(true)
    expect(isUnchangedStarterSite({ ...current, iconMode: 'text' })).toBe(true)
    expect(isUnchangedStarterSite({ ...current, iconMode: 'text', name: 'Mine' })).toBe(false)
    expect(isUnchangedStarterSite({ ...current, iconMode: 'auto', url: 'https://example.com' })).toBe(false)
  }
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
