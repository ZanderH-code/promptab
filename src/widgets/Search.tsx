import { Search as SearchIcon, ArrowUpRight } from 'lucide-react'
import { useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { searchUrl } from '../core/model'
import { toMessageRef, type MessageRef, type Translate } from '../i18n'

type Props = {
  template: string
  /** Shown as "Search Google" instead of the generic hint. */
  engineName?: string
  /** Typing also narrows the websites on the page to those whose name or address matches. */
  onFind?: (query: string) => void
  openInNewTab: boolean
  t: Translate
  onContextMenu: (event: MouseEvent) => void
  onError: (error: MessageRef) => void
}

export function Search({ template, engineName, onFind, openInNewTab, t, onContextMenu, onError }: Props) {
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  /** Ctrl/⌘ with Enter or the button opens results in a new tab, as it does for links. */
  const newTab = useRef(false)

  function go(inNewTab: boolean) {
    try {
      const url = searchUrl(template, query)
      // An empty search has nowhere to go; keep the person in the box instead of doing nothing.
      if (!url) { input.current?.focus(); return }
      inNewTab ? window.open(url, '_blank', 'noopener') : window.location.assign(url)
    } catch (error) {
      onError(toMessageRef(error, 'error.searchTemplate'))
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    go(openInNewTab || newTab.current)
    newTab.current = false
  }

  const remember = (event: KeyboardEvent | MouseEvent) => { newTab.current = event.ctrlKey || event.metaKey }

  return (
    <form className="search mnt-search" onContextMenu={onContextMenu} onSubmit={submit}>
      <SearchIcon className="search-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
      <input ref={input} id="search" className="mnt-search-input" value={query} onChange={event => { setQuery(event.target.value); onFind?.(event.target.value) }} onKeyDown={event => { if (event.key === 'Enter') remember(event); if (event.key === 'Escape' && query) { event.stopPropagation(); setQuery(''); onFind?.('') } }} placeholder={onFind ? t(engineName ? 'search.placeholderFindEngine' : 'search.placeholderFind', { engine: engineName ?? '' }) : engineName ? t('search.placeholderEngine', { engine: engineName }) : t('search.placeholder')} aria-label={t('search.label')} />
      <kbd>/</kbd>
      <button aria-label={t('search.submit')} title={t('search.submit')} onClick={remember} onAuxClick={event => { if (event.button === 1) { event.preventDefault(); go(true) } }}><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" /></button>
    </form>
  )
}
