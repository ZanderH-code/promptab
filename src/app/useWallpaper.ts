import { useCallback, useEffect, useState } from 'react'
import { validateImage } from '../core/image'
import { toMessageRef, type MessageRef } from '../i18n'
import { readWallpaper, writeWallpaper } from '../storage/wallpaper'

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024

export function useWallpaper(onError: (error: MessageRef) => void) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let objectUrl = ''
    readWallpaper()
      .then(blob => {
        if (!blob) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => onError({ key: 'error.readWallpaper' }))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
    // The wallpaper is read once on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const choose = useCallback(async (file?: File) => {
    if (!file) return
    try {
      validateImage(file, MAX_WALLPAPER_BYTES)
      await writeWallpaper(file)
      setUrl(URL.createObjectURL(file))
    } catch (error) {
      onError(toMessageRef(error, 'error.saveWallpaper'))
    }
  }, [onError])

  const remove = useCallback(() => {
    writeWallpaper(null).then(() => setUrl('')).catch(() => onError({ key: 'error.removeWallpaper' }))
  }, [onError])

  return { url, choose, remove }
}
