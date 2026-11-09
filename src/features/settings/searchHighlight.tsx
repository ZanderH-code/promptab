import { createContext, useContext } from 'react'

/** Lower-cased search terms; an empty list leaves text unchanged. */
export const SearchTermsContext = createContext<readonly string[]>([])

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Wraps every occurrence of a query term in a `<mark>`. The text is split into strings and matches,
 * so the mark nodes are built from text nodes — never from normalized HTML.
 */
export function Highlighted({ text }: { text: string }) {
  const terms = useContext(SearchTermsContext)
  if (!terms.length || !text) return <>{text}</>
  const pattern = new RegExp(`(${[...terms].sort((a, b) => b.length - a.length).map(escape).join('|')})`, 'gi')
  return <>{text.split(pattern).map((part, index) => index % 2 === 1 ? <mark className="sd-mark" key={index}>{part}</mark> : part)}</>
}
