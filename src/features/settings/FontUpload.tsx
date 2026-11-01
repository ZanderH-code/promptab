import { useRef, useState } from 'react'
import { assets } from '../../app/useSettings'
import { MAX_FONT_BYTES, detectFont } from '../../core/font'
import type { Ctx } from './rows'
import { editTheme } from './themeApi'

type Target = 'display' | 'ui'

/** Stores a font file in the asset store and points the display or interface font at it. */
export function FontUpload({ ctx }: { ctx: Ctx }) {
  const { t, change, onError } = ctx
  const input = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<Target>('display')

  const choose = (which: Target) => { setTarget(which); input.current?.click() }
  const upload = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > MAX_FONT_BYTES || !detectFont(new Uint8Array(await file.slice(0, 16).arrayBuffer()))) throw new Error('Invalid font')
      const reference = await assets.add(file)
      change(p => ({ ...p, theme: editTheme(p.theme, { font: { ...p.theme.font, [target]: reference } }), meta: { ...p.meta, updatedAt: new Date().toISOString() } }), 'theme')
    } catch {
      onError({ key: 'font.uploadFailed' })
    }
  }

  return (
    <div className="sd-upload">
      <span className="sd-label">{t('font.upload')}<small>{t('font.uploadHint')}</small></span>
      <input ref={input} type="file" hidden accept=".woff2,.ttf,.otf,font/woff2,font/ttf,font/otf" aria-label={t('font.upload')} onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
      <div className="sd-css-actions">
        <button type="button" className="sd-button" onClick={() => choose('display')}>{t('font.uploadDisplay')}</button>
        <button type="button" className="sd-button" onClick={() => choose('ui')}>{t('font.uploadUi')}</button>
      </div>
    </div>
  )
}
