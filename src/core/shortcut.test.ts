import { describe, expect, it } from 'vitest'
import { finishShortcut } from './shortcut'

const draft = { id: '1', name: ' github ', url: 'github.com', color: '#ffffff', icon: '' }

describe('finishShortcut', () => {
  it('normalizes the URL and derives a text icon from the name', () => {
    expect(finishShortcut(draft)).toEqual({ ...draft, url: 'https://github.com/', icon: 'G' })
  })

  it('keeps an icon the user typed', () => {
    expect(finishShortcut({ ...draft, icon: ' 码 ' })?.icon).toBe('码')
  })

  it('rejects a blank name or an invalid URL', () => {
    expect(finishShortcut({ ...draft, name: '  ' })).toBeNull()
    expect(finishShortcut({ ...draft, url: 'javascript:alert(1)' })).toBeNull()
  })
})
