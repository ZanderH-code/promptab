import { describe, expect, it } from 'vitest'
import { createProductivityWidget, localDay } from './defaults'

const ids = { todo: 'todo-1', note: 'note-1', countdown: 'countdown-1', weather: 'weather-1' }

describe('productivity widget defaults', () => {
  it('creates localized safe defaults in the requested area', () => {
    expect(createProductivityWidget('todo', 'overview', ids.todo)).toEqual({ id: ids.todo, type: 'todo', area: 'overview', order: 0, props: { title: '', items: [], hideCompleted: false } })
    expect(createProductivityWidget('note', 'overview', ids.note)).toEqual({ id: ids.note, type: 'note', area: 'overview', order: 0, props: { title: '', content: '' } })
    expect(createProductivityWidget('countdown', 'overview', ids.countdown)).toEqual({ id: ids.countdown, type: 'countdown', area: 'overview', order: 0, props: { title: '', targetDate: localDay(7), format: 'days' } })
    expect(createProductivityWidget('weather', 'overview', ids.weather)).toEqual({ id: ids.weather, type: 'weather', area: 'overview', order: 0, props: { city: '', unit: 'celsius', showForecast: true } })
  })
})

describe('localDay', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // 00:30 local time on 3 March: toISOString() could still say 2 March east of UTC.
    expect(localDay(0, new Date(2027, 2, 3, 0, 30))).toBe('2027-03-03')
    expect(localDay(7, new Date(2027, 1, 25, 23, 59))).toBe('2027-03-04')
  })
})
