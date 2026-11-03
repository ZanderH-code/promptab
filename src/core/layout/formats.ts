import type { ProfileV2 } from '../schema/profile'
import { translate } from '../../i18n'

type ClockProps = Extract<ProfileV2['widgets'][number], { type: 'clock' }>['props']
type DateProps = Extract<ProfileV2['widgets'][number], { type: 'date' }>['props']

export const GREETING_BOUNDARIES = { afternoon: 12, evening: 18 } as const

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening'

export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour < GREETING_BOUNDARIES.afternoon) return 'morning'
  if (hour < GREETING_BOUNDARIES.evening) return 'afternoon'
  return 'evening'
}

export function ordinalDay(day: number, language: string): string {
  if (language !== 'en') return String(day)
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
  return `${day}${suffix}`
}

export function formatClock(date: Date, language: string, props: ClockProps): string {
  const parts: string[] = []
  const formatted = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: props.hour12 ?? false }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => formatted.find(item => item.type === type)?.value ?? ''
  if (props.hours !== false) parts.push(part('hour'))
  if (props.minutes !== false) parts.push(part('minute'))
  if (props.seconds) parts.push(part('second'))
  const separator = props.separator ?? ':'
  const spacing = props.separatorSpacing ?? 0
  return parts.join(`${' '.repeat(Math.round(spacing * 4))}${separator}${' '.repeat(Math.round(spacing * 4))}`)
}

export function weekNumber(date: Date, start: 'monday' | 'sunday' | 'saturday'): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  if (start === 'monday') {
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
    const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1)
    return Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7)
  }
  const first = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  const offset = (first.getUTCDay() - (start === 'sunday' ? 0 : 6) + 7) % 7
  return Math.floor(((day.getTime() - first.getTime()) / 86400000 + offset) / 7) + 1
}

export function formatDate(date: Date, language: string, props: DateProps): string {
  const week = props.weekNumber ? translate(language === 'zh-CN' ? 'zh-CN' : 'en', 'date.weekNumber', { number: weekNumber(date, props.weekStart ?? (language === 'zh-CN' ? 'monday' : 'sunday')) }) : ''
  if (props.format !== 'custom') return [date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), week].filter(Boolean).join(' ')
  const configuredOrder = props.order ?? ['weekday', 'month', 'day', 'year']
  const order = props.weekNumber && !configuredOrder.includes('weekNumber') ? [...configuredOrder, 'weekNumber'] : configuredOrder
  const values: Record<string, string> = {
    weekday: props.weekday === false ? '' : date.toLocaleDateString(language, { weekday: props.weekdayStyle ?? 'long' }),
    day: props.day === false ? '' : props.ordinal ? ordinalDay(date.getDate(), language) : String(date.getDate()),
    month: props.month === false ? '' : date.toLocaleDateString(language, { month: props.monthStyle ?? 'long' }),
    year: props.year === false ? '' : String(date.getFullYear()),
    weekNumber: week,
  }
  const text = order.map(part => values[part]).filter(Boolean).join(`${' '.repeat(Math.round((props.separatorSpacing ?? 0) * 4))}${props.separator ?? ' '}${' '.repeat(Math.round((props.separatorSpacing ?? 0) * 4))}`)
  return props.uppercase ? text.toLocaleUpperCase(language) : text
}
