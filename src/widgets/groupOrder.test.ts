import { describe, expect, it } from 'vitest'
import { reorderGroup, sortItemsByName } from './groupOrder'

const groups = [
  { id: 'a', name: 'A', collapsed: false, items: [{ id: '1' }, { id: '2' }] },
  { id: 'b', name: 'B', collapsed: false, items: [{ id: '3' }] },
]

describe('reorderGroup', () => {
  it('swaps a group with its neighbour without mutating the input', () => {
    expect(reorderGroup(groups, 'a', 1).map(group => group.id)).toEqual(['b', 'a'])
    expect(reorderGroup(groups, 'b', -1).map(group => group.id)).toEqual(['b', 'a'])
    expect(groups.map(group => group.id)).toEqual(['a', 'b'])
  })
  it('ignores moves past either end and unknown ids', () => {
    expect(reorderGroup(groups, 'a', -1)).toBe(groups)
    expect(reorderGroup(groups, 'b', 1)).toBe(groups)
    expect(reorderGroup(groups, 'missing', 1)).toBe(groups)
  })
})

describe('sortItemsByName', () => {
  it('sorts a copy by the displayed name in the given locale', () => {
    const items = ['Zebra', 'apple', 'Banana'].map(name => ({ id: name.toLowerCase(), name }))
    expect(sortItemsByName(items, item => item.name, 'en').map(item => item.name)).toEqual(['apple', 'Banana', 'Zebra'])
    expect(items.map(item => item.name)).toEqual(['Zebra', 'apple', 'Banana'])
  })
})
