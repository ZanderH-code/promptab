import type { Widget } from '../schema/profile'

export type ProductivityWidgetType = Extract<Widget, { type: 'todo' | 'note' | 'countdown' }>['type']

export function createProductivityWidget(type: ProductivityWidgetType, area: string, id: string): Extract<Widget, { type: ProductivityWidgetType }> {
  const common = { id, area, order: 0 }
  switch (type) {
    case 'todo': return { ...common, type, props: { title: '', items: [], hideCompleted: false } }
    case 'note': return { ...common, type, props: { title: '', content: '' } }
    case 'countdown': return { ...common, type, props: { title: '', targetDate: new Date().toISOString().slice(0, 10), format: 'days' } }
  }
}
