import { useEffect, useState } from 'react'
import { browserFaviconUrl, faviconUrl } from '../core/favicon'
import type { Shortcut } from '../core/model'
import { genericIcons } from './iconCatalog'
import { brandIconColor } from '../core/tokens/iconContrast'

type Status = 'loading' | 'found' | 'missing'
type IconShortcut = Omit<Shortcut, 'iconMode'> & { iconMode?: 'auto' | 'text' | 'brand' | 'lucide' | 'emoji'; iconName?: string; iconColorMode?: 'brand' | 'accent' | 'custom' }

export function WebsiteIcon({ shortcut, onStatus }: { shortcut: IconShortcut; onStatus?: (status: Status) => void }) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setAttempt(0); setLoaded(false) }, [shortcut.url, shortcut.image, shortcut.iconMode])

  const sources = shortcut.image ? [shortcut.image] : !shortcut.iconMode || shortcut.iconMode === 'auto'
    ? [browserFaviconUrl(shortcut.url), faviconUrl(shortcut.url)].filter((source): source is string => !!source) : []
  const source = sources[attempt]
  useEffect(() => { onStatus?.(source ? (loaded ? 'found' : 'loading') : 'missing') }, [source, loaded, onStatus])

  const color = shortcut.iconColorMode === 'accent' ? 'var(--mnt-accent)' : shortcut.iconColorMode === 'custom' ? shortcut.color : shortcut.iconColorMode === 'brand' && shortcut.brand ? brandIconColor(shortcut.brand.hex, shortcut.color) : undefined
  if (!source) {
    if (shortcut.iconMode === 'brand') return shortcut.brand ? <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color }} aria-hidden="true"><path d={shortcut.brand.path} /></svg> : <>{shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
    const GenericIcon = shortcut.iconMode === 'lucide' ? genericIcons[shortcut.iconName as keyof typeof genericIcons] : undefined
    if (GenericIcon) return <GenericIcon size={24} color={color} aria-hidden="true" />
    return <>{shortcut.iconMode === 'emoji' ? shortcut.iconName || shortcut.icon : shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
  }
  return <img src={source} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setAttempt(n => n + 1) }} />
}
