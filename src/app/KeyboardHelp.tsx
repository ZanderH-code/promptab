import { useEffect, useRef } from 'react'
import type { Translate } from '../i18n'

const shortcuts = [
  ['E', 'keyboard.edit'], ['A', 'keyboard.add'], [',', 'keyboard.settings'],
  ['D', 'keyboard.theme'], ['/', 'keyboard.search'], ['?', 'keyboard.help'],
] as const

export function KeyboardHelp({ t, onClose }: { t: Translate; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])

  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal keyboard-help" role="dialog" aria-modal="true" aria-labelledby="keyboard-help-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      else if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus() }
    }}>
      <h2 id="keyboard-help-title">{t('keyboard.helpTitle')}</h2>
      <ul className="keyboard-help-list">{shortcuts.map(([key, label]) => <li key={label}><kbd>{key}</kbd><span>{t(label)}</span></li>)}</ul>
      <div className="keyboard-help-actions"><button ref={closeButton} type="button" className="sd-button" onClick={onClose}>{t('common.close')}</button></div>
    </div>
  </div>
}
