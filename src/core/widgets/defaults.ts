import type { Widget } from '../schema/profile'

export type ProductivityWidgetType = Extract<Widget, { type: 'todo' | 'note' | 'countdown' | 'weather' }>['type']

/** The person's local calendar date as YYYY-MM-DD, optionally shifted by whole days. */
export function localDay(offset = 0, now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

export function createProductivityWidget(type: ProductivityWidgetType, area: string, id: string): Extract<Widget, { type: ProductivityWidgetType }> {
  const common = { id, area, order: 0 }
  switch (type) {
    case 'todo': return { ...common, type, props: { title: '', items: [], hideCompleted: false } }
    case 'note': return { ...common, type, props: { title: '', content: '' } }
    case 'countdown': return { ...common, type, props: { title: '', targetDate: localDay(7), format: 'days' } }
    case 'weather': return { ...common, type, props: { city: '', unit: 'celsius', showForecast: true } }
  }
}
