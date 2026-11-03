import type { Language } from '../../i18n'

export type SchemaExpectationKey =
  | 'range'
  | 'non-empty'
  | 'grid-track'
  | 'color'
  | 'date'
  | 'asset'
  | 'template'
  | 'url'
  | 'unique-group-id'
  | 'unique-bookmark-id'
  | 'unique-widget-id'
  | 'unique-search-engine-id'
  | 'existing-search-engine-id'
  | 'area-listed'
  | 'lowercase-id'
  | 'gradient-required'
  | 'color-required'
  | 'font'
  | 'invalid-input'
  | 'invalid-option'
  | 'unrecognized-key'
  | 'unknown'

export type SchemaExpectation = { key: SchemaExpectationKey; params?: Record<string, string | number> }
export type LocalizedIssue = { path: string; expected: string; value: string }

type Translation = (params: Record<string, string | number>) => string

export const schemaMessages: Record<Language, Record<SchemaExpectationKey, Translation>> = {
  en: {
    range: p => `${p.kind} ${p.min}-${p.max}`,
    'non-empty': () => 'non-empty string',
    'grid-track': () => 'valid grid track size',
    color: () => '#RRGGBB color',
    date: () => 'valid date',
    asset: () => 'mnt-asset:<64 hex>',
    template: () => 'HTTP(S) URL containing {query}',
    url: () => 'HTTP(S) URL',
    'unique-group-id': () => 'unique group id',
    'unique-bookmark-id': () => 'unique bookmark id across all groups',
    'unique-widget-id': () => 'unique widget id',
    'unique-search-engine-id': () => 'unique search engine id',
    'existing-search-engine-id': () => 'id of an existing search engine',
    'area-listed': p => `area listed in ${p.path}`,
    'lowercase-id': () => 'lowercase id',
    'gradient-required': () => 'gradient required for gradient background',
    'color-required': () => 'color required for color background',
    font: () => 'font key or family name',
    'invalid-input': p => `valid ${p.expected}`,
    'invalid-option': p => `one of ${p.options}`,
    'unrecognized-key': p => `no unknown key (${p.key})`,
    unknown: p => String(p.expected),
  },
  'zh-CN': {
    range: p => `${p.kind === 'integer' ? '整数' : '数字'} ${p.min}-${p.max}`,
    'non-empty': () => '非空字符串',
    'grid-track': () => '有效的网格轨道尺寸',
    color: () => '#RRGGBB 颜色',
    date: () => '有效日期',
    asset: () => 'mnt-asset:<64 位十六进制字符>',
    template: () => '包含 {query} 的 HTTP(S) URL',
    url: () => 'HTTP(S) URL',
    'unique-group-id': () => '唯一的分组 ID',
    'unique-bookmark-id': () => '所有分组中唯一的书签 ID',
    'unique-widget-id': () => '唯一的组件 ID',
    'unique-search-engine-id': () => '唯一的搜索引擎 ID',
    'existing-search-engine-id': () => '已有搜索引擎的 ID',
    'area-listed': p => `${p.path} 中列出的区域`,
    'lowercase-id': () => '小写 ID',
    'gradient-required': () => '渐变背景需要 gradient 字段',
    'color-required': () => '纯色背景需要 color 字段',
    font: () => '字体键或字体族名称',
    'invalid-input': p => `有效的${p.expected}`,
    'invalid-option': p => `${p.options} 之一`,
    'unrecognized-key': p => `不应包含未知字段（${p.key}）`,
    unknown: p => String(p.expected),
  },
}

const exact: Record<string, SchemaExpectation> = {
  'non-empty string': { key: 'non-empty' },
  'valid grid track size': { key: 'grid-track' },
  '#RRGGBB color': { key: 'color' },
  'valid date': { key: 'date' },
  'mnt-asset:<64 hex>': { key: 'asset' },
  'HTTP(S) URL containing {query}': { key: 'template' },
  'HTTP(S) URL': { key: 'url' },
  'unique group id': { key: 'unique-group-id' },
  'unique bookmark id across all groups': { key: 'unique-bookmark-id' },
  'unique widget id': { key: 'unique-widget-id' },
  'unique search engine id': { key: 'unique-search-engine-id' },
  'id of an existing search engine': { key: 'existing-search-engine-id' },
  'lowercase id': { key: 'lowercase-id' },
  'gradient required for gradient background': { key: 'gradient-required' },
  'gradient required when type is "gradient"': { key: 'gradient-required' },
  'color required for color background': { key: 'color-required' },
  'color required when type is "color"': { key: 'color-required' },
  'font key or family name': { key: 'font' },
  'font key (serif, mono, outfit, ...) or a plain family name': { key: 'font' },
}

export function schemaExpectation(expected: string): SchemaExpectation {
  const known = exact[expected]
  if (known) return known
  const range = /^(integer|number) (-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/.exec(expected)
  if (range) return { key: 'range', params: { kind: range[1], min: Number(range[2]), max: Number(range[3]) } }
  const area = /^area listed in (.+)$/.exec(expected)
  if (area) return { key: 'area-listed', params: { path: area[1] } }
  const invalidInput = /^Invalid input: expected (.+), received (.+)$/.exec(expected)
  if (invalidInput) return { key: 'invalid-input', params: { expected: invalidInput[1] } }
  const option = /^Invalid option: expected one of (.+)$/.exec(expected)
  if (option) return { key: 'invalid-option', params: { options: option[1] } }
  const unrecognized = /^Unrecognized key: "(.+)"$/.exec(expected)
  if (unrecognized) return { key: 'unrecognized-key', params: { key: unrecognized[1] } }
  return { key: 'unknown', params: { expected } }
}

export function localizeExpectation(expected: string, language: Language): string {
  const parsed = schemaExpectation(expected)
  return schemaMessages[language][parsed.key](parsed.params ?? {})
}

export function localizeIssue<T extends LocalizedIssue>(issue: T, language: Language): T {
  return { ...issue, expected: localizeExpectation(issue.expected, language) }
}
