import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { Translate } from '../../i18n'
import { Highlighted } from './searchHighlight'

const HEX = /^#[\da-f]{6}$/i

/** Move a roving-tabindex index for arrow/Home/End keys; returns null for other keys. */
export function rovingIndex(key: string, index: number, count: number, columns = 0): number | null {
  const last = count - 1
  switch (key) {
    case 'ArrowRight': return index === last ? 0 : index + 1
    case 'ArrowLeft': return index === 0 ? last : index - 1
    case 'ArrowDown': return columns ? Math.min(last, index + columns) : index === last ? 0 : index + 1
    case 'ArrowUp': return columns ? Math.max(0, index - columns) : index === 0 ? last : index - 1
    case 'Home': return 0
    case 'End': return last
    default: return null
  }
}

export function Row({ label, hint, children, htmlFor, stack = false }: { label: string; hint?: string; children: ReactNode; htmlFor?: string; stack?: boolean }) {
  return (
    <div className={'sd-row' + (stack ? ' sd-stack' : '')}>
      <div className="sd-label">
        {htmlFor ? <label htmlFor={htmlFor}><Highlighted text={label} /></label> : <span><Highlighted text={label} /></span>}
        {hint && <small><Highlighted text={hint} /></small>}
      </div>
      <div className="sd-control">{children}</div>
    </div>
  )
}

export function Toggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return <Row label={label} htmlFor={id}><input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /></Row>
}

const fill = (value: number, min: number, max: number) => ({ '--fill': `${((value - min) / (max - min)) * 100}%` }) as CSSProperties
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type RangeProps = { label: string; value: number; min: number; max: number; step?: number; unit?: string; t: Translate; hint?: string; onChange: (value: number) => void }

/** Slider paired with a numeric field; typing a value commits on Enter or blur and is clamped to the range. */
export function RangeField({ label, value, min, max, step = 1, unit = '', t, hint, onChange }: RangeProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const [local, setLocal] = useState(value)
  const [text, setText] = useState(String(value))
  const dragging = useRef(false)
  useEffect(() => { if (!dragging.current) { setLocal(value); setText(String(value)) } }, [value])
  const decimals = (String(step).split('.')[1] ?? '').length
  const normalize = (raw: number) => Number(clamp(Math.round(raw / step) * step, min, max).toFixed(decimals))
  const update = (next: number) => { setLocal(next); setText(String(next)); onChange(next) }
  const commit = () => {
    const parsed = Number(text)
    if (text.trim() === '' || !Number.isFinite(parsed)) { setText(String(local)); return }
    const next = normalize(parsed)
    if (next !== local) update(next)
    else setText(String(next))
  }
  const end = () => { dragging.current = false; setLocal(value); setText(String(value)) }
  return (
    <div className="sd-row sd-range">
      <div className="sd-range-head">
        <label className="sd-label" htmlFor={id}><Highlighted text={label} /></label>
        <span className="sd-number">
          <input
            type="number" inputMode="decimal" min={min} max={max} step={step} value={text}
            aria-label={t('settings.valueOf', { label })} aria-describedby={hint ? hintId : undefined}
            onChange={event => setText(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
              if (event.key === 'Enter') { event.preventDefault(); commit() }
              else if (event.key === 'Escape' && text !== String(local)) { event.stopPropagation(); setText(String(local)) }
            }}
          />
          {unit && <span aria-hidden="true">{unit}</span>}
        </span>
        {hint && <small id={hintId} className="sd-range-hint"><Highlighted text={hint} /></small>}
      </div>
      <input
        id={id} className="sd-slider" type="range" min={min} max={max} step={step} value={local} style={fill(local, min, max)}
        aria-valuetext={`${local}${unit}`} aria-describedby={hint ? hintId : undefined}
        onPointerDown={() => { dragging.current = true }}
        onPointerUp={end} onPointerCancel={end} onBlur={end}
        onChange={event => update(normalize(Number(event.target.value)))}
      />
    </div>
  )
}

/** Colour swatch plus an editable hex value. */
export function ColorField({ label, value, t, onChange }: { label: string; value: string; t: Translate; onChange: (value: string) => void }) {
  const id = useId()
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = () => {
    const next = text.trim().startsWith('#') ? text.trim() : `#${text.trim()}`
    if (HEX.test(next)) { if (next.toLowerCase() !== value) onChange(next.toLowerCase()) } else setText(value)
  }
  return (
    <Row label={label} htmlFor={id}>
      <span className="sd-color">
        <input id={id} type="color" value={value} onChange={event => onChange(event.target.value.toLowerCase())} />
        <input
          className="sd-hex" value={text} spellCheck={false} maxLength={7} aria-label={t('settings.hexOf', { label })}
          onChange={event => setText(event.target.value)} onBlur={commit}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit() } }}
        />
      </span>
    </Row>
  )
}

type Option<T extends string> = { value: T; label: string }

/** A short set of mutually exclusive choices (radio group semantics with roving focus). */
export function Segmented<T extends string>({ label, value, options, onChange, columns }: { label: string; value: T; options: Option<T>[]; onChange: (value: T) => void; columns?: number }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = Math.max(0, options.findIndex(option => option.value === value))
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const next = rovingIndex(event.key, index, options.length, columns)
    if (next === null) return
    event.preventDefault()
    refs.current[next]?.focus()
    onChange(options[next].value)
  }
  return (
    <div className={'sd-segmented' + (columns ? ' sd-grid' : '')} role="radiogroup" aria-label={label} style={columns ? { '--sd-cols': columns } as CSSProperties : undefined}>
      {options.map((option, index) => (
        <button
          key={option.value} type="button" role="radio" aria-checked={option.value === value} tabIndex={index === selected ? 0 : -1}
          ref={node => { refs.current[index] = node }} onClick={() => onChange(option.value)} onKeyDown={event => onKeyDown(event, index)}
        ><Highlighted text={option.label} /></button>
      ))}
    </div>
  )
}
