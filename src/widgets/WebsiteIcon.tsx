import { useEffect, useState } from 'react'
import { browserFaviconUrl, faviconUrl } from '../core/favicon'
import type { Shortcut } from '../core/model'

type Status = 'loading' | 'found' | 'missing'

export function WebsiteIcon({ shortcut, onStatus }: { shortcut: Shortcut; onStatus?: (status: Status) => void }) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setAttempt(0); setLoaded(false) }, [shortcut.url, shortcut.image, shortcut.iconMode])

  const sources = shortcut.image
    ? [shortcut.image]
    : shortcut.iconMode === 'text'
      ? []
      : [browserFaviconUrl(shortcut.url), faviconUrl(shortcut.url)].filter((source): source is string => !!source)
  const source = sources[attempt]

  useEffect(() => { onStatus?.(source ? (loaded ? 'found' : 'loading') : 'missing') }, [source, loaded, onStatus])

  if (!source) return <>{shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
  return (
    <img
      src={source}
      alt=""
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => { setLoaded(false); setAttempt(n => n + 1) }}
    />
  )
}
