import { useEffect } from 'react'
import { assetFontFamily, isAssetFont } from '../core/font'
import type { ProfileV2 } from '../core/schema/profile'
import { assets } from './useSettings'

/** The DOM typings omit the set methods of `document.fonts`. */
const fontSet = () => document.fonts as unknown as { add(face: FontFace): void; delete(face: FontFace): boolean }

/** Registers uploaded fonts from the asset store as FontFace objects; no network request is involved. */
export function useAssetFonts(profile: ProfileV2 | null) {
  const display = profile?.theme.font.display ?? '', ui = profile?.theme.font.ui ?? ''
  useEffect(() => {
    const faces: FontFace[] = []
    let alive = true
    for (const ref of new Set([display, ui].filter(isAssetFont))) {
      void (async () => {
        const blob = await assets.get(ref).catch(() => undefined)
        if (!blob || !alive) return
        try {
          const face = new FontFace(assetFontFamily(ref), await blob.arrayBuffer())
          await face.load()
          if (!alive) return
          fontSet().add(face)
          faces.push(face)
        } catch { /* An unreadable font falls back to the system stack. */ }
      })()
    }
    return () => { alive = false; faces.forEach(face => fontSet().delete(face)) }
  }, [display, ui])
}
