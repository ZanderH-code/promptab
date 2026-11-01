import { afterEach, describe, expect, it } from 'vitest'
import { checkSettingsEntry } from './reach'

const RECT = { left: 100, top: 20, width: 90, height: 32 } as DOMRect

const drawer = () => { const element = document.createElement('aside'); element.className = 'drawer'; document.body.append(element); return element }

function mount(html: string, options: { rect?: Partial<DOMRect>; hit?: 'entry' | 'other' | 'drawer' } = {}) {
  document.body.innerHTML = html
  const entry = document.querySelector<HTMLElement>('.mnt-settings-entry')
  if (entry) entry.getBoundingClientRect = () => ({ ...RECT, ...options.rect }) as DOMRect
  const other = document.createElement('div')
  const stack = options.hit === 'other' ? [other, entry] : options.hit === 'drawer' ? [drawer(), entry] : [entry]
  document.elementsFromPoint = () => stack.filter((element): element is HTMLElement => !!element)
}

afterEach(() => { document.body.innerHTML = '' })

describe('checkSettingsEntry', () => {
  const entry = '<header><button class="mnt-settings-entry">Settings</button></header>'

  it('accepts a visible, sized, uncovered entry', () => {
    mount(entry)
    expect(checkSettingsEntry()).toEqual({ ok: true })
  })

  it('reports a missing entry', () => {
    mount('<header></header>')
    expect(checkSettingsEntry()).toEqual({ ok: false, reason: 'missing' })
  })

  it.each([
    ['display: none on the entry', '<header><button class="mnt-settings-entry" style="display:none">S</button></header>'],
    ['display: none on an ancestor', '<header style="display:none"><button class="mnt-settings-entry">S</button></header>'],
    ['visibility: hidden', '<header><button class="mnt-settings-entry" style="visibility:hidden">S</button></header>'],
    ['pointer-events: none', '<header><button class="mnt-settings-entry" style="pointer-events:none">S</button></header>'],
    ['opacity 0', '<header><button class="mnt-settings-entry" style="opacity:0">S</button></header>'],
    ['opacity inherited from an ancestor', '<header style="opacity:0.05"><button class="mnt-settings-entry">S</button></header>'],
  ])('reports hidden: %s', (_name, html) => {
    mount(html)
    expect(checkSettingsEntry()).toEqual({ ok: false, reason: 'hidden' })
  })

  it('reports hidden when the entry has been shrunk away', () => {
    mount(entry, { rect: { width: 1, height: 1 } })
    expect(checkSettingsEntry()).toEqual({ ok: false, reason: 'hidden' })
  })

  it('reports an entry pushed outside the viewport', () => {
    mount(entry, { rect: { left: -5000 } })
    expect(checkSettingsEntry()).toEqual({ ok: false, reason: 'offscreen' })
  })

  it('looks through the drawer and dialogs, which may legitimately sit over the entry', () => {
    mount(entry, { hit: 'drawer' })
    expect(checkSettingsEntry()).toEqual({ ok: true })
  })

  it('reports an entry something else paints over', () => {
    mount(entry, { hit: 'other' })
    expect(checkSettingsEntry()).toEqual({ ok: false, reason: 'covered' })
  })
})
