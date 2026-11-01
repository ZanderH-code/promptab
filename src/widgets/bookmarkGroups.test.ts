import { describe, expect, it } from 'vitest'
import { moveBookmarks } from './bookmarkGroups'

const groups = [
  { id: 'a', name: 'A', collapsed: false, items: [{ id: '1' }, { id: '2' }] },
  { id: 'b', name: 'B', collapsed: false, items: [{ id: '3' }] },
]

describe('moveBookmarks', () => {
  it('moves selected bookmarks across groups in their original order', () => {
    expect(moveBookmarks(groups, ['2', '1'], 'b', '3').map(g => g.items.map(i => i.id))).toEqual([[], ['1', '2', '3']])
    expect(groups[0].items.map(i => i.id)).toEqual(['1', '2'])
  })
  it('ignores missing destinations and preserves a selected drop target', () => {
    expect(moveBookmarks(groups, ['1'], 'missing')).toEqual(groups)
    expect(moveBookmarks(groups, ['1'], 'a', '1')).toEqual(groups)
  })
})
