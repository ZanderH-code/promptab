import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Highlighted, SearchTermsContext } from './searchHighlight'

const marks = (query: string[], text: string) => {
  const { container } = render(<SearchTermsContext.Provider value={query}><p><Highlighted text={text} /></p></SearchTermsContext.Provider>)
  return Array.from(container.querySelectorAll('mark')).map(mark => mark.textContent)
}

describe('settings search highlight', () => {
  it('wraps every occurrence of every term, case-insensitively', () => {
    expect(marks(['blur'], 'Area blur')).toEqual(['blur'])
    expect(marks(['blur'], 'Blur and blur')).toEqual(['Blur', 'blur'])
    expect(marks(['blur', 'op'], 'Area blur and opacity')).toEqual(['blur', 'op'])
  })

  it('treats terms as text, not as markup or patterns', () => {
    expect(marks(['('], 'Area (blur)')).toEqual(['('])
    expect(marks(['<b>'], 'Area <b> blur')).toEqual(['<b>'])
    expect(marks([], 'Area blur')).toEqual([])
  })
})
