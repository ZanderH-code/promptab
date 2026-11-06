import type { ProfileV2 } from './schema/profile'
import type { Shortcut } from './model'
import { STARTER_SITES } from './starter-sites'

const byId = new Map(STARTER_SITES.map(site => [site.id, site]))
const legacyIcons: Record<string, Array<Pick<Shortcut, 'iconMode' | 'iconName'>>> = {
  'starter-amazon': [{ iconMode: 'text' }, { iconMode: 'lucide', iconName: 'shopping-bag' }],
  'starter-chatgpt': [{ iconMode: 'text' }],
  'starter-outlook': [{ iconMode: 'text' }, { iconMode: 'lucide', iconName: 'mail' }],
}

function sameShape(item: Shortcut, candidate: Shortcut) {
  const keys = Object.keys(candidate) as (keyof Shortcut)[]
  return Object.keys(item).length === keys.length && keys.every(key => JSON.stringify(item[key]) === JSON.stringify(candidate[key]))
}

export function isUnchangedStarterSite(item: Shortcut): boolean {
  const original = byId.get(item.id)
  if (!original) return false
  return [original, ...(legacyIcons[item.id] ?? []).map(legacy => ({ ...original, ...legacy }))].some(candidate => sameShape(item, candidate))
}

export function countUnchangedStarterSites(profile: ProfileV2): number {
  return profile.bookmarks.groups.reduce((total, group) => total + group.items.filter(isUnchangedStarterSite).length, 0)
}

export function removeUnchangedStarterSites(profile: ProfileV2): ProfileV2 {
  return {
    ...profile,
    bookmarks: {
      ...profile.bookmarks,
      groups: profile.bookmarks.groups.map(group => ({ ...group, items: group.items.filter(item => !isUnchangedStarterSite(item)) })),
    },
  }
}

/** Moves untouched starter shortcuts to the current shape; user-edited shortcuts are returned as-is. */
export function upgradeStarterSites(profile: ProfileV2): ProfileV2 {
  let changed = false
  const groups = profile.bookmarks.groups.map(group => {
    let groupChanged = false
    const items = group.items.map(item => {
      const original = byId.get(item.id)
      if (!original || !isUnchangedStarterSite(item) || sameShape(item, original)) return item
      groupChanged = true
      return structuredClone(original)
    })
    if (!groupChanged) return group
    changed = true
    return { ...group, items }
  })
  return changed ? { ...profile, bookmarks: { ...profile.bookmarks, groups } } : profile
}
