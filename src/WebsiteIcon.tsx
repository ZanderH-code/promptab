import { useEffect, useState } from 'react'
import { browserFaviconUrl, faviconUrl } from './favicon'
import type { Shortcut } from './model'

export function WebsiteIcon({ shortcut, onStatus }: { shortcut: Shortcut; onStatus?: (status: 'loading' | 'found' | 'missing') => void }) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setAttempt(0); setLoaded(false) }, [shortcut.url, shortcut.image, shortcut.iconMode])
  const sources = shortcut.image ? [shortcut.image] : shortcut.iconMode === 'text' ? [] : [browserFaviconUrl(shortcut.url), faviconUrl(shortcut.url)].filter((x): x is string => !!x)
  const source = sources[attempt]
  useEffect(() => { onStatus?.(source ? loaded ? 'found' : 'loading' : 'missing') }, [source, loaded, onStatus])
  return source ? <img src={source} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setAttempt(n => n + 1) }} /> : <>{shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
}
