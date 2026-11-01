import { describe, expect, it } from 'vitest'
import { formatClock, formatDate, greetingPeriod, ordinalDay } from './formats'

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
  it('formats English ordinals including teen exceptions', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(day => ordinalDay(day, 'en'))).toEqual(['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','23rd'])
    expect(ordinalDay(21, 'zh-CN')).toBe('21')
  })
  it('formats selected date parts in the requested order and case', () => {
    const result = formatDate(date, 'en', { format: 'custom', order: ['day', 'month'], ordinal: true, monthStyle: 'short', uppercase: true, separator: '/' })
    expect(result).toMatch(/^21ST\//)
    expect(formatDate(date, 'en', {})).toContain('2026')
  })
})
