import { describe, expect, it } from 'vitest'
import { en } from './en'
import { interpolate, MessageError, systemLanguage, toMessageRef, translate } from './index'
import { zhCN } from './zh-CN'
import { syncMessages } from '../core/syncMessages'
import { weatherMessages } from '../core/weatherMessages'
import { schemaMessages } from '../core/schema/issueMessages'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()

describe('i18n', () => {
  it('fills named placeholders', () => {
    expect(translate('en', 'shortcuts.editNamed', { name: 'GitHub' })).toBe('Edit GitHub')
    expect(translate('zh-CN', 'shortcuts.editNamed', { name: 'GitHub' })).toBe('编辑 GitHub')
  })

  it('keeps placeholders that have no value', () => {
    expect(interpolate('a {query} b {name}', { name: 'x' })).toBe('a {query} b x')
    expect(translate('en', 'settings.searchCustom')).toContain('{query}')
  })

  it('has the same non-empty keys and placeholders in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort())
    for (const key of Object.keys(zhCN) as (keyof typeof zhCN)[]) {
      expect(en[key].trim(), `en.${key}`).not.toBe('')
      expect(zhCN[key].trim(), `zh-CN.${key}`).not.toBe('')
      expect(placeholders(en[key]), key).toEqual(placeholders(zhCN[key]))
    }
  })

  it.each([
    ['sync', syncMessages],
    ['weather', weatherMessages],
    ['schema issues', schemaMessages],
  ] as const)('keeps the %s message table complete and non-empty', (_name, messages) => {
    const englishKeys = Object.keys(messages.en).sort()
    expect(Object.keys(messages['zh-CN']).sort()).toEqual(englishKeys)
    for (const key of englishKeys as (keyof typeof messages.en)[]) {
      const enVal = typeof messages.en[key] === 'function' ? (messages.en[key] as (p: Record<string, string | number>) => string)({}) : messages.en[key]
      const zhVal = typeof messages['zh-CN'][key] === 'function' ? (messages['zh-CN'][key] as (p: Record<string, string | number>) => string)({}) : messages['zh-CN'][key]
      expect(enVal.trim(), `en.${key}`).not.toBe('')
      expect(zhVal.trim(), `zh-CN.${key}`).not.toBe('')
    }
  })

  it('chooses a supported recovery language from system preferences', () => {
    expect(systemLanguage(['zh-Hans-CN'])).toBe('zh-CN')
    expect(systemLanguage(['en-GB', 'zh-CN'])).toBe('en')
    expect(systemLanguage(['fr-FR', 'zh-TW'])).toBe('zh-CN')
    expect(systemLanguage(['fr-FR'])).toBe('en')
  })

  it('stores message keys on errors and falls back for unknown errors', () => {
    const error = new MessageError('error.imageType', { size: 5 })
    expect(toMessageRef(error, 'error.saveWallpaper')).toEqual({ key: 'error.imageType', params: { size: 5 } })
    expect(toMessageRef(new Error('boom'), 'error.saveWallpaper')).toEqual({ key: 'error.saveWallpaper' })
  })
})
