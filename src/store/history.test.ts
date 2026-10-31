import { describe, expect, it } from 'vitest'
import { createHistory, recordChange, setSnapshotPin, restoreSnapshot } from './history'

const profile = (id: string, value: number) => ({ meta: { id }, value, nested: { value } })
const options = (time: number, id: string) => ({ now: () => time, createId: () => id })

describe('profile history', () => {
  it('coalesces edits within a rolling 30 seconds and keeps the first prechange state', () => {
    let history = createHistory<ReturnType<typeof profile>>()
    history = recordChange(history, profile('a', 0), 'edit', options(0, 'one'))
    history = recordChange(history, profile('a', 1), 'edit', options(29_000, 'two'))
    history = recordChange(history, profile('a', 2), 'edit', options(58_000, 'three'))
    expect(history.profiles.a.snapshots.map(s => [s.id, s.profile.value, s.createdAt])).toEqual([['one', 0, 0]])
    history = recordChange(history, profile('a', 3), 'edit', options(88_000, 'four'))
    expect(history.profiles.a.snapshots.map(s => s.profile.value)).toEqual([3, 0])
  })

  it('keeps separate windows and retains 30 unpinned snapshots per profile plus pins', () => {
    let history = createHistory<ReturnType<typeof profile>>()
    history = recordChange(history, profile('a', -1), 'reset', options(0, 'pinned'))
    history = setSnapshotPin(history, 'a', 'pinned', true)
    for (let i = 0; i < 32; i++) history = recordChange(history, profile('a', i), 'import', options(i + 1, `a${i}`))
    history = recordChange(history, profile('b', 100), 'edit', options(33, 'b'))
    expect(history.profiles.a.snapshots).toHaveLength(31)
    expect(history.profiles.a.snapshots.map(s => s.id)).toContain('pinned')
    expect(history.profiles.a.snapshots.map(s => s.id)).not.toContain('a0')
    expect(history.profiles.a.snapshots.map(s => s.id)).not.toContain('a1')
    expect(history.profiles.b.snapshots[0].profile.value).toBe(100)
    history = setSnapshotPin(history, 'a', 'pinned', false)
    expect(history.profiles.a.snapshots).toHaveLength(30)
    expect(history.profiles.a.snapshots.map(s => s.id)).not.toContain('pinned')
  })

  it('forces snapshots for major actions and starts a new edit window', () => {
    let history = createHistory<ReturnType<typeof profile>>()
    for (const [i, action] of (['edit', 'reset', 'import', 'theme', 'preset', 'edit'] as const).entries()) {
      history = recordChange(history, profile('a', i), action, options(i, `id${i}`))
    }
    expect(history.profiles.a.snapshots.map(s => s.profile.value)).toEqual([5, 4, 3, 2, 1, 0])
  })

  it('restores a snapshot after recording the current state, without sharing mutable data', () => {
    const original = profile('a', 1)
    let history = recordChange(createHistory<typeof original>(), original, 'edit', options(0, 'old'))
    original.nested.value = 99
    const current = profile('a', 2)
    const result = restoreSnapshot(history, current, 'old', options(1, 'before-restore'))
    history = result.history
    expect(result.profile.nested.value).toBe(1)
    expect(history.profiles.a.snapshots.map(s => [s.id, s.profile.value])).toEqual([['before-restore', 2], ['old', 1]])
    result.profile.nested.value = 42
    current.nested.value = 42
    expect(history.profiles.a.snapshots.map(s => s.profile.nested.value)).toEqual([2, 1])
    expect(() => restoreSnapshot(history, profile('b', 3), 'old', options(2, 'x'))).toThrow()
  })
})
