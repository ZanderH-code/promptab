import { useEffect, useRef, useState } from 'react'
import type { FaviconCandidate } from '../core/faviconQuality'
import type { Shortcut } from '../core/model'

type Status = 'loading' | 'found' | 'missing'
type IconShortcut = Omit<Shortcut, 'iconMode'> & { iconMode?: 'auto' | 'text' | 'brand' | 'lucide' | 'emoji'; iconName?: string; iconColorMode?: 'brand' | 'accent' | 'custom' }

export function AutomaticWebsiteIcon({ shortcut, onStatus }: { shortcut: IconShortcut; onStatus?: (status: Status) => void }) {
  const [icon, setIcon] = useState<FaviconCandidate | null>(null)
  const [done, setDone] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    void import('../core/faviconQuality').then(({ loadBestFavicon }) => {
      const size = Math.max(1, Math.round(imageRef.current?.getBoundingClientRect().width || 64))
      unsubscribe = loadBestFavicon(shortcut.url, size, (candidate, complete) => {
        if (candidate) setIcon(candidate)
        if (complete) setDone(true)
      })
    })
    return () => unsubscribe?.()
  }, [shortcut.url])
  const status: Status = icon ? 'found' : done ? 'missing' : 'loading'
  useEffect(() => { onStatus?.(status) }, [status, onStatus])
  return icon ? <img ref={imageRef} src={icon.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <>{shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
}
