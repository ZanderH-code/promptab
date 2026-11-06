import { describe, expect, it } from 'vitest'
import { cleanSiteTitle, domainSiteName, knownSiteName, suggestSiteName, tidyImportedTitle } from './siteName'

describe('knownSiteName', () => {
  it('matches bundled hosts and www variants', () => {
    expect(knownSiteName('https://chatgpt.com/')).toBe('ChatGPT')
    expect(knownSiteName('https://www.chatgpt.com/')).toBe('ChatGPT')
    expect(knownSiteName('https://gemini.google.com/app')).toBe('Gemini')
    expect(knownSiteName('https://claude.ai/new')).toBe('Claude')
    expect(knownSiteName('https://github.com/ZanderH-code')).toBe('GitHub')
    expect(knownSiteName('https://unknown.example.test/')).toBeNull()
    expect(knownSiteName('not a url')).toBeNull()
  })

  it('keeps Google Maps on its product path only', () => {
    expect(knownSiteName('https://www.google.com/maps')).toBe('Google Maps')
    expect(knownSiteName('https://www.google.com/maps/dir/a/b')).toBe('Google Maps')
    expect(knownSiteName('https://www.google.com/search?q=maps')).toBeNull()
    expect(knownSiteName('https://maps.google.com/')).toBe('Google Maps')
  })
})

describe('domainSiteName', () => {
  it('uses the registrable domain label', () => {
    expect(domainSiteName('https://claude.ai')).toBe('Claude')
    expect(domainSiteName('https://www.example.co.uk/path')).toBe('Example')
    expect(domainSiteName('https://sub.foo.com.cn/path')).toBe('Foo')
    expect(domainSiteName('https://www.example.com.au')).toBe('Example')
    expect(domainSiteName('https://m.example.com')).toBe('Example')
  })

  it('handles localhost, IPs and invalid input', () => {
    expect(domainSiteName('https://localhost:3000')).toBe('Localhost')
    expect(domainSiteName('http://192.168.1.5:8080/path')).toBe('192.168.1.5')
    expect(domainSiteName('not a url')).toBe('')
  })
})

describe('cleanSiteTitle', () => {
  it.each([
    ['Home | Interactive Brokers', 'https://www.interactivebrokers.com/', 'Interactive Brokers'],
    ['Gemini - chat to supercharge your ideas', 'https://gemini.google.com/', 'Gemini'],
    ['NotebookLM | Note Taking & Research Assistant Powered by AI', 'https://notebooklm.google.com/', 'NotebookLM'],
    // The known name is a prefix, so the first short segment is kept rather than the bare "v0".
    ['v0 by Vercel - Build Full-Stack Web Apps', 'https://v0.dev/', 'v0 by Vercel'],
    ["GitHub: Let's build from here", 'https://github.com/', 'GitHub'],
    ['My notes', 'https://example.com/', 'My notes'],
    ['', 'https://example.com/', ''],
    ['Home | Welcome', 'https://example.com/', 'Home | Welcome'],
    ['A very long descriptive title that exceeds the limit - Short', 'https://example.com/', 'Short'],
  ])('cleans %j', (title, url, expected) => {
    expect(cleanSiteTitle(title, url)).toBe(expected)
  })

  it('prefers the domain segment when the title has no known name', () => {
    expect(cleanSiteTitle('Welcome | Example Docs', 'https://example.com/')).toBe('Example Docs')
    expect(cleanSiteTitle('Docs | Example', 'https://example.com/')).toBe('Example')
  })
})

describe('tidyImportedTitle', () => {
  it('keeps short user-chosen titles that carry no site or generic segment', () => {
    expect(tidyImportedTitle('Rust - The Book', 'https://doc.rust-lang.org/book/')).toBe('Rust - The Book')
    expect(tidyImportedTitle('Pull requests · rust-lang/rust', 'https://github.com/rust-lang/rust/pulls')).toBe('Pull requests · rust-lang/rust')
    expect(tidyImportedTitle('Q3 plan: budget', 'https://example.com/plan')).toBe('Q3 plan: budget')
  })

  it('tidies titles that match the site, start with a generic segment, or are over-long', () => {
    expect(tidyImportedTitle('Home | Interactive Brokers', 'https://www.interactivebrokers.com/')).toBe('Interactive Brokers')
    expect(tidyImportedTitle('Gemini - chat to supercharge your ideas', 'https://gemini.google.com/')).toBe('Gemini')
    expect(tidyImportedTitle('NotebookLM | Note Taking & Research Assistant Powered by AI', 'https://notebooklm.google.com/')).toBe('NotebookLM')
    expect(tidyImportedTitle('Home | Foo', 'https://example.com/')).toBe('Foo')
    expect(tidyImportedTitle("The fastest way to organize your team's work and projects - Acme", 'https://example.com/')).toBe('Acme')
  })

  it('shortens an over-long slogan that cannot be split into segments', () => {
    const slogan = 'The all-in-one workspace for notes, tasks, wikis and databases'
    expect(tidyImportedTitle(slogan, 'https://example.com/')).toBe('The all-in-one workspace for notes,…')
  })
})

describe('suggestSiteName', () => {
  it('prefers known names, then cleaned titles, then the domain', () => {
    expect(suggestSiteName('https://claude.ai')).toBe('Claude')
    expect(suggestSiteName('https://github.com', 'Some unrelated title')).toBe('GitHub')
    expect(suggestSiteName('https://example.com', 'Welcome | Example Docs')).toBe('Example Docs')
    expect(suggestSiteName('https://example.com')).toBe('Example')
  })

  it('leaves partial or invalid URLs alone', () => {
    expect(suggestSiteName('https://')).toBe('')
    expect(suggestSiteName('https://claude')).toBe('')
    expect(suggestSiteName('not a url')).toBe('')
  })
})
