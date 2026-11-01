import { MessageError } from '../i18n'

export type Shortcut = {
  id: string
  name: string
  url: string
  color: string
  icon: string
  image?: string
  iconMode?: 'auto' | 'text' | 'brand' | 'lucide' | 'emoji'
  iconName?: string
  iconColorMode?: 'brand' | 'accent' | 'custom'
  /** Stable identities for generated built-in labels; absent means literal user content. */
  builtinName?: 'sample-website'
  builtinIcon?: 'sample-website'
  builtinGroup?: 'quick-links'
}

export type Settings = {
  schemaVersion: 1
  language: 'zh-CN' | 'en'
  theme: 'dark' | 'light'
  accent: string
  background: string
  showClock: boolean
  showDate: boolean
  showSearch: boolean
  hour12: boolean
  searchTemplate: string
  shortcuts: Shortcut[]
  columns: number
  iconSize: number
  iconShape: 'circle' | 'rounded' | 'square'
  alignment: 'left' | 'center'
  layout: 'stacked' | 'split'
  reverse: boolean
  wallpaper?: string
  overlay: number
}

export const defaults: Settings = {
  schemaVersion: 1,
  language: 'zh-CN',
  theme: 'dark',
  accent: '#90d5cd',
  background: '#102932',
  showClock: true,
  showDate: true,
  showSearch: true,
  hour12: false,
  searchTemplate: 'https://www.google.com/search?q={query}',
  shortcuts: [{ id: 'example', name: '示例网站', url: 'https://example.com', color: '#90d5cd', icon: '例' }],
  columns: 6,
  iconSize: 72,
  iconShape: 'circle',
  alignment: 'center',
  layout: 'stacked',
  reverse: false,
  overlay: 35,
}

const HEX_COLOR = /^#[\da-f]{6}$/i
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,/
const MAX_WALLPAPER_DATA_URL = 7_000_000
const MAX_ICON_DATA_URL = 700_000

export function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function searchUrl(template: string, input: string) {
  if (!input.trim()) return null
  if (!template.includes('{query}') || !isHttpUrl(template.replaceAll('{query}', 'test'))) {
    throw new MessageError('error.searchTemplate')
  }
  return template.replaceAll('{query}', encodeURIComponent(input.trim()))
}

function isValidWallpaper(value: unknown) {
  return value === undefined || (typeof value === 'string' && IMAGE_DATA_URL.test(value) && value.length <= MAX_WALLPAPER_DATA_URL)
}

function isValidShortcut(shortcut: Shortcut, seenIds: Set<string>) {
  if (!shortcut || typeof shortcut.id !== 'string' || !shortcut.id || seenIds.has(shortcut.id)) return false
  if (typeof shortcut.name !== 'string' || !shortcut.name.trim()) return false
  if (typeof shortcut.icon !== 'string' || !shortcut.icon.trim()) return false
  if (typeof shortcut.color !== 'string' || !HEX_COLOR.test(shortcut.color)) return false
  if (typeof shortcut.url !== 'string' || !isHttpUrl(shortcut.url)) return false
  if (shortcut.iconMode !== undefined && !['auto', 'text', 'brand', 'lucide', 'emoji'].includes(shortcut.iconMode)) return false
  if (shortcut.iconName !== undefined && (typeof shortcut.iconName !== 'string' || shortcut.iconName.length > 100)) return false
  if (shortcut.iconColorMode !== undefined && !['brand', 'accent', 'custom'].includes(shortcut.iconColorMode)) return false
  if (shortcut.builtinName !== undefined && shortcut.builtinName !== 'sample-website') return false
  if (shortcut.builtinIcon !== undefined && shortcut.builtinIcon !== 'sample-website') return false
  if (shortcut.builtinGroup !== undefined && shortcut.builtinGroup !== 'quick-links') return false
  if (shortcut.image !== undefined) {
    return typeof shortcut.image === 'string' && IMAGE_DATA_URL.test(shortcut.image) && shortcut.image.length <= MAX_ICON_DATA_URL
  }
  return true
}

export function validate(value: unknown): Settings {
  const invalid = () => new MessageError('error.settingsInvalid')
  if (!value || typeof value !== 'object') throw invalid()
  const v = { ...defaults, ...value } as Settings
  if (!['zh-CN', 'en'].includes(v.language)) throw invalid()
  if (!['stacked', 'split'].includes(v.layout) || typeof v.reverse !== 'boolean') throw invalid()
  const numbersValid =
    Number.isInteger(v.columns) && v.columns >= 2 && v.columns <= 10 &&
    Number.isInteger(v.iconSize) && v.iconSize >= 40 && v.iconSize <= 120 &&
    typeof v.overlay === 'number' && v.overlay >= 0 && v.overlay <= 80
  if (!numbersValid || !['circle', 'rounded', 'square'].includes(v.iconShape) || !['left', 'center'].includes(v.alignment) || !isValidWallpaper(v.wallpaper)) throw invalid()
  const flags = ['showClock', 'showDate', 'showSearch', 'hour12'] as const
  if (
    v.schemaVersion !== 1 ||
    !['dark', 'light'].includes(v.theme) ||
    !HEX_COLOR.test(v.accent) ||
    !HEX_COLOR.test(v.background) ||
    !flags.every(flag => typeof v[flag] === 'boolean') ||
    typeof v.searchTemplate !== 'string' ||
    !Array.isArray(v.shortcuts)
  ) throw invalid()
  searchUrl(v.searchTemplate, 'test')
  const seenIds = new Set<string>()
  for (const shortcut of v.shortcuts) {
    if (!isValidShortcut(shortcut, seenIds)) throw invalid()
    seenIds.add(shortcut.id)
  }
  return v
}
