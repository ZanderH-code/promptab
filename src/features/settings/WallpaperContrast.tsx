import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { assets } from '../../app/useSettings'
import { sampleAverageColor } from '../../core/imageColor'
import type { ProfileV2 } from '../../core/schema/profile'
import { RANGES } from '../../core/schema/defaults'
import { dimToPass, wallpaperContrast } from '../../core/tokens/wallpaper'
import type { Translate } from '../../i18n'
import { colorsFor, minContrastFor, type ThemeMode } from './themeApi'

const averages = new Map<string, Promise<string | null>>()
const averageOf = (asset: string) => {
  let pending = averages.get(asset)
  if (!pending) {
    pending = assets.get(asset).then(blob => (blob ? sampleAverageColor(blob) : null))
    averages.set(asset, pending)
  }
  return pending
}

/** Warns when the text colour cannot be read over the dimmed wallpaper's estimated average colour. */
export function WallpaperContrast({ t, profile, mode, onDim }: { t: Translate; profile: ProfileV2; mode: ThemeMode; onDim: (dim: number) => void }) {
  const { background, theme } = profile
  const asset = background.type === 'image' ? background.image?.asset : undefined
  const [average, setAverage] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setAverage(null)
    if (asset) void averageOf(asset).then(value => { if (alive) setAverage(value) }).catch(() => undefined)
    return () => { alive = false }
  }, [asset])
  if (!asset || !average) return null
  const result = wallpaperContrast(colorsFor(theme, mode).text, average, background.dim, minContrastFor(theme))
  if (result.pass) return null
  const fix = dimToPass(colorsFor(theme, mode).text, average, result.required, RANGES.dim.max, background.dim)
  return (
    <div className="sd-contrast" role="status" data-state="warn" data-kind="wallpaper">
      <ul><li><TriangleAlert size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.contrastWallpaper', { ratio: result.ratio.toFixed(1), min: result.required })}</li></ul>
      {fix !== null && <button type="button" className="sd-button" onClick={() => onDim(fix)}>{t('settings.contrastWallpaperFix', { dim: fix })}</button>}
    </div>
  )
}
