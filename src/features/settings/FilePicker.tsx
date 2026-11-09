import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Translate } from '../../i18n'

/**
 * A styled upload control: the native input stays clipped and out of the tab order, while a labelled
 * button opens it. The same files go to the caller, by picking or by dropping them on the control.
 */
export function FilePicker({ t, label, accept, multiple, onFiles }: {
  t: Translate
  label: string
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [names, setNames] = useState<string[]>([])
  const [dragover, setDragover] = useState(false)
  const acceptFiles = (files: File[]) => {
    if (!files.length) return
    setNames(files.map(file => file.name))
    onFiles(files)
  }
  return (
    <div
      className="sd-file" data-dragover={dragover ? 'true' : undefined}
      onDragEnter={event => { event.preventDefault(); setDragover(true) }}
      onDragOver={event => { event.preventDefault(); setDragover(true) }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragover(false) }}
      onDrop={event => { event.preventDefault(); setDragover(false); acceptFiles(Array.from(event.dataTransfer.files)) }}
    >
      <input
        ref={input} className="visually-hidden" type="file" accept={accept} multiple={multiple} tabIndex={-1} aria-hidden="true"
        onChange={event => { acceptFiles(Array.from(event.target.files ?? [])); event.target.value = '' }}
      />
      <button type="button" className="sd-button sd-file-button" onClick={() => input.current?.click()}>
        <Upload size={14} strokeWidth={1.5} aria-hidden="true" />{label}
      </button>
      <span className="sd-file-name" aria-live="polite">{names.length ? names.join(', ') : t('settings.noFile')}</span>
    </div>
  )
}
