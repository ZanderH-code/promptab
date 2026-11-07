import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cachedFavicon, initialFaviconSources, normalizeUrl } from '../core/favicon'
import type { KnownBrand } from '../core/knownBrands'
import type { Shortcut } from '../core/model'
import { brandIconColor } from '../core/tokens/iconContrast'

type Status = 'loading' | 'found' | 'missing'
type IconShortcut = Omit<Shortcut, 'iconMode'> & { iconMode?: 'auto' | 'text' | 'brand' | 'lucide' | 'emoji'; iconName?: string; iconColorMode?: 'brand' | 'accent' | 'custom' }
type AutoState = { origin: string; url: string | null; cache: boolean; brand?: KnownBrand }
type AutoWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function WebsiteIcon({ shortcut, onStatus }: { shortcut: IconShortcut; onStatus?: (status: Status) => void }) {
  const [attempt, setAttempt] = useState(0)
  const [retry, setRetry] = useState(0)
  const [loadedSrc, setLoadedSrc] = useState('')
  const [autoState, setAutoState] = useState<AutoState | null>(null)
  const [qualityOrigin, setQualityOrigin] = useState('')
  const [qualityDone, setQualityDone] = useState(false)
  const [GenericIcon, setGenericIcon] = useState<LucideIcon | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const automatic = !shortcut.image && (!shortcut.iconMode || shortcut.iconMode === 'auto')
  const normalized = normalizeUrl(shortcut.url)
  const origin = normalized ? new URL(normalized).origin : ''
  const cached = automatic ? cachedFavicon(shortcut.url) : null
  const initialSources = automatic ? initialFaviconSources(shortcut.url) : []
  // The synchronous cache paints the first render: no favicon.ico attempt, no blank, no letter flash.
  const initialAutoState: AutoState = { origin, url: cached ? cached.url ?? null : initialSources[0] ?? null, cache: !!cached, brand: cached?.brand }
  const currentAutoState = autoState?.origin === origin ? autoState : initialAutoState
  const source = shortcut.image ? (attempt === 0 ? shortcut.image : undefined) : automatic ? currentAutoState.url ?? undefined : undefined
  const imageLoaded = !!source && loadedSrc === source
  const autoFinished = !origin || (qualityOrigin === origin && qualityDone) || (!!cached && !cached.url)
  const manualStatus: Status = source ? (imageLoaded ? 'found' : 'loading') : 'missing'
  const status: Status = automatic ? (imageLoaded || !!currentAutoState.brand ? 'found' : autoFinished && !source ? 'missing' : 'loading') : manualStatus

  useEffect(() => {
    setAttempt(0)
    setRetry(0)
    setLoadedSrc('')
    setAutoState(null)
    setQualityOrigin('')
    setQualityDone(false)
  }, [shortcut.url, shortcut.image, shortcut.iconMode])
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
    if (!automatic || !origin) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let idleHandle: number | undefined
    let timerHandle: number | undefined
    const start = () => {
      void import('../core/faviconQuality').then(({ loadBestFavicon }) => {
        if (cancelled) return
        const displaySize = Math.max(1, Math.round(imageRef.current?.getBoundingClientRect().width || 64))
        unsubscribe = loadBestFavicon(shortcut.url, displaySize, (candidate, complete) => {
          if (candidate?.brand) {
            setLoadedSrc('')
            setAutoState({ origin, url: null, cache: false, brand: candidate.brand })
          } else if (candidate) {
            setAutoState({ origin, url: candidate.url, cache: false })
          } else if (complete) {
            setAutoState({ origin, url: null, cache: false })
          }
          if (complete) { setQualityOrigin(origin); setQualityDone(true) }
        }, retry > 0)
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
  }, [automatic, origin, shortcut.url, retry])

  const color = shortcut.iconColorMode === 'accent' ? 'var(--mnt-accent)' : shortcut.iconColorMode === 'custom' ? shortcut.color : shortcut.iconColorMode === 'brand' && shortcut.brand ? brandIconColor(shortcut.brand.hex, shortcut.color) : undefined
  const textFallback = shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || '•'
  if (automatic) {
    if (currentAutoState.brand) return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color: brandIconColor(currentAutoState.brand.hex, shortcut.color) }} aria-hidden="true"><path d={currentAutoState.brand.path} /></svg>
    const visibleFallback = !source && autoFinished
    return <>{source && <img ref={imageRef} src={source} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" style={{ visibility: imageLoaded ? 'visible' : 'hidden' }} onLoad={() => setLoadedSrc(source)} onError={() => {
      setLoadedSrc('')
      if (currentAutoState.cache) setRetry(value => value + 1)
      const next = initialSources[initialSources.indexOf(currentAutoState.url ?? '') + 1] ?? null
      setAutoState({ origin, url: next, cache: false })
    }} />}{visibleFallback ? <>{textFallback}</> : null}</>
  }

  if (!source) {
    if (shortcut.iconMode === 'brand') return shortcut.brand ? <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style={{ color }} aria-hidden="true"><path d={shortcut.brand.path} /></svg> : <>{shortcut.name.trim().slice(0, 1).toUpperCase() || '•'}</>
    if (shortcut.iconMode === 'lucide') return GenericIcon ? <GenericIcon size={24} color={color} aria-hidden="true" /> : <span aria-hidden="true" />
    return <>{shortcut.iconMode === 'emoji' ? shortcut.iconName || shortcut.icon : textFallback}</>
  }
  return <img src={source} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoadedSrc(source)} onError={() => { setLoadedSrc(''); setAttempt(value => value + 1) }} />
}
