import { en } from './en'
import { zhCN, type MessageKey } from './zh-CN'

export type { MessageKey }
export type Language = 'zh-CN' | 'en'
export type MessageParams = Record<string, string | number>
export type MessageRef = { key: MessageKey; params?: MessageParams }
export type Translate = (key: MessageKey, params?: MessageParams) => string

const dictionaries: Record<Language, Record<string, string>> = { 'zh-CN': zhCN, en }
/** Messages shipped in lazy chunks. Base dictionary entries always win. */
const registered: Record<Language, Record<string, string>> = { 'zh-CN': {}, en: {} }
let version = 0
const listeners = new Set<() => void>()

/** Adds or replaces messages from a lazy chunk and re-renders subscribers. */
export function registerMessages(language: Language, messages: Record<string, string>) {
  Object.assign(registered[language], messages)
  version += 1
  for (const listener of listeners) listener()
}

export function messagesVersion() { return version }

export function subscribeMessages(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function systemLanguage(languages: readonly string[]): Language {
  for (const language of languages) {
    const prefix = language.toLowerCase().split('-')[0]
    if (prefix === 'zh') return 'zh-CN'
    if (prefix === 'en') return 'en'
  }
  return 'en'
}

export function interpolate(template: string, params?: MessageParams) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (params && name in params ? String(params[name]) : placeholder))
}

export function translate(language: Language, key: MessageKey, params?: MessageParams) {
  return interpolate(dictionaries[language][key] ?? registered[language][key], params)
}

/** An error that carries a message key instead of a sentence, so it can be shown in any language. */
export class MessageError extends Error {
  constructor(readonly key: MessageKey, readonly params?: MessageParams) {
    super(key)
  }
}

export function toMessageRef(error: unknown, fallback: MessageKey): MessageRef {
  return error instanceof MessageError ? { key: error.key, params: error.params } : { key: fallback }
}
