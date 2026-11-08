import { describe, expect, it, vi } from 'vitest'
import { aiEn, aiZh } from './ai'
import { en } from './en'
import { interpolate, MessageError, messagesVersion, registerMessages, subscribeMessages, systemLanguage, toMessageRef, translate } from './index'
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

  it('has the same non-empty keys and placeholders in both languages, including the lazy AI set', () => {
    const english: Record<string, string> = { ...en, ...aiEn }
    const chinese: Record<string, string> = { ...zhCN, ...aiZh }
    expect(Object.keys(english).sort()).toEqual(Object.keys(chinese).sort())
    for (const key of Object.keys(chinese)) {
      expect(english[key]!.trim(), `en.${key}`).not.toBe('')
      expect(chinese[key]!.trim(), `zh-CN.${key}`).not.toBe('')
      expect(placeholders(english[key]!), key).toEqual(placeholders(chinese[key]!))
    }
  })

  it('keeps only the startup banner keys in the base dictionaries', () => {
    expect(Object.keys(zhCN).filter(key => key.startsWith('ai.')).sort()).toEqual(
      ['ai.apply', 'ai.compareOriginal', 'ai.discard', 'ai.previewHint', 'ai.previewing'],
    )
    expect(Object.keys(zhCN).filter(key => key.startsWith('gallery.'))).toEqual([])
    expect(Object.keys(aiZh).length).toBeGreaterThan(90)
  })

  it('registers lazily loaded messages and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeMessages(listener)
    const before = messagesVersion()
    registerMessages('en', { 'gallery.open': 'Open gallery' })
    expect(translate('en', 'gallery.open' as never)).toBe('Open gallery')
    expect(messagesVersion()).toBe(before + 1)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    registerMessages('en', { 'gallery.open': 'Open gallery!' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(translate('en', 'gallery.open' as never)).toBe('Open gallery!')
  })

  it('still fails for a key that was never registered', () => {
    expect(() => translate('en', 'no.such.key' as never)).toThrow()
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
