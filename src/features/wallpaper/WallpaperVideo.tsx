import { useEffect, useRef, useState } from 'react'

type Battery = { charging: boolean; level: number; addEventListener(type: 'levelchange' | 'chargingchange', listener: () => void): void; removeEventListener(type: 'levelchange' | 'chargingchange', listener: () => void): void }
type Props = { src: string; poster: string; blur: number; grayscale: number; reduceMotion: 'system' | 'on' | 'off' }

export function WallpaperVideo({ src, poster, blur, grayscale, reduceMotion }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(() => !document.hidden)
  const [reduced, setReduced] = useState(() => reduceMotion === 'on' || (reduceMotion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches))
  const [batteryAllowsMotion, setBatteryAllowsMotion] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [firstFrameMs, setFirstFrameMs] = useState<number | null>(null)
  const startedAt = useRef(performance.now())
  const firstFrameSeen = useRef(false)
  const allowed = visible && !reduced && batteryAllowsMotion

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(reduceMotion === 'on' || (reduceMotion === 'system' && media.matches))
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [reduceMotion])

  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    let battery: Battery | undefined
    let alive = true
    const update = () => { if (battery && alive) setBatteryAllowsMotion(battery.charging || battery.level > 0.15) }
    const navigatorWithBattery = navigator as Navigator & { getBattery?: () => Promise<Battery> }
    void navigatorWithBattery.getBattery?.().then(value => {
      if (!alive) return
      battery = value
      update()
      battery.addEventListener('levelchange', update)
      battery.addEventListener('chargingchange', update)
    }).catch(() => { /* Battery status is optional and unsupported browsers keep playback enabled. */ })
    return () => {
      alive = false
      battery?.removeEventListener('levelchange', update)
      battery?.removeEventListener('chargingchange', update)
    }
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element) return
    if (allowed) void element.play().catch(() => setPlaying(false))
    else { element.pause(); setPlaying(false) }
  }, [allowed, src])

  const markFirstFrame = () => {
    if (!firstFrameSeen.current) {
      firstFrameSeen.current = true
      setFirstFrameMs(Math.round(performance.now() - startedAt.current))
    }
    setPlaying(true)
  }
  const onPlaying = () => {
    const element = video.current
    if (element && 'requestVideoFrameCallback' in element) element.requestVideoFrameCallback(markFirstFrame)
    else markFirstFrame()
  }

  return <>
    <div className="wallpaper-image wallpaper-video-poster" aria-hidden="true" style={{ backgroundImage: `url("${poster}")`, opacity: playing ? 0 : 1, filter: `blur(${blur}px) grayscale(${grayscale}%)`, transform: `scale(${1 + blur / 200})` }} />
    <video
      ref={video} className="wallpaper-video-element" aria-hidden="true" muted loop playsInline
      src={allowed ? src : undefined} poster={poster} preload={allowed ? 'auto' : 'none'}
      onPlaying={onPlaying} onPause={() => setPlaying(false)} data-first-frame-ms={firstFrameMs ?? undefined}
      style={{ opacity: playing ? 1 : 0, filter: `blur(${blur}px) grayscale(${grayscale}%)`, transform: `scale(${1 + blur / 200})` }}
    />
  </>
}
