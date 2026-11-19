import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { translate, type MessageKey, type MessageParams } from '../../i18n'
import CssCodeMirror from './CssCodeMirror'

const freshT = () => (key: MessageKey, params?: MessageParams) => translate('en', key, params)

describe('CssCodeMirror', () => {
  it('keeps the same editor when only the translate function identity changes', () => {
    const onChange = () => undefined
    const { container, rerender } = render(<CssCodeMirror value=".a{}" onChange={onChange} label="CSS" t={freshT()} language="en" />)
    const editor = container.querySelector('.cm-editor')
    expect(editor).not.toBeNull()
    rerender(<CssCodeMirror value=".a{}" onChange={onChange} label="CSS" t={freshT()} language="en" />)
    expect(container.querySelector('.cm-editor')).toBe(editor)
  })
})
