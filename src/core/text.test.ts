import { describe, expect, it } from 'vitest'
import { finishShortcut } from './shortcut'
import { importBookmarkFolders } from './bookmarks/import'
import { clipText, firstChar } from './text'

const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/

describe('letter icons keep whole characters', () => {
  it('takes the first code point and clips without splitting a pair', () => {
    expect(firstChar('  🎵 Music')).toBe('🎵')
    expect(firstChar('码')).toBe('码')
    expect(firstChar('   ')).toBe('')
    expect(clipText('1234567🎵', 8)).toBe('1234567')
    expect(clipText('🎵🎵🎵🎵', 8)).toBe('🎵🎵🎵🎵')
    expect(clipText('abc', 8)).toBe('abc')
  })

  it('derives emoji letter icons for shortcuts and imported bookmarks', () => {
    expect(finishShortcut({ id: '1', name: '🎵 Music', url: 'music.example', color: '#ffffff', icon: '' })?.icon).toBe('🎵')
    const [group] = importBookmarkFolders([{ id: 'f', title: 'F', children: [{ id: 'm', title: '🎵 Music', url: 'https://music.example' }] }], ['f'])
    expect(group.items[0].icon).toBe('🎵')
    expect(lone.test(group.items[0].icon)).toBe(false)
  })
})
