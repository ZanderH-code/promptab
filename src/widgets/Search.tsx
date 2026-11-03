import { Search as SearchIcon, ArrowUpRight } from 'lucide-react'
import { useState, type FormEvent, type MouseEvent } from 'react'
import { searchUrl } from '../core/model'
import { toMessageRef, type MessageRef, type Translate } from '../i18n'

type Props = {
  template: string
  openInNewTab: boolean
  t: Translate
  onContextMenu: (event: MouseEvent) => void
  onError: (error: MessageRef) => void
}

export function Search({ template, openInNewTab, t, onContextMenu, onError }: Props) {
  const [query, setQuery] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const url = searchUrl(template, query)
      if (url) openInNewTab ? window.open(url, '_blank', 'noopener') : window.location.assign(url)
    } catch (error) {
      onError(toMessageRef(error, 'error.searchTemplate'))
    }
  }

  return (
    <form className="search mnt-search" onContextMenu={onContextMenu} onSubmit={submit}>
      <SearchIcon className="search-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
      <input id="search" className="mnt-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.label')} />
      <kbd>/</kbd>
      <button aria-label={t('search.submit')}><ArrowUpRight size={20} strokeWidth={1.5} aria-hidden="true" /></button>
    </form>
  )
}
