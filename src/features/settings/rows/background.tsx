import { Minus, Plus, Trash2 } from 'lucide-react'
import { RANGES } from '../../../core/schema/defaults'
import type { ProfileV2 } from '../../../core/schema/profile'
import type { MessageKey } from '../../../i18n'
import { ColorField, RangeField, Row, Segmented } from '../controls'
import { colorsFor } from '../themeApi'
import { touch, type Ctx, type Item } from './shared'

const NAMED_POSITIONS = [
  ['top-left', 'settings.posTopLeft', 0, 0], ['top', 'settings.posTop', 50, 0], ['top-right', 'settings.posTopRight', 100, 0],
  ['left', 'settings.posLeft', 0, 50], ['center', 'settings.posCenter', 50, 50], ['right', 'settings.posRight', 100, 50],
  ['bottom-left', 'settings.posBottomLeft', 0, 100], ['bottom', 'settings.posBottom', 50, 100], ['bottom-right', 'settings.posBottomRight', 100, 100],
] as const

/** Named positions are stored hyphenated ("top-left", as the renderer expects); exact ones as "X% Y%". */
export function parsePosition(position: string): { named?: string; x: number; y: number } {
  const normalized = position.trim().toLowerCase().split(/[\s-]+/)
  const named = NAMED_POSITIONS.find(([name]) => {
    const parts = name.split('-')
    return parts.length === normalized.length && parts.every(part => normalized.includes(part))
  })
  if (named) return { named: named[0], x: named[2], y: named[3] }
  const match = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/.exec(position.trim())
  return match ? { x: Math.min(100, Math.max(0, Number(match[1]))), y: Math.min(100, Math.max(0, Number(match[2]))) } : { x: 50, y: 50 }
}

const GRADIENT_DEFAULT_ANGLE = 135

export function backgroundItems(ctx: Ctx): Item[] {
  const { t, profile, mode, change } = ctx
  const bg = profile.background
  const image = bg.image
  const video = bg.video
  const colors = colorsFor(profile.theme, mode)
  const setBackground = (update: (background: ProfileV2['background']) => ProfileV2['background']) => change(p => touch({ ...p, background: update(p.background) }))
  const setImage = (changes: Partial<NonNullable<ProfileV2['background']['image']>>) => setBackground(b => b.image ? { ...b, image: { ...b.image, ...changes } } : b)
  const setVideo = (changes: Partial<NonNullable<ProfileV2['background']['video']>>) => setBackground(b => b.video ? { ...b, video: { ...b.video, ...changes } } : b)
  const setType = (type: ProfileV2['background']['type']) => change(p => {
    const current = colorsFor(p.theme, mode)
    const background = { ...p.background, type }
    if (type === 'color' && !background.color) background.color = current.bg
    if (type === 'gradient' && !background.gradient) background.gradient = { angle: GRADIENT_DEFAULT_ANGLE, stops: [current.bg, current.surface] }
    return touch({ ...p, background })
  })
  const stops = bg.gradient?.stops ?? []
  const setStops = (next: string[]) => setBackground(b => ({ ...b, gradient: { angle: b.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE, stops: next } }))
  const position = parsePosition(image?.position ?? 'center')
  const setExact = (x: number, y: number) => setImage({ position: `${x}% ${y}%` })
  const imageRange = (id: string, label: MessageKey, value: number, bounds: { min: number; max: number }, set: (value: number) => void, extra: { step?: number; unit?: string } = {}): Item => ({
    id, group: 'settings.imageGroup', keys: [label],
    node: <RangeField t={t} label={t(label)} value={value} min={bounds.min} max={bounds.max} {...extra} onChange={set} />,
  })
  const uploadHint = !image ? <p className="sd-hint">{t('settings.imageNone')}</p> : null
  const items: Item[] = [
    {
      id: 'bg-type', keys: ['settings.bgType', 'settings.bgTheme', 'settings.bgColor', 'settings.bgGradient', 'settings.bgAccent', 'settings.bgImage', 'settings.bgVideo', 'settings.wallpaperVideo'],
      node: (
        <Row label={t('settings.bgType')} stack>
          <Segmented label={t('settings.bgType')} value={bg.type} onChange={setType} options={[
            { value: 'theme', label: t('settings.bgTheme') }, { value: 'color', label: t('settings.bgColor') }, { value: 'gradient', label: t('settings.bgGradient') },
            { value: 'accent', label: t('settings.bgAccent') }, { value: 'image', label: t('settings.bgImage') }, { value: 'video', label: t('settings.bgVideo') },
          ]} />
        </Row>
      ),
    },
  ]
  if (bg.type === 'color') {
    items.push({ id: 'bg-color', keys: ['settings.bgColor'], node: <ColorField t={t} label={t('settings.bgColor')} value={bg.color ?? colors.bg} onChange={value => setBackground(b => ({ ...b, color: value }))} /> })
  }
  if (bg.type === 'gradient') {
    items.push({
      id: 'bg-gradient', keys: ['settings.bgGradient', 'settings.gradientAngle'],
      node: (
        <div className="sd-gradient">
          <div className="sd-gradient-preview" aria-hidden="true" style={{ background: `linear-gradient(${bg.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE}deg, ${stops.join(', ')})` }} />
          <RangeField t={t} label={t('settings.gradientAngle')} value={bg.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE} min={0} max={360} unit="°" onChange={angle => setBackground(b => ({ ...b, gradient: { angle, stops: b.gradient?.stops ?? stops } }))} />
          {stops.map((stop, index) => (
            <div className="sd-stop" key={index}>
              <ColorField t={t} label={t('settings.gradientStop', { n: index + 1 })} value={stop} onChange={value => setStops(stops.map((item, i) => i === index ? value : item))} />
              {stops.length > 2 && <button type="button" className="sd-icon-button" aria-label={t('settings.gradientRemove', { n: index + 1 })} onClick={() => setStops(stops.filter((_, i) => i !== index))}><Minus size={16} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          ))}
          {stops.length < 3 && <button type="button" className="sd-button" onClick={() => setStops([...stops, stops[stops.length - 1] ?? colors.accent])}><Plus size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.gradientAdd')}</button>}
        </div>
      ),
    })
  }
  // Uploads only make sense for the media types; the hint that explains the adjustments sits with them.
  if (bg.type === 'image' || bg.type === 'video') {
    items.push({
      id: 'wallpaper', keys: ['settings.wallpaper', 'settings.wallpaperUpload', 'settings.wallpaperRemove', 'settings.blur', 'settings.grayscale', 'settings.imageScale', 'settings.vignette', 'settings.focal'],
      node: (
        <div className="sd-upload">
          <label className="sd-label" htmlFor="sd-wallpaper-file">{t('settings.wallpaperUpload')}</label>
          <input id="sd-wallpaper-file" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={event => { ctx.onWallpaperFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
          <label className="sd-label" htmlFor="sd-wallpaper-video">{t('settings.wallpaperVideo')}</label>
          <input id="sd-wallpaper-video" type="file" accept="video/mp4,video/webm" onChange={event => { ctx.onWallpaperVideoFile(event.target.files?.[0]); event.target.value = '' }} />
          {uploadHint}
          {(image || video || bg.rotation) && <button type="button" className="sd-button" onClick={ctx.onWallpaperRemove}><Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.wallpaperRemove')}</button>}
        </div>
      ),
    })
  }
  items.push(
    { id: 'dim', keys: ['settings.overlay'], node: <RangeField t={t} label={t('settings.overlay')} value={bg.dim} min={RANGES.dim.min} max={RANGES.dim.max} unit="%" onChange={dim => setBackground(b => ({ ...b, dim }))} /> },
  )
  if (bg.type === 'image' && bg.rotation) items.push({
    id: 'wallpaper-rotation', keys: ['settings.wallpaperRotation', 'settings.rotationOpen', 'settings.rotationHour', 'settings.rotationDay'],
    node: <Row label={t('settings.wallpaperRotation')} stack><Segmented label={t('settings.wallpaperRotation')} value={bg.rotation.interval} onChange={interval => setBackground(b => b.rotation ? { ...b, rotation: { ...b.rotation, interval: interval as 'open' | 'hour' | 'day' } } : b)} options={[
      { value: 'open', label: t('settings.rotationOpen') }, { value: 'hour', label: t('settings.rotationHour') }, { value: 'day', label: t('settings.rotationDay') },
    ]} /></Row>,
  })
  if (image) {
    items.push(
      imageRange('blur', 'settings.blur', image.blur, RANGES.blur, blur => setImage({ blur }), { unit: 'px' }),
      imageRange('grayscale', 'settings.grayscale', image.grayscale, RANGES.grayscale, grayscale => setImage({ grayscale }), { unit: '%' }),
      imageRange('image-scale', 'settings.imageScale', image.scale, RANGES.scale, scale => setImage({ scale }), { step: 0.05, unit: '×' }),
      imageRange('vignette', 'settings.vignette', image.vignette, RANGES.vignette, vignette => setImage({ vignette }), { unit: '%' }),
      {
        id: 'focal', group: 'settings.imageGroup', keys: ['settings.focal', 'settings.focalX', 'settings.focalY', ...NAMED_POSITIONS.map(([, key]) => key)],
        node: (
          <div className="sd-focal">
            <Row label={t('settings.focal')} stack>
              <Segmented label={t('settings.focal')} columns={3} value={position.named ?? ''} onChange={value => setImage({ position: value })}
                options={NAMED_POSITIONS.map(([value, key]) => ({ value, label: t(key) }))} />
            </Row>
            <RangeField t={t} label={t('settings.focalX')} value={position.x} min={0} max={100} unit="%" onChange={x => setExact(x, position.y)} />
            <RangeField t={t} label={t('settings.focalY')} value={position.y} min={0} max={100} unit="%" onChange={y => setExact(position.x, y)} />
          </div>
        ),
      },
    )
  }
  if (video) {
    items.push(
      imageRange('video-blur', 'settings.blur', video.blur, RANGES.blur, blur => setVideo({ blur }), { unit: 'px' }),
      imageRange('video-grayscale', 'settings.grayscale', video.grayscale, RANGES.grayscale, grayscale => setVideo({ grayscale }), { unit: '%' }),
    )
  }
  return items
}
