import { useCallback, useEffect, useState } from 'react'
import { validateImage } from '../core/image'
import type { ProfileV2 } from '../core/schema/profile'
import { toMessageRef, type MessageRef } from '../i18n'
import { assets, type AppProfileStore } from './useSettings'

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024

type Run = (operation: (store: AppProfileStore, id: string) => Promise<void>, notice?: boolean) => void
export function useWallpaper(profile: ProfileV2 | null, run: Run, onError: (error: MessageRef) => void) {
  const [url, setUrl] = useState('')
  const reference = profile?.background.type === 'image' ? profile.background.image?.asset : undefined
  useEffect(() => {
    let alive = true, objectUrl = ''
    setUrl('')
    const timer = reference ? setTimeout(() => { void assets.get(reference).then(blob => {
      if (!blob) throw new Error(`Missing wallpaper asset: ${reference}`)
      if (alive) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch(error => { console.error(error); if (alive) onError(toMessageRef(error, 'error.readWallpaper')) }) }, 0) : undefined
    return () => { alive = false; clearTimeout(timer); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [reference, onError])
  const choose = useCallback(async (file?: File) => {
    if (!file) return
    try {
      validateImage(file, MAX_WALLPAPER_BYTES)
      const asset = await assets.add(file)
      run((store, id) => store.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, background: { ...p.background, type: 'image', image: { blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center', ...p.background.image, asset } } })))
    } catch (error) { console.error(error); onError(toMessageRef(error, 'error.saveWallpaper')) }
  }, [onError, run])
  const remove = useCallback(() => {
    run((store, id) => store.getState().updateProfile(id, p => ({ ...p, meta: { ...p.meta, updatedAt: new Date().toISOString() }, background: { ...p.background, type: 'color', color: p.theme.color.bg } })))
  }, [run])
  return { url, choose, remove }
}
