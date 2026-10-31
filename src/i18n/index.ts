import { en } from './en'
import { zhCN, type MessageKey } from './zh-CN'

export type { MessageKey }
export type Language = 'zh-CN' | 'en'
export type MessageParams = Record<string, string | number>
export type MessageRef = { key: MessageKey; params?: MessageParams }
export type Translate = (key: MessageKey, params?: MessageParams) => string

const dictionaries: Record<Language, Record<MessageKey, string>> = { 'zh-CN': zhCN, en }

export function interpolate(template: string, params?: MessageParams) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (params && name in params ? String(params[name]) : placeholder))
}

export function translate(language: Language, key: MessageKey, params?: MessageParams) {
  return interpolate(dictionaries[language][key], params)
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
