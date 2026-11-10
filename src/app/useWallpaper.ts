import { useCallback, useEffect, useRef, useState } from 'react'
import { validateImage } from '../core/image'
import { allocateOpenSequence, wallpaperRotationIndex } from '../core/wallpaper'
import { MAX_WALLPAPER_VIDEO_BYTES, validateVideo } from '../core/video'
import type { ProfileV2 } from '../core/schema/profile'
import { toMessageRef, type MessageRef } from '../i18n'
import { assets, type AppProfileStore } from './useSettings'
import { readWallpaperPreview, writeWallpaperPreview } from './wallpaperPreview'

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024

type Run = (operation: (store: AppProfileStore, id: string) => Promise<void>, notice?: boolean) => void

async function videoPoster(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const timeout = setTimeout(() => reject(new Error('Video poster timed out')), 10000)
      const cleanup = () => { clearTimeout(timeout); video.removeAttribute('src'); video.load() }
      video.muted = true
      video.playsInline = true
      video.preload = 'metadata'
      video.onloadeddata = () => {
        const scale = Math.min(1, 1280 / video.videoWidth)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) { cleanup(); reject(new Error('Canvas unavailable')); return }
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => { cleanup(); blob ? resolve(blob) : reject(new Error('Poster encoding failed')) }, 'image/jpeg', 0.82)
      }
      video.onerror = () => { cleanup(); reject(new Error('Video decode failed')) }
      video.src = url
    })
  } finally { URL.revokeObjectURL(url) }
}

export function useWallpaper(profile: ProfileV2 | null, run: Run, onError: (error: MessageRef) => void) {
  const initialAsset = profile?.background.type === 'image' ? profile.background.image?.asset : undefined
  const [url, setUrl] = useState(() => initialAsset ? readWallpaperPreview(initialAsset) ?? '' : '')
  const [videoUrl, setVideoUrl] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const sequencePromise = useRef<Promise<number> | null>(null)
  const [openSequence, setOpenSequence] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    sequencePromise.current ??= allocateOpenSequence(navigator.locks)
    void sequencePromise.current.then(value => { if (alive) setOpenSequence(value) })
    return () => { alive = false }
  }, [])
  const background = profile?.background
  const rotation = background?.type === 'image' ? background.rotation : undefined
  const [, setRotationTick] = useState(0)
  useEffect(() => {
    if (!rotation || rotation.interval === 'open') return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      if (document.hidden) return
      const next = new Date()
      if (rotation.interval === 'hour') { next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1) }
      else next.setHours(24, 0, 0, 0)
      timer = setTimeout(() => { setRotationTick(Date.now()); schedule() }, next.getTime() - Date.now() + 20)
    }
    const onVisibility = () => { if (!document.hidden) setRotationTick(Date.now()); schedule() }
    document.addEventListener('visibilitychange', onVisibility)
    schedule()
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [rotation?.interval])
  const rotatedReference = rotation && (rotation.interval !== 'open' || openSequence !== null)
    ? rotation.images[wallpaperRotationIndex(rotation, Date.now(), openSequence ?? 0)] : undefined
  const imageReference = background?.type === 'image' ? rotatedReference ?? background.image?.asset : undefined
  const videoReference = background?.type === 'video' ? background.video?.asset : undefined
  const posterReference = background?.type === 'video' ? background.video?.poster : undefined

  useEffect(() => {
    let alive = true, imageObjectUrl = '', videoObjectUrl = '', posterObjectUrl = ''
    setUrl(imageReference ? readWallpaperPreview(imageReference) ?? '' : '')
    setVideoUrl(''); setPosterUrl('')
    const timer = setTimeout(() => {
      void Promise.all([
        imageReference ? assets.get(imageReference) : undefined,
        videoReference ? assets.get(videoReference) : undefined,
        posterReference ? assets.get(posterReference) : undefined,
      ]).then(([image, video, poster]) => {
        if (imageReference && !image) throw new Error(`Missing wallpaper asset: ${imageReference}`)
        if (videoReference && !video) throw new Error(`Missing wallpaper video: ${videoReference}`)
        if (posterReference && !poster) throw new Error(`Missing wallpaper poster: ${posterReference}`)
        if (!alive) return
        if (image) {
          imageObjectUrl = URL.createObjectURL(image); setUrl(imageObjectUrl)
          if (imageReference) void writeWallpaperPreview(imageReference, image)
        }
        if (video) { videoObjectUrl = URL.createObjectURL(video); setVideoUrl(videoObjectUrl) }
        if (poster) { posterObjectUrl = URL.createObjectURL(poster); setPosterUrl(posterObjectUrl) }
      }).catch(error => { console.error(error); if (alive) onError(toMessageRef(error, 'error.readWallpaper')) })
    }, 0)
    return () => {
      alive = false; clearTimeout(timer)
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
      if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl)
    }
  }, [imageReference, videoReference, posterReference, onError])

  const choose = useCallback(async (files: File[]) => {
    if (!files.length) return
    try {
      if (files.length > 20) throw new Error('Choose up to 20 wallpaper images')
      for (const file of files) validateImage(file, MAX_WALLPAPER_BYTES)
      const references = await Promise.all(files.map(file => assets.add(file)))
      run((store, id) => store.getState().updateProfile(id, p => {
        const { rotation: _rotation, ...background } = p.background
        return { ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, background: {
          ...background, type: 'image', image: { blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center', ...p.background.image, asset: references[0] },
          ...(references.length > 1 ? { rotation: { images: references, interval: 'open' as const } } : {}),
        } }
      }))
    } catch (error) { console.error(error); onError(toMessageRef(error, 'error.saveWallpaper')) }
  }, [onError, run])

  const chooseVideo = useCallback(async (file?: File) => {
    if (!file) return
    try {
      validateVideo(file)
      const [asset, poster] = await Promise.all([assets.add(file, MAX_WALLPAPER_VIDEO_BYTES), videoPoster(file)])
      const posterAsset = await assets.add(poster)
      run((store, id) => store.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, background: {
        ...p.background, type: 'video', video: { asset, poster: posterAsset, blur: 0, grayscale: 0 },
      } })))
    } catch (error) { console.error(error); onError(toMessageRef(error, 'error.saveWallpaper')) }
  }, [onError, run])

  const remove = useCallback(() => {
    run((store, id) => store.getState().updateProfile(id, p => {
      const { image: _image, video: _video, rotation: _rotation, ...background } = p.background
      return { ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, background: { ...background, type: 'color', color: p.theme.color.bg } }
    }))
  }, [run])

  return { url, videoUrl, posterUrl, choose, chooseVideo, remove }
}
