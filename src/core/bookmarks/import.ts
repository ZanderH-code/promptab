import type { ProfileV2 } from '../schema/profile'
import type { Shortcut } from '../model'
import { cleanSiteTitle, domainSiteName, knownSiteName } from '../siteName'

export type BookmarkNode = { id: string; title?: string; url?: string; children?: BookmarkNode[] }
export type BookmarkFolder = { id: string; path: string; count: number }
type ImportedGroup = { name: string; items: Shortcut[] }

const httpUrl = (value: string | undefined) => {
  if (!value) return false
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

function descendants(node: BookmarkNode): BookmarkNode[] {
  return node.children?.flatMap(child => child.url ? [child] : descendants(child)) ?? []
}

function walk(nodes: BookmarkNode[], parentPath: string, folders: BookmarkFolder[], byId: Map<string, { path: string; node: BookmarkNode }>) {
  for (const node of nodes) {
    if (!node.children) continue
    const title = node.title?.trim()
    const path = title ? (parentPath ? `${parentPath} / ${title}` : title) : parentPath
    const links = descendants(node).filter(child => httpUrl(child.url))
    byId.set(node.id, { path: path || 'Bookmarks', node })
    if (links.length && path) folders.push({ id: node.id, path, count: links.length })
    walk(node.children, path, folders, byId)
  }
}

export function collectBookmarkFolders(tree: BookmarkNode[]): BookmarkFolder[] {
  const folders: BookmarkFolder[] = []
  walk(tree, '', folders, new Map())
  return folders
}

export function importBookmarkFolders(tree: BookmarkNode[], selectedIds: string[], existingUrls: Set<string> = new Set()): ImportedGroup[] {
  const byId = new Map<string, { path: string; node: BookmarkNode }>()
  walk(tree, '', [], byId)
  const used = new Set(existingUrls)
  return selectedIds.flatMap(id => {
    const folder = byId.get(id)
    if (!folder) return []
    const items = descendants(folder.node).filter(node => httpUrl(node.url) && !used.has(node.url!)).map(node => {
      used.add(node.url!)
      const url = node.url!
      const rawTitle = node.title?.trim() ?? ''
      const host = new URL(url).hostname
      const bareHost = host.replace(/^www\./, '')
      const titleIsHost = !rawTitle || rawTitle.toLowerCase() === host.toLowerCase() || rawTitle.toLowerCase() === bareHost.toLowerCase()
      const name = titleIsHost
        ? knownSiteName(url) || domainSiteName(url) || host
        : cleanSiteTitle(rawTitle, url) || rawTitle || domainSiteName(url) || host
      return { id: `bookmark-${crypto.randomUUID()}`, name, url, color: '#90d5cd', icon: name.slice(0, 1).toUpperCase(), iconMode: 'auto' as const }
    })
    return items.length ? [{ name: folder.path, items }] : []
  })
}

export function appendImportedBookmarkGroups(profile: ProfileV2, groups: ImportedGroup[]): ProfileV2 {
  const next = structuredClone(profile)
  next.bookmarks.groups.push(...groups.map(group => ({ id: `group-${crypto.randomUUID()}`, name: group.name, collapsed: false, items: group.items })))
  next.meta.updatedAt = new Date().toISOString()
  return next
}

export type { ImportedGroup }
