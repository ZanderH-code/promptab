import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cachedFavicon, faviconCacheKey, initialFaviconSources } from '../core/favicon'
import type { KnownBrand } from '../core/brandShards'
import type { Shortcut } from '../core/model'
import { brandIconColor } from '../core/tokens/iconContrast'

type Status = 'loading' | 'found' | 'missing'
type IconShortcut = Omit<Shortcut, 'iconMode'> & { iconMode?: 'auto' | 'text' | 'brand' | 'lucide' | 'emoji'; iconName?: string; iconColorMode?: 'brand' | 'accent' | 'custom' }
type AutoState = { key: string | null; url: string | null; cache: boolean; brand?: KnownBrand }
type AutoWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function WebsiteIcon({ shortcut, onStatus }: { shortcut: IconShortcut; onStatus?: (status: Status) => void }) {
  const [failedImage, setFailedImage] = useState('')
  const [retryKey, setRetryKey] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState('')
  const [autoState, setAutoState] = useState<AutoState | null>(null)
  const [qualityKey, setQualityKey] = useState<string | null>(null)
  const [GenericIcon, setGenericIcon] = useState<LucideIcon | null | undefined>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const automatic = !shortcut.image && (!shortcut.iconMode || shortcut.iconMode === 'auto')
  const cacheKey = automatic ? faviconCacheKey(shortcut.url) : null
  const cached = automatic ? cachedFavicon(shortcut.url) : null
  const initialSources = automatic ? initialFaviconSources(shortcut.url) : []
  // The synchronous cache paints the first render: no favicon.ico attempt, no blank, no letter flash.
  const initialAutoState: AutoState = { key: cacheKey, url: cached ? cached.url ?? null : initialSources[0] ?? null, cache: !!cached, brand: cached?.brand }
  const currentAutoState = autoState?.key === cacheKey ? autoState : initialAutoState
  const source = shortcut.image ? (failedImage === shortcut.image ? undefined : shortcut.image) : automatic ? currentAutoState.url ?? undefined : undefined
  const imageLoaded = !!source && loadedSrc === source
  const autoFinished = !cacheKey || qualityKey === cacheKey || (!!cached && !cached.url)
  const manualStatus: Status = source ? (imageLoaded ? 'found' : 'loading') : 'missing'
  const status: Status = automatic ? (imageLoaded || !!currentAutoState.brand ? 'found' : autoFinished && !source ? 'missing' : 'loading') : manualStatus

  // State is tagged by the shortcut it belongs to, so a new shortcut ignores it instead of clearing it.
  // Clearing on mount would race the image load event when the image is already in the memory cache.
  useEffect(() => { onStatus?.(status) }, [status, onStatus])
  useEffect(() => {
    if (shortcut.iconMode !== 'lucide' || !shortcut.iconName) return
    let cancelled = false
    setGenericIcon(null)
    void import('./iconCatalog').then(({ genericIcons }) => {
      if (!cancelled) setGenericIcon(() => genericIcons[shortcut.iconName as keyof typeof genericIcons])
    })
    return () => { cancelled = true }
  }, [shortcut.iconMode, shortcut.iconName])
  useEffect(() => {
    if (!automatic || !cacheKey) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let idleHandle: number | undefined
    let timerHandle: number | undefined
    const start = () => {
      void import('../core/faviconQuality').then(({ loadBestFavicon }) => {
        if (cancelled) return
        const displaySize = Math.max(1, Math.round(imageRef.current?.getBoundingClientRect().width || 64))
        unsubscribe = loadBestFavicon(shortcut.url, displaySize, (candidate, complete) => {
          if (candidate || complete) setAutoState({ key: cacheKey, url: candidate?.url || null, cache: false, brand: candidate?.brand })
          if (complete) setQualityKey(cacheKey)
        }, retryKey === cacheKey)
      })
    }
    const idleWindow = window as AutoWindow
    if (idleWindow.requestIdleCallback) idleHandle = idleWindow.requestIdleCallback(start, { timeout: 1500 })
    else timerHandle = window.setTimeout(start, 0)
    return () => {
      cancelled = true
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle)
      if (timerHandle !== undefined) window.clearTimeout(timerHandle)
      unsubscribe?.()
    }
  }, [automatic, cacheKey, shortcut.url, retryKey])

  // One colour rule for manual and automatic brand marks; accent and custom win over the brand hex.
  const color = (hex?: string) => shortcut.iconColorMode === 'accent' ? 'var(--mnt-accent)' : shortcut.iconColorMode === 'custom' ? shortcut.color : hex ? brandIconColor(hex, shortcut.color) : undefined
  const textFallback = shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'
  if (automatic) {
    if (currentAutoState.brand) return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color: color(currentAutoState.brand.hex) }} aria-hidden="true"><path d={currentAutoState.brand.path} /></svg>
    const visibleFallback = !source && autoFinished
    return <>{source && <img ref={imageRef} src={source} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" style={{ visibility: imageLoaded ? 'visible' : 'hidden' }} onLoad={() => setLoadedSrc(source)} onError={() => {
      if (currentAutoState.cache) setRetryKey(cacheKey)
      const next = initialSources[initialSources.indexOf(currentAutoState.url ?? '') + 1] ?? null
      setAutoState({ key: cacheKey, url: next, cache: false })
    }} />}{visibleFallback && textFallback}</>
  }

  if (!source) {
    if (shortcut.iconMode === 'brand') return shortcut.brand ? <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color: color(shortcut.brand.hex) }} aria-hidden="true"><path d={shortcut.brand.path} /></svg> : <>{shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
    if (shortcut.iconMode === 'lucide') return GenericIcon === null ? <span aria-hidden="true" /> : GenericIcon ? <GenericIcon size={24} color={color()} aria-hidden="true" /> : <>{textFallback}</>
    return <>{shortcut.iconMode === 'emoji' ? shortcut.iconName || shortcut.icon : textFallback}</>
  }
  return <img src={source} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoadedSrc(source)} onError={() => setFailedImage(source)} />
}
