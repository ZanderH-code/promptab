export function moveBookmarks<T extends { id: string }, G extends { id: string; items: T[] }>(groups: G[], ids: string[], destination: string, beforeId?: string): G[] {
  if (!groups.some(group => group.id === destination) || (beforeId && ids.includes(beforeId))) return groups
  const selected = new Set(ids)
  const items = groups.flatMap(group => group.items.filter(item => selected.has(item.id)))
  if (!items.length) return groups
  return groups.map(group => {
    const remaining = group.items.filter(item => !selected.has(item.id))
    if (group.id !== destination) return { ...group, items: remaining }
    const index = beforeId ? remaining.findIndex(item => item.id === beforeId) : -1
    remaining.splice(index < 0 ? remaining.length : index, 0, ...items)
    return { ...group, items: remaining }
  })
}
