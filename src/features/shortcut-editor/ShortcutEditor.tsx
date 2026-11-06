import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { validateImage } from '../../core/image'
import type { Shortcut } from '../../core/model'
import { toMessageRef, type MessageKey, type Translate } from '../../i18n'
import { WebsiteIcon } from '../../widgets/WebsiteIcon'
import { emojis, genericIcons, loadBrands, type BrandIcon } from '../../widgets/iconCatalog'

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
  // A new shortcut starts as an empty name with the default draft URL; only that state (or a name the user clears) may auto-fill.
  const autoName = useRef(shortcut.name.trim() === '' && shortcut.url === 'https://')
  // Load the name table on demand so it stays out of the startup bundle.
  const suggestName = useRef<((input: string) => string) | null>(null)
  const latest = useRef(shortcut)
  const lastUrl = useRef(shortcut.url)
  latest.current = shortcut
  useEffect(() => {
    let active = true
    void import('../../core/siteName').then(module => {
      suggestName.current = module.suggestSiteName
      if (!active || !autoName.current) return
      const suggested = module.suggestSiteName(lastUrl.current)
      if (!suggested) return
      onChange({ ...latest.current, url: lastUrl.current, name: suggested })
    }).catch(() => {})
    return () => { active = false }
  }, [onChange])
  const [localImage, setLocalImage] = useState(shortcut.image)
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('missing')
  const [brands, setBrands] = useState<BrandIcon[]>([])
  const [brandError, setBrandError] = useState(false)
  const [query, setQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const selected = shortcut.image ? 'upload' : shortcut.iconMode || 'auto'
  useEffect(() => {
    let active = true
    if (selected === 'brand' && searchActive && brands.length === 0) void loadBrands().then(value => { if (active) setBrands(value) }).catch(() => { if (active) setBrandError(true) })
    return () => { active = false }
  }, [selected, searchActive, brands.length])
  function selectIcon(iconMode: 'brand' | 'lucide' | 'emoji', iconName: string, brand?: BrandIcon) {
    const colorMode = iconMode === 'brand' ? shortcut.iconColorMode || 'brand' : shortcut.iconColorMode === 'custom' ? 'custom' : 'accent'
    const next = { ...shortcut, image: undefined, iconMode, iconName, iconColorMode: colorMode }
    if (brand) next.brand = { slug: brand.slug, title: brand.title, path: brand.path, hex: brand.hex }
    else if (iconMode !== 'brand') delete next.brand
    delete next.builtinIcon
    onChange(next)
  }
  const automatic = { ...shortcut, image: undefined, iconMode: 'auto' as const }
  const textIcon = shortcut.icon || shortcut.name.trim().slice(0, 1).toUpperCase() || 'A'

  function changeUrl(url: string) {
    lastUrl.current = url
    const name = autoName.current ? suggestName.current?.(url) ?? '' : ''
    onChange(name ? { ...shortcut, url, name } : { ...shortcut, url })
  }

  function changeName(name: string) {
    autoName.current = name.trim() === ''
    const next = { ...shortcut, name }
    delete next.builtinName
    if (name !== shortcut.name) delete next.builtinGroup
    onChange(next)
  }

  function changeIcon(icon: string) {
    const next = { ...shortcut, icon }
    delete next.builtinIcon
    onChange(next)
  }

  function upload(file?: File) {
    if (!file) return
    try {
      validateImage(file, MAX_ICON_BYTES)
      const reader = new FileReader()
      reader.onload = () => {
        const image = String(reader.result)
        setLocalImage(image)
        const next = { ...shortcut, image }
        delete next.builtinIcon
        onChange(next)
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
            <input required value={shortcut.url} placeholder="https://example.com" onChange={event => changeUrl(event.target.value)} />
          </label>
          <label className="stack">
            {t('editor.name')}
            <input required value={shortcut.name} placeholder={t('editor.namePlaceholder')} onChange={event => changeName(event.target.value)} />
          </label>
        </div>
        <fieldset className="icon-choices">
          <legend>{t('editor.chooseIcon')}</legend>
          <div className="icon-choice-grid">
            <button type="button" className={'icon-choice ' + (selected === 'auto' ? 'selected' : '')} aria-pressed={selected === 'auto'} onClick={() => { const next = { ...shortcut, image: undefined, iconMode: 'auto' as const }; delete next.builtinIcon; onChange(next) }}>
              <span className="icon-choice-preview auto-preview"><WebsiteIcon shortcut={automatic} onStatus={setStatus} /></span>
              <span>{t('editor.iconAuto')}</span>
            </button>
            <button type="button" className={'icon-choice ' + (selected === 'text' ? 'selected' : '')} aria-pressed={selected === 'text'} onClick={() => { const next = { ...shortcut, image: undefined, iconMode: 'text' as const }; delete next.builtinIcon; onChange(next) }}>
              <span className="icon-choice-preview text-preview" style={{ '--tile': shortcut.color } as CSSProperties}>{textIcon}</span>
              <span>{t('editor.iconText')}</span>
            </button>
            <button type="button" className={'icon-choice ' + (selected === 'upload' ? 'selected' : '')} aria-pressed={selected === 'upload'} onClick={() => { if (localImage) { const next = { ...shortcut, image: localImage }; delete next.builtinIcon; onChange(next) } else fileInput.current?.click() }}>
              <span className="icon-choice-preview upload-preview">{localImage ? <img src={localImage} alt="" /> : <Plus size={24} strokeWidth={1.5} aria-hidden="true" />}</span>
              <span>{t('editor.iconUpload')}</span>
            </button>
            {(['brand', 'lucide', 'emoji'] as const).map(mode => <button key={mode} type="button" className={'icon-choice ' + (selected === mode ? 'selected' : '')} aria-pressed={selected === mode} onClick={() => selectIcon(mode, mode === 'brand' ? 'github' : mode === 'lucide' ? 'globe' : '🌐')}>
              <span className="icon-choice-preview auto-preview">{mode === 'brand' ? '◇' : mode === 'lucide' ? '✧' : '🌐'}</span>
              <span>{mode === 'brand' ? t('editor.iconBrand') : mode === 'lucide' ? t('editor.iconLucide') : t('editor.iconEmoji')}</span>
            </button>)}
          </div>
          <input ref={fileInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { upload(event.target.files?.[0]); event.target.value = '' }} />
          <p className="icon-hint">{hint}</p>
          {selected === 'upload' && <button type="button" className="editor-link" onClick={() => fileInput.current?.click()}>{t('editor.changeImage')}</button>}
        </fieldset>
        {selected === 'brand' && <div className="icon-picker">
          <label className="stack">{t('editor.searchBrands')}<input value={query} onFocus={() => setSearchActive(true)} onChange={event => { setQuery(event.target.value); setSearchActive(true) }} /></label>
          {brandError ? <p>{t('editor.brandError')}</p> : !searchActive ? null : !brands.length ? <p>{t('editor.brandLoading')}</p> : <div className="icon-picker-results">
            {brands.filter(brand => `${brand.title} ${brand.slug}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 60).map(brand => <button type="button" key={brand.slug} aria-label={brand.title} aria-pressed={shortcut.iconName === brand.slug} onClick={() => selectIcon('brand', brand.slug, brand)}><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={brand.path} /></svg><span>{brand.title}</span></button>)}
          </div>}
        </div>}
        {selected === 'lucide' && <div className="icon-picker-results">{Object.entries(genericIcons).map(([name, Icon]) => <button type="button" key={name} aria-label={name} aria-pressed={shortcut.iconName === name} onClick={() => selectIcon('lucide', name)}><Icon size={24} aria-hidden="true" /><span>{name}</span></button>)}</div>}
        {selected === 'emoji' && <div className="icon-picker-results">{emojis.map(emoji => <button type="button" key={emoji} aria-label={emoji} aria-pressed={shortcut.iconName === emoji} onClick={() => selectIcon('emoji', emoji)}>{emoji}</button>)}<label className="stack">{t('editor.iconEmoji')}<input value={shortcut.iconName || ''} onChange={event => selectIcon('emoji', event.target.value)} /></label></div>}
        {(selected === 'brand' || selected === 'lucide') && <div className="text-icon-controls"><label>{t('editor.iconColor')}<select value={shortcut.iconColorMode || (selected === 'brand' ? 'brand' : 'accent')} onChange={event => onChange({ ...shortcut, iconColorMode: event.target.value as 'brand' | 'accent' | 'custom' })}>{selected === 'brand' && <option value="brand">{t('editor.colorBrand')}</option>}<option value="accent">{t('editor.colorAccent')}</option><option value="custom">{t('editor.colorCustom')}</option></select></label>{shortcut.iconColorMode === 'custom' && <input aria-label={t('editor.colorCustom')} type="color" value={shortcut.color} onChange={event => onChange({ ...shortcut, color: event.target.value })} />}</div>}
        {selected === 'text' && (
          <div className="text-icon-controls">
            <label className="stack">
              {t('editor.iconText')}
              <input maxLength={2} value={shortcut.icon} placeholder={shortcut.name.slice(0, 1)} onChange={event => changeIcon(event.target.value)} />
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
