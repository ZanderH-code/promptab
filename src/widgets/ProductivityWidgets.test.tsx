// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Widget } from '../core/schema/profile'
import { localDay } from '../core/widgets/defaults'
import { translate } from '../i18n'
import { ProductivityWidgetView } from './ProductivityWidgets'

type Productivity = Extract<Widget, { type: 'todo' | 'note' | 'countdown' }>
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)
afterEach(cleanup)

/** Renders a widget and applies each update to the saved copy, like the profile store does. */
function setup(widget: Productivity) {
  let saved = widget
  const onChange = vi.fn((_id: string, update: (current: never) => Productivity) => { saved = update(saved as never) })
  const view = render(<ProductivityWidgetView widget={widget} language="en" t={t} onChange={onChange as never} />)
  return { onChange, saved: () => saved, rerender: () => view.rerender(<ProductivityWidgetView widget={saved} language="en" t={t} onChange={onChange as never} />) }
}

describe('todo widget', () => {
  const todo: Productivity = { id: 'todo', type: 'todo', area: 'overview', order: 0, props: { title: '', items: [{ id: 'a', text: 'Milk', done: false }, { id: 'b', text: 'Mail', done: true }] } }

  it('adds, removes and clears tasks right on the page', () => {
    const view = setup(todo)
    expect(screen.getByRole('heading', { name: 'Todo list' })).toBeInTheDocument()
    const box = screen.getByRole('textbox', { name: 'Add a task' })
    fireEvent.change(box, { target: { value: '  Call Sam  ' } })
    fireEvent.submit(box)
    expect(box).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Call Sam' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete “Milk”' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear completed' }))
    expect(view.saved().type === 'todo' && view.saved().props).toMatchObject({ items: [{ text: 'Call Sam', done: false }] })
  })

  it('ignores an empty task and shows a tick before the save returns', () => {
    const view = setup(todo)
    fireEvent.submit(screen.getByRole('textbox', { name: 'Add a task' }))
    expect(view.onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Milk' }))
    expect(screen.getByRole('checkbox', { name: 'Milk' })).toBeChecked()
  })

  it('applies quick changes to the latest saved list, not a stale copy', () => {
    const view = setup(todo)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Milk' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete “Mail”' }))
    expect(view.saved().type === 'todo' && view.saved().props.items).toEqual([{ id: 'a', text: 'Milk', done: true }])
  })
})

describe('countdown widget', () => {
  const countdown = (offset: number): Productivity => ({ id: 'c', type: 'countdown', area: 'overview', order: 0, props: { title: '', targetDate: localDay(offset), format: 'days' } })

  it('names an untitled countdown and says tomorrow and yesterday in words', () => {
    setup(countdown(1))
    expect(screen.getByRole('heading', { name: 'Countdown' })).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    cleanup()
    setup(countdown(-1))
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    cleanup()
    setup(countdown(10))
    expect(screen.getByText('10 days to go')).toBeInTheDocument()
  })
})

describe('note widget', () => {
  it('invites writing and saves after typing pauses', () => {
    const view = setup({ id: 'n', type: 'note', area: 'overview', order: 0, props: { title: '', content: '' } })
    const box = screen.getByRole('textbox', { name: 'Edit note content' })
    expect(box).toHaveAttribute('placeholder', 'Write something…')
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: 'Stand-up at 3' } })
    fireEvent.blur(box)
    expect(view.saved().type === 'note' && view.saved().props.content).toBe('Stand-up at 3')
  })
})
