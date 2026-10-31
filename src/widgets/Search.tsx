import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { searchUrl } from '../core/model'
import { toMessageRef, type MessageRef, type Translate } from '../i18n'

type Props = {
  template: string
  t: Translate
  onContextMenu: (event: MouseEvent) => void
  onError: (error: MessageRef) => void
}

export function Search({ template, t, onContextMenu, onError }: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const focusOnSlash = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.target instanceof HTMLInputElement) return
      event.preventDefault()
      document.querySelector<HTMLInputElement>('#search')?.focus()
    }
    window.addEventListener('keydown', focusOnSlash)
    return () => window.removeEventListener('keydown', focusOnSlash)
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const url = searchUrl(template, query)
      if (url) window.location.assign(url)
    } catch (error) {
      onError(toMessageRef(error, 'error.searchTemplate'))
    }
  }

  return (
    <form className="search" onContextMenu={onContextMenu} onSubmit={submit}>
      <span className="search-icon">⌕</span>
      <input id="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search.placeholder')} aria-label={t('search.label')} />
      <kbd>/</kbd>
      <button aria-label={t('search.submit')}>↗</button>
    </form>
  )
}
