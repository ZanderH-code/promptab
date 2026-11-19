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

export function formatGreetingTransition(date: Date, language: 'en' | 'zh-CN'): string {
  const period = greetingPeriod(date.getHours())
  return translate(language, `greeting.transition.${period}`, { weekday: date.toLocaleDateString(language, { weekday: 'long' }) })
}

export function ordinalDay(day: number, language: string): string {
  if (language !== 'en') return String(day)
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
  return `${day}${suffix}`
}

/** One run of clock or date text: a value part, or a separator between two parts. */
export type TextToken = { kind: 'part' | 'separator'; part?: string; text: string }

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const ORDINAL_WORDS: Record<string, string> = { One: 'First', Two: 'Second', Three: 'Third', Five: 'Fifth', Eight: 'Eighth', Nine: 'Ninth', Twelve: 'Twelfth' }

/** An integer 0-99 in English words, Title Case, hyphenated from 21 ("Fifty-Three"). */
export function numberWords(value: number): string {
  if (value < 20) return ONES[value]
  const tens = TENS[Math.floor(value / 10)], ones = value % 10
  return ones ? `${tens}-${ONES[ones]}` : tens
}

/** An ordinal 1-31 in English words ("Tenth", "Twenty-First"). */
export function ordinalWords(value: number): string {
  const words = numberWords(value)
  const head = words.includes('-') ? words.slice(0, words.lastIndexOf('-') + 1) : ''
  const last = words.slice(head.length)
  const ordinal = ORDINAL_WORDS[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`)
  return head + ordinal
}

/** A clock number in words: minutes (and 24-hour hours) below ten read "Zero Five". */
const clockWords = (value: number, leadingZero: boolean) => leadingZero && value > 0 && value < 10 ? `Zero ${ONES[value]}` : numberWords(value)

function joinTokens(tokens: TextToken[]): string {
  return tokens.map(token => token.text).join('')
}

export function clockTokens(date: Date, language: string, props: ClockProps): TextToken[] {
  const hour12 = props.hour12 ?? false
  const spacing = ' '.repeat(Math.round((props.separatorSpacing ?? 0) * 4))
  const separator = props.separator ?? ':'
  const values: { part: string; text: string }[] = []
  if (props.words) {
    const hours = date.getHours()
    const shown = hour12 ? (hours % 12 || 12) : hours
    if (props.hours !== false) values.push({ part: 'hour', text: clockWords(shown, !hour12) })
    if (props.minutes !== false) values.push({ part: 'minute', text: clockWords(date.getMinutes(), true) })
    if (props.seconds) values.push({ part: 'second', text: clockWords(date.getSeconds(), true) })
  } else {
    const formatted = new Intl.DateTimeFormat(language, { hour: props.pad === false ? 'numeric' : '2-digit', minute: '2-digit', second: '2-digit', hour12 }).formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) => formatted.find(item => item.type === type)?.value ?? ''
    if (props.hours !== false) values.push({ part: 'hour', text: part('hour') })
    if (props.minutes !== false) values.push({ part: 'minute', text: part('minute') })
    if (props.seconds) values.push({ part: 'second', text: part('second') })
  }
  const tokens: TextToken[] = []
  values.forEach((value, index) => {
    if (index > 0) tokens.push({ kind: 'separator', text: `${spacing}${separator}${spacing}` })
    tokens.push({ kind: 'part', ...value })
  })
  if (hour12 && props.meridiem && tokens.length) tokens.push({ kind: 'part', part: 'meridiem', text: language.startsWith('zh') ? ` ${date.getHours() < 12 ? '上午' : '下午'}` : ` ${date.getHours() < 12 ? 'AM' : 'PM'}` })
  return tokens
}

export function formatClock(date: Date, language: string, props: ClockProps): string {
  return joinTokens(clockTokens(date, language, props))
}

export function defaultWeekStart(language: string): 'monday' | 'sunday' {
  return language === 'zh-CN' ? 'monday' : 'sunday'
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

export function dateTokens(date: Date, language: string, props: DateProps): TextToken[] {
  const week = props.weekNumber ? translate(language === 'zh-CN' ? 'zh-CN' : 'en', 'date.weekNumber', { number: weekNumber(date, props.weekStart ?? defaultWeekStart(language)) }) : ''
  if (props.format !== 'custom') {
    return [date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), week].filter(Boolean)
      .flatMap((text, index): TextToken[] => index ? [{ kind: 'separator', text: ' ' }, { kind: 'part', part: 'weekNumber', text }] : [{ kind: 'part', part: 'full', text }])
  }
  const configuredOrder = props.order ?? ['weekday', 'month', 'day', 'year']
  const order = props.weekNumber && !configuredOrder.includes('weekNumber') ? [...configuredOrder, 'weekNumber'] : configuredOrder
  const dayOfMonth = date.getDate()
  const day = props.dayStyle === 'word' ? (props.ordinal ? ordinalWords(dayOfMonth) : numberWords(dayOfMonth)) : props.ordinal ? ordinalDay(dayOfMonth, language) : String(dayOfMonth)
  const values: Record<string, string> = {
    weekday: props.weekday === false ? '' : date.toLocaleDateString(language, { weekday: props.weekdayStyle ?? 'long' }),
    day: props.day === false ? '' : day,
    month: props.month === false ? '' : date.toLocaleDateString(language, { month: props.monthStyle ?? 'long' }),
    year: props.year === false ? '' : String(date.getFullYear()),
    weekNumber: week,
  }
  const spacing = ' '.repeat(Math.round((props.separatorSpacing ?? 0) * 4))
  const separator = `${spacing}${props.separator ?? ' '}${spacing}`
  const upper = (text: string) => props.uppercase ? text.toLocaleUpperCase(language) : text
  return order.filter(part => values[part]).flatMap((part, index): TextToken[] => {
    const token: TextToken = { kind: 'part', part, text: upper(values[part]) }
    return index ? [{ kind: 'separator', text: upper(separator) }, token] : [token]
  })
}

export function formatDate(date: Date, language: string, props: DateProps): string {
  return joinTokens(dateTokens(date, language, props))
}
