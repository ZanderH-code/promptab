import type { Settings } from '../core/model'
import type { Widget } from '../core/schema/profile'
import type { Translate } from '../i18n'

type ProductivityWidget = Extract<Widget, { type: 'todo' | 'note' | 'countdown' }>
type Props = { widget: ProductivityWidget; language: Settings['language']; t: Translate; onChange: (widget: ProductivityWidget) => void }

function TodoWidget({ widget, t, onChange }: Props & { widget: Extract<ProductivityWidget, { type: 'todo' }> }) {
  const items = widget.props.hideCompleted ? widget.props.items.filter(item => !item.done) : widget.props.items
  return <section className="mnt-productivity" aria-label={widget.props.title || t('widgets.todo')}>
    {widget.props.title && <h2>{widget.props.title}</h2>}
    {items.length ? <ul className="mnt-todo-list">{items.map(item => <li key={item.id} className={item.done ? 'is-done' : undefined}>
      <label><input type="checkbox" checked={item.done} aria-label={item.text} onChange={event => onChange({ ...widget, props: { ...widget.props, items: widget.props.items.map(current => current.id === item.id ? { ...current, done: event.target.checked } : current) } })} /><span data-user-content>{item.text}</span></label>
    </li>)}</ul> : <p className="mnt-productivity-empty">{t('widgets.todoEmpty')}</p>}
  </section>
}

function NoteWidget({ widget, t, onChange }: Props & { widget: Extract<ProductivityWidget, { type: 'note' }> }) {
  return <section className="mnt-productivity" aria-label={widget.props.title || t('widgets.note')}>
    {widget.props.title && <h2>{widget.props.title}</h2>}
    <textarea className="mnt-note-content" aria-label={t('widgets.noteContent')} value={widget.props.content} maxLength={10000} onChange={event => onChange({ ...widget, props: { ...widget.props, content: event.target.value } })} />
  </section>
}

function CountdownWidget({ widget, language, t }: Props & { widget: Extract<ProductivityWidget, { type: 'countdown' }> }) {
  const [year, month, day] = widget.props.targetDate.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.ceil((target - today) / 86_400_000)
  const date = new Intl.DateTimeFormat(language === 'en' ? 'en' : 'zh-CN', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(target))
  const countdown = days < 0 ? t('widgets.countdown.past', { days: Math.abs(days) }) : days === 0 ? t('widgets.countdown.today') : t('widgets.countdown.future', { days })
  return <section className="mnt-productivity mnt-countdown" aria-label={widget.props.title}>
    <h2>{widget.props.title}</h2>
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
