import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useDraftText } from './useDraftText'

type Common = { value: string; onCommit: (value: string) => void }
type InputProps = Common & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'>
type AreaProps = Common & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'defaultValue'>

/** A text field that saves after the person pauses typing; see `useDraftText`. */
export function DraftText(props: InputProps | AreaProps) {
  const { value, onCommit, multiline, onFocus, onBlur, ...rest } = props
  const { flush: _flush, ...draft } = useDraftText(value, onCommit)
  const events = {
    onFocus: (event: never) => { draft.onFocus(); (onFocus as ((event: never) => void) | undefined)?.(event) },
    onBlur: (event: never) => { draft.onBlur(); (onBlur as ((event: never) => void) | undefined)?.(event) },
  }
  return multiline
    ? <textarea {...rest as TextareaHTMLAttributes<HTMLTextAreaElement>} {...draft} {...events} />
    : <input {...rest as InputHTMLAttributes<HTMLInputElement>} {...draft} {...events} />
}
