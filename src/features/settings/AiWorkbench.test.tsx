import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { migrateV1 } from '../../core/migrate/v1'
import { defaults } from '../../core/model'
import { translate, type Language, type MessageKey, type MessageParams } from '../../i18n'
import { AiWorkbench } from './AiWorkbench'
import { resetAiState } from './aiState'
import type { Ctx } from './rows'

const readBlob = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsText(blob)
})

afterEach(() => { cleanup(); resetAiState(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function setup(css: string, language: Language = 'en') {
  const profile = await migrateV1({ ...defaults, shortcuts: [] }, { id: () => 'p', now: () => '2026-01-01T00:00:00.000Z', add: () => Promise.reject(new Error('none')) })
  profile.custom.css = css
  profile.custom.variables = [{ name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'range', min: 0, max: 10, unit: 'px', default: 2 }]
  profile.custom.values = { '--glow': 5 }
  const state = { activeProfileId: profile.meta.id, profiles: { [profile.meta.id]: profile }, preview: null }
  const ctx = { store: { getState: () => state }, s: { ...defaults, language }, t: (key: MessageKey, params?: MessageParams) => translate(language, key, params), mode: 'dark', onError: vi.fn() } as unknown as Ctx
  const create = vi.fn((_blob: Blob) => 'blob:test')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<AiWorkbench ctx={ctx} />)
  return create
}

describe('theme export', () => {
  it('warns about nonempty CSS and retains variables when CSS is excluded', async () => {
    const create = await setup('.clock { color: red }')
    fireEvent.click(screen.getByRole('button', { name: 'Export theme pack' }))
    const dialog = screen.getByRole('dialog', { name: 'Export theme pack' })
    expect(within(dialog).getByText(/custom CSS.*included/i)).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Exclude custom CSS' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Export' }))
    const blob = create.mock.calls[0][0] as Blob
    const text = await readBlob(blob)
    const pack = JSON.parse(text)
    expect(pack).not.toHaveProperty('css')
    expect(pack.variables).toEqual([{ name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'range', min: 0, max: 10, unit: 'px', default: 5 }])
    expect(pack).toHaveProperty('theme')
  })

  it('exports CSS by default and supports cancelling', async () => {
    const create = await setup('.clock { color: red }')
    fireEvent.click(screen.getByRole('button', { name: 'Export theme pack' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(create).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Export theme pack' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Export' }))
    const pack = JSON.parse(await readBlob(create.mock.calls[0][0]))
    expect(pack.css).toBe('.clock { color: red }')
  })

  it('omits the warning for empty CSS and localizes the dialog', async () => {
    await setup('', 'zh-CN')
    fireEvent.click(screen.getByRole('button', { name: '导出主题包' }))
    const dialog = screen.getByRole('dialog', { name: '导出主题包' })
    expect(within(dialog).queryByText(/包含自定义 CSS/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: '不导出自定义 CSS' })).toBeInTheDocument()
  })
})
