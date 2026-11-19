import { describe, expect, it } from 'vitest'
import { formatClock, formatDate, formatGreetingTransition, greetingPeriod, ordinalDay } from './formats'

describe('clock and date formatting', () => {
  const date = new Date(2026, 0, 21, 19, 9, 4)
  it('supports selected clock parts, custom separators and spacing', () => {
    expect(formatClock(date, 'en', { hours: true, minutes: true, seconds: true, separator: '·', separatorSpacing: 0 })).toContain('·')
    expect(formatClock(date, 'en', { hours: false, minutes: true })).not.toContain(':')
  })
  it('keeps complete zero-padded time parts in Chinese', () => {
    expect(formatClock(date, 'zh-CN', { hour12: false })).toBe('19:09')
  })
  it('chooses localized greetings by time of day', () => {
    expect(greetingPeriod(4)).toBe('morning')
    expect(greetingPeriod(12)).toBe('afternoon')
    expect(greetingPeriod(18)).toBe('evening')
  })
  it('formats the greeting transition in both languages', () => {
    const evening = new Date(2026, 10, 3, 19)
    expect(formatGreetingTransition(evening, 'en')).toBe("It's a quiet Tuesday evening")
    expect(formatGreetingTransition(evening, 'zh-CN')).toBe('现在是星期二傍晚')
  })
  it('formats English ordinals including teen exceptions', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(day => ordinalDay(day, 'en'))).toEqual(['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','23rd'])
    expect(ordinalDay(21, 'zh-CN')).toBe('21')
  })
  it('formats week numbers with language defaults and explicit week starts', () => {
    const boundary = new Date(2021, 0, 3, 12)
    expect(formatDate(boundary, 'en', { format: 'custom', weekNumber: true, weekStart: 'monday', order: ['weekNumber'] })).toBe('Week 53')
    expect(formatDate(boundary, 'en', { format: 'custom', weekNumber: true, weekStart: 'sunday', order: ['weekNumber'] })).toBe('Week 2')
    expect(formatDate(new Date(2021, 0, 2, 12), 'en', { weekNumber: true, weekStart: 'saturday' })).toContain('Week 2')
    expect(formatDate(new Date(2021, 0, 4, 12), 'en', { format: 'custom', weekNumber: true, weekStart: 'monday', order: ['weekNumber'] })).toBe('Week 1')
    expect(formatDate(boundary, 'zh-CN', { format: 'custom', weekNumber: true, order: ['weekNumber'] })).toBe('第53周')
    expect(formatDate(boundary, 'en', { format: 'custom', weekNumber: true, order: ['weekNumber'] })).toBe('Week 2')
  })
  it('formats selected date parts in the requested order and case', () => {
    const result = formatDate(date, 'en', { format: 'custom', order: ['day', 'month'], ordinal: true, monthStyle: 'short', uppercase: true, separator: '/' })
    expect(result).toMatch(/^21ST\//)
    expect(formatDate(date, 'en', {})).toContain('2026')
  })
})

describe('clock and date tokens', () => {
  it('spells numbers and ordinals in English words', async () => {
    const { numberWords, ordinalWords } = await import('./formats')
    expect([0, 7, 13, 20, 21, 53, 59].map(numberWords)).toEqual(['Zero', 'Seven', 'Thirteen', 'Twenty', 'Twenty-One', 'Fifty-Three', 'Fifty-Nine'])
    expect([1, 2, 3, 5, 8, 9, 10, 12, 20, 21, 22, 30, 31].map(ordinalWords)).toEqual(['First', 'Second', 'Third', 'Fifth', 'Eighth', 'Ninth', 'Tenth', 'Twelfth', 'Twentieth', 'Twenty-First', 'Twenty-Second', 'Thirtieth', 'Thirty-First'])
  })

  it('writes a word clock with separators as their own tokens', async () => {
    const { clockTokens } = await import('./formats')
    const evening = new Date(2021, 7, 10, 18, 53)
    expect(formatClock(evening, 'en', { words: true, hour12: true, separator: ':', separatorSpacing: 0.25 })).toBe('Six : Fifty-Three')
    expect(formatClock(new Date(2021, 7, 10, 7, 5), 'en', { words: true })).toBe('Zero Seven:Zero Five')
    expect(clockTokens(evening, 'en', { hour12: true, pad: false, meridiem: true, separator: ':' }).map(token => [token.kind, token.text])).toEqual([['part', '6'], ['separator', ':'], ['part', '53'], ['part', ' PM']])
    expect(clockTokens(evening, 'zh-CN', { hour12: true, meridiem: true }).at(-1)?.text).toBe(' 下午')
    expect(formatClock(evening, 'en', { separator: '' })).toBe('1853')
  })

  it('writes the day of the month as a word or a word ordinal', async () => {
    const { dateTokens } = await import('./formats')
    const date = new Date(2021, 7, 10, 12)
    expect(formatDate(date, 'en', { format: 'custom', order: ['weekday', 'day', 'month'], dayStyle: 'word', ordinal: true, separator: '/', separatorSpacing: 0.25 })).toBe('Tuesday / Tenth / August')
    expect(formatDate(date, 'en', { format: 'custom', order: ['day', 'month'], dayStyle: 'word', monthStyle: 'short', separator: '/' })).toBe('Ten/Aug')
    expect(dateTokens(date, 'en', { format: 'custom', order: ['day', 'month'], separator: '/' }).map(token => token.kind)).toEqual(['part', 'separator', 'part'])
  })
})
