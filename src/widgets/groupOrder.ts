/** Swaps a group with its neighbour by one position. Moves past either end return the list unchanged. */
export function reorderGroup<G extends { id: string }>(groups: G[], id: string, delta: -1 | 1): G[] {
  const index = groups.findIndex(group => group.id === id)
  const next = index + delta
  if (index < 0 || next < 0 || next >= groups.length) return groups
  const reordered = [...groups]
  const [group] = reordered.splice(index, 1)
  reordered.splice(next, 0, group)
  return reordered
}

/** Returns a sorted copy of the items, ordered by their displayed name in the given locale. */
export function sortItemsByName<T>(items: T[], nameOf: (item: T) => string, locale: string): T[] {
  return [...items].sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))
}
