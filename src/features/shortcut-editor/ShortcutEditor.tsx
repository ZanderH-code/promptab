import { Plus, X } from 'lucide-react'
import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { validateImage } from '../../core/image'
import type { Shortcut } from '../../core/model'
import { toMessageRef, type MessageKey, type Translate } from '../../i18n'
import { WebsiteIcon } from '../../widgets/WebsiteIcon'

type Props = {
  shortcut: Shortcut
  t: Translate
  onChange: (shortcut: Shortcut) => void
  onClose: () => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
  onError: (key: MessageKey) => void
}

const MAX_ICON_BYTES = 512 * 1024

export function ShortcutEditor({ shortcut, t, onChange, onClose, onSave, onError }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [localImage, setLocalImage] = useState(shortcut.image)
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('missing')
  const selected = shortcut.image ? 'upload' : shortcut.iconMode === 'text' ? 'text' : 'auto'
  const automatic = { ...shortcut, image: undefined, iconMode: 'auto' as const }
  const textIcon = shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || 'A'

  function upload(file?: File) {
    if (!file) return
    try {
      validateImage(file, MAX_ICON_BYTES)
      const reader = new FileReader()
      reader.onload = () => {
        const image = String(reader.result)
        setLocalImage(image)
        onChange({ ...shortcut, image })
      }
      reader.onerror = () => onError('error.readImage')
      reader.readAsDataURL(file)
    } catch (error) {
      onError(toMessageRef(error, 'error.readImage').key)
    }
  }

  const hint = selected === 'upload'
    ? t('editor.uploadHint')
    : selected === 'text'
      ? t('editor.textHint')
      : t(status === 'found' ? 'editor.autoFound' : status === 'loading' ? 'editor.autoLoading' : 'editor.autoMissing')

  return (
    <div className="modal-backdrop">
      <form className="modal shortcut-editor" onSubmit={onSave}>
        <div className="editor-heading">
          <div>
            <span className="editor-kicker">{t('editor.kicker')}</span>
            <h2>{t('shortcuts.edit')}</h2>
          </div>
          <button type="button" className="editor-close" onClick={onClose} aria-label={t('common.close')}><X size={20} strokeWidth={1.5} aria-hidden="true" /></button>
        </div>
        <div className="editor-fields">
          <label className="stack">
            {t('editor.url')}
            <input required value={shortcut.url} placeholder="https://example.com" onChange={event => onChange({ ...shortcut, url: event.target.value })} />
          </label>
          <label className="stack">
            {t('editor.name')}
            <input required value={shortcut.name} placeholder={t('editor.namePlaceholder')} onChange={event => onChange({ ...shortcut, name: event.target.value })} />
          </label>
        </div>
        <fieldset className="icon-choices">
          <legend>{t('editor.chooseIcon')}</legend>
          <div className="icon-choice-grid">
            <button type="button" className={'icon-choice ' + (selected === 'auto' ? 'selected' : '')} aria-pressed={selected === 'auto'} onClick={() => onChange({ ...shortcut, image: undefined, iconMode: 'auto' })}>
              <span className="icon-choice-preview auto-preview"><WebsiteIcon shortcut={automatic} onStatus={setStatus} /></span>
              <span>{t('editor.iconAuto')}</span>
            </button>
            <button type="button" className={'icon-choice ' + (selected === 'text' ? 'selected' : '')} aria-pressed={selected === 'text'} onClick={() => onChange({ ...shortcut, image: undefined, iconMode: 'text' })}>
              <span className="icon-choice-preview text-preview" style={{ '--tile': shortcut.color } as CSSProperties}>{textIcon}</span>
              <span>{t('editor.iconText')}</span>
            </button>
            <button type="button" className={'icon-choice ' + (selected === 'upload' ? 'selected' : '')} aria-pressed={selected === 'upload'} onClick={() => (localImage ? onChange({ ...shortcut, image: localImage }) : fileInput.current?.click())}>
              <span className="icon-choice-preview upload-preview">{localImage ? <img src={localImage} alt="" /> : <Plus size={24} strokeWidth={1.5} aria-hidden="true" />}</span>
              <span>{t('editor.iconUpload')}</span>
            </button>
          </div>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { upload(event.target.files?.[0]); event.target.value = '' }} />
          <p className="icon-hint">{hint}</p>
          {selected === 'upload' && <button type="button" className="editor-link" onClick={() => fileInput.current?.click()}>{t('editor.changeImage')}</button>}
        </fieldset>
        {selected === 'text' && (
          <div className="text-icon-controls">
            <label className="stack">
              {t('editor.iconText')}
              <input maxLength={2} value={shortcut.icon} placeholder={shortcut.name.slice(0, 1)} onChange={event => onChange({ ...shortcut, icon: event.target.value })} />
            </label>
            <label>
              {t('editor.iconColor')}
              <input type="color" value={shortcut.color} onChange={event => onChange({ ...shortcut, color: event.target.value })} />
            </label>
          </div>
        )}
        <div className="editor-actions">
          <button type="button" className="editor-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button className="primary">{t('editor.save')}</button>
        </div>
      </form>
    </div>
  )
}
