import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Settings } from '../core/model'
import type { Widget } from '../core/schema/profile'
import { localDay } from '../core/widgets/defaults'
import type { Translate } from '../i18n'
import { useDraftText } from '../ui/useDraftText'

type ProductivityWidget = Extract<Widget, { type: 'todo' | 'note' | 'countdown' }>
/** Updates are functions of the saved widget, so quick clicks never overwrite each other with a stale copy. */
export type WidgetUpdate = <W extends ProductivityWidget>(id: string, update: (widget: W) => W) => void
type Props = { widget: ProductivityWidget; language: Settings['language']; t: Translate; onChange: WidgetUpdate }
type Todo = Extract<ProductivityWidget, { type: 'todo' }>

function TodoWidget({ widget, t, onChange }: Props & { widget: Todo }) {
  const [draft, setDraft] = useState('')
  // Saving is asynchronous; show a tick or a new task at once instead of waiting for the save to come back.
  const [shown, setShown] = useState<Todo['props']['items'] | null>(null)
  useEffect(() => setShown(null), [widget.props.items])
  const all = shown ?? widget.props.items
  const items = widget.props.hideCompleted ? all.filter(item => !item.done) : all
  const done = all.filter(item => item.done).length
  const title = widget.props.title || t('widgets.todo')
  const update = (change: (current: Todo['props']['items']) => Todo['props']['items']) => {
    setShown(change(all))
    onChange<Todo>(widget.id, current => ({ ...current, props: { ...current.props, items: change(current.props.items) } }))
  }
  const add = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || all.length >= 100) return
    update(items => [...items, { id: crypto.randomUUID(), text, done: false }])
    setDraft('')
  }
  return <section className="mnt-productivity mnt-todo" aria-label={title}>
    <header className="mnt-productivity-heading">
      <h2 data-user-content>{title}</h2>
      {all.length > 0 && <span className="mnt-todo-count" aria-hidden="true">{done}/{all.length}</span>}
    </header>
    {items.length > 0 && <ul className="mnt-todo-list">{items.map(item => <li key={item.id} className={item.done ? 'is-done' : undefined}>
      <label><input type="checkbox" checked={item.done} aria-label={item.text} onChange={event => { const checked = event.target.checked; update(items => items.map(current => current.id === item.id ? { ...current, done: checked } : current)) }} /><span data-user-content>{item.text}</span></label>
      <button type="button" className="mnt-todo-remove" aria-label={t('widgets.todoRemove', { item: item.text })} title={t('widgets.todoRemove', { item: item.text })} onClick={() => update(items => items.filter(current => current.id !== item.id))}><X size={14} aria-hidden="true" /></button>
    </li>)}</ul>}
    <form className="mnt-todo-add" onSubmit={add}>
      <input value={draft} maxLength={500} placeholder={t('widgets.todoAdd')} aria-label={t('widgets.todoAdd')} enterKeyHint="done" onChange={event => setDraft(event.target.value)} disabled={all.length >= 100} />
    </form>
    {done > 0 && <button type="button" className="mnt-todo-clear" onClick={() => update(items => items.filter(item => !item.done))}>{t('widgets.todoClearDone')}</button>}
  </section>
}

function NoteWidget({ widget, t, onChange }: Props & { widget: Extract<ProductivityWidget, { type: 'note' }> }) {
  const title = widget.props.title || t('widgets.note')
  const { flush: _flush, ...draft } = useDraftText(widget.props.content, content => onChange<typeof widget>(widget.id, current => ({ ...current, props: { ...current.props, content } })))
  return <section className="mnt-productivity" aria-label={title}>
    <h2 data-user-content>{title}</h2>
    <textarea className="mnt-note-content" aria-label={t('widgets.noteContent')} placeholder={t('widgets.notePlaceholder')} maxLength={10000} {...draft} />
  </section>
}

/** Today's local date, refreshed just after midnight so a tab left open overnight counts down. */
function useToday() {
  const [today, setToday] = useState(() => localDay())
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
    const timer = window.setTimeout(() => setToday(localDay()), midnight.getTime() - now.getTime())
    return () => window.clearTimeout(timer)
  }, [today])
  return today
}

function CountdownWidget({ widget, language, t }: Props & { widget: Extract<ProductivityWidget, { type: 'countdown' }> }) {
  const today = useToday()
  const utc = (iso: string) => { const [year, month, day] = iso.split('-').map(Number); return Date.UTC(year, month - 1, day) }
  const target = utc(widget.props.targetDate)
  const days = Math.round((target - utc(today)) / 86_400_000)
  const title = widget.props.title || t('widgets.countdown')
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(target))
  const countdown = days === 0 ? t('widgets.countdown.today') : days === 1 ? t('widgets.countdown.tomorrow') : days === -1 ? t('widgets.countdown.yesterday') : days < 0 ? t('widgets.countdown.past', { days: Math.abs(days) }) : t('widgets.countdown.future', { days })
  return <section className="mnt-productivity mnt-countdown" aria-label={title}>
    <h2 data-user-content>{title}</h2>
    <strong>{countdown}</strong>
    {widget.props.format === 'detailed' && <time dateTime={widget.props.targetDate}>{date}</time>}
  </section>
}

export function ProductivityWidgetView(props: Props) {
  switch (props.widget.type) {
    case 'todo': return <TodoWidget {...props} widget={props.widget} />
    case 'note': return <NoteWidget {...props} widget={props.widget} />
    case 'countdown': return <CountdownWidget {...props} widget={props.widget} />
  }
}
