import { describe, expect, it } from 'vitest'
import { collectBookmarkFolders, importBookmarkFolders, type BookmarkNode } from './import'

const tree: BookmarkNode[] = [{ id: 'root', title: '', children: [
  { id: 'bar', title: 'Bookmarks bar', children: [
    { id: 'work', title: 'Work', children: [
      { id: 'docs', title: 'Docs', children: [
        { id: 'doc-1', title: 'Docs', url: 'https://docs.example.com' },
        { id: 'bad', title: 'Local', url: 'file:///tmp/nope' },
      ] },
      { id: 'mail', title: 'Mail', url: 'https://mail.example.com' },
    ] },
    { id: 'same', title: 'Same URL', url: 'https://docs.example.com' },
  ] },
] }]

describe('browser bookmark import', () => {
  it('lists nested folders with readable paths and link counts', () => {
    expect(collectBookmarkFolders(tree)).toEqual([
      { id: 'bar', path: 'Bookmarks bar', count: 3 },
      { id: 'work', path: 'Bookmarks bar / Work', count: 2 },
      { id: 'docs', path: 'Bookmarks bar / Work / Docs', count: 1 },
    ])
  })

  it('flattens selected folders, keeps HTTP(S), and deduplicates URLs', () => {
    const result = importBookmarkFolders(tree, ['work', 'bar'])
    expect(result.map(group => ({ name: group.name, urls: group.items.map(item => item.url) }))).toEqual([
      { name: 'Bookmarks bar / Work', urls: ['https://docs.example.com', 'https://mail.example.com'] },
    ])
  })

  it('names imports from the known table, cleaned titles and domain fallbacks', () => {
    const titled: BookmarkNode[] = [{ id: 'root', title: '', children: [{ id: 'folder', title: 'Reading', children: [
      { id: 'brokers', title: 'Home | Interactive Brokers', url: 'https://www.interactivebrokers.com/en/home.php' },
      { id: 'claude', title: '', url: 'https://claude.ai' },
      { id: 'host', title: 'docs.example.com', url: 'https://docs.example.com/guide' },
      { id: 'long', title: 'A very long descriptive title that exceeds the limit - Short', url: 'https://example.org' },
    ] }] }]
    const result = importBookmarkFolders(titled, ['folder'])
    expect(result[0].items.map(item => item.name)).toEqual(['Interactive Brokers', 'Claude', 'Example', 'Short'])
  })

  it('keeps short titled bookmarks verbatim', () => {
    const titled: BookmarkNode[] = [{ id: 'root', title: '', children: [{ id: 'folder', title: 'Reading', children: [
      { id: 'rust', title: 'Rust - The Book', url: 'https://doc.rust-lang.org/book/' },
      { id: 'pulls', title: 'Pull requests · rust-lang/rust', url: 'https://github.com/rust-lang/rust/pulls' },
      { id: 'plan', title: 'Q3 plan: budget', url: 'https://example.com/plan' },
    ] }] }]
    const result = importBookmarkFolders(titled, ['folder'])
    expect(result[0].items.map(item => item.name)).toEqual(['Rust - The Book', 'Pull requests · rust-lang/rust', 'Q3 plan: budget'])
  })
})
