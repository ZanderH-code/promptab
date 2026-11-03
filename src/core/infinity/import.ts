import { z } from 'zod'
import type { ProfileV2 } from '../schema/profile'
import { SEARCH_ENGINES } from '../search/engines'
import { MAX_BACKUP_JSON_CHARS } from '../backup-v2'

const infinitySchema = z.object({
  version: z.literal('v2'),
  data: z.object({
    site: z.object({ sites: z.array(z.array(z.unknown())).max(20) }).passthrough(),
  }).passthrough(),
}).passthrough()

const MAX_GROUPS = 100
const MAX_LINKS = 2000
const MAX_NAME = 160
const MAX_URL = 32_768
const FALLBACK_COLOR = '#90d5cd'
const controls = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠⁦-⁩﻿]/g
const token = '__INFINITY_QUERY__'

type RecordValue = Record<string, unknown>
export type InfinityNotice = 'wallpaper' | 'weather' | 'services'
export type InfinitySummary = { groups: number; links: number; engines: number; todos: number; notes: number; skipped: number; notices: InfinityNotice[] }
export type InfinityImportResult = { profile: ProfileV2; summary: InfinitySummary }

const object = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const string = (value: unknown) => typeof value === 'string' ? value : ''

function decodeEntities(value: string): string {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = value
    return textarea.value
  }
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x'
      const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10)
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as Record<string, string>)[entity.toLowerCase()] ?? whole
  })
}

function cleanName(value: unknown, fallback: string): string {
  const clean = decodeEntities(string(value)).replace(controls, '').trim().slice(0, MAX_NAME)
  return clean || fallback
}

function color(value: unknown): string | undefined {
  const raw = string(value).trim()
  const hex = /^#([\da-f]{6})$/i.exec(raw)
  if (hex) return `#${hex[1].toLowerCase()}`
  const shortHex = /^#([\da-f]{3})$/i.exec(raw)
  if (shortHex) return `#${[...shortHex[1]].map(part => part + part).join('').toLowerCase()}`
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.exec(raw)
  if (!rgb) return undefined
  const channels = rgb.slice(1, 4).map(Number)
  if (channels.some(channel => channel > 255)) return undefined
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

function hostname(url: string): string {
  try { return new URL(url).hostname.toLowerCase() } catch { return '' }
}

function safeUrl(value: unknown): string {
  const candidate = string(value).trim()
  if (!candidate || candidate.length > MAX_URL) return ''
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : ''
  } catch { return '' }
}

function templateFor(value: unknown): string {
  let raw = string(value).trim().replaceAll('%s', '{query}')
  if (!raw.includes('{query}')) raw = raw.replace(/([?&]q=)(?=&|$)/i, '$1{query}')
  if ((raw.match(/\{query\}/g) ?? []).length !== 1) return ''
  let parsed: URL
  try { parsed = new URL(raw.replace('{query}', token)) } catch { return '' }
  if (!['http:', 'https:'].includes(parsed.protocol)) return ''
  for (const key of ['isource', 'iname', 'itype']) parsed.searchParams.delete(key)
  if (parsed.hostname.toLowerCase() === 'cn.bing.com') return SEARCH_ENGINES.find(engine => engine.id === 'bing')!.template
  return parsed.toString().replace(token, '{query}')
}

function engineForHost(host: string) {
  if (host === 'cn.bing.com') host = 'www.bing.com'
  return SEARCH_ENGINES.find(engine => engine.host.test(host))
}

function makeLink(value: unknown, index: number, counts: Pick<InfinitySummary, 'links' | 'skipped'>) {
  const item = object(value)
  const url = safeUrl(item.target)
  if (!url || counts.links >= MAX_LINKS) { counts.skipped++; return null }
  let host = ''
  try { host = new URL(url).hostname } catch { /* validated */ }
  const name = cleanName(item.name, host || 'Website')
  const bgType = string(item.bgType)
  const iconText = cleanName(item.bgText, name.slice(0, 1)).slice(0, 8)
  const iconColor = bgType === 'color' ? color(item.bgColor) : undefined
  counts.links++
  return {
    id: `infinity-${index}-${crypto.randomUUID()}`,
    name,
    url,
    color: iconColor ?? FALLBACK_COLOR,
    icon: iconText || name.slice(0, 1) || '•',
    iconMode: bgType === 'color' ? 'text' as const : 'auto' as const,
  }
}

function addGroup(name: string, items: ReturnType<typeof makeLink>[], profile: ProfileV2, summary: InfinitySummary, builtin = false) {
  const links = items.filter((item): item is NonNullable<typeof item> => item !== null)
  if (summary.groups >= MAX_GROUPS) {
    summary.skipped += links.length
    summary.links -= links.length
    return
  }
  if (!builtin && !links.length && items.length === 0) {
    profile.bookmarks.groups.push({ id: `infinity-group-${crypto.randomUUID()}`, name, collapsed: false, items: [] })
    summary.groups++
    return
  }
  if (!links.length) return
  profile.bookmarks.groups.push({ id: `infinity-group-${crypto.randomUUID()}`, name, ...(builtin ? { builtinName: 'quick-links' as const } : {}), collapsed: false, items: links })
  summary.groups++
}

function mapFolder(value: unknown, index: number, profile: ProfileV2, summary: InfinitySummary, depth = 0): void {
  if (depth > 8) { summary.skipped++; return }
  const folder = object(value)
  const children = Array.isArray(folder.children) ? folder.children : []
  const items = children.filter(child => !Array.isArray(object(child).children)).map((child, childIndex) => makeLink(child, index * MAX_LINKS + childIndex, summary))
  const name = cleanName(folder.name, `Folder ${index + 1}`)
  addGroup(name, items, profile, summary)
  for (const [childIndex, child] of children.entries()) if (Array.isArray(object(child).children)) mapFolder(child, index * MAX_GROUPS + childIndex + 1, profile, summary, depth + 1)
}

function importEngines(data: RecordValue, profile: ProfileV2, summary: InfinitySummary): string | undefined {
  const searchEngine = object(object(data.searcher).searchEngine)
  const current = object(searchEngine.current)
  const currentTypes = Array.isArray(current.types) ? current.types.map(object) : []
  const currentRaw = currentTypes.map(item => string(item.url)).find(Boolean) ?? ''
  const currentUrl = safeUrl(currentRaw.replaceAll('{query}', 'test').replace(/([?&]q=)(?=&|$)/i, '$1test'))
  const currentTemplate = templateFor(currentRaw)
  const selectedPreset = engineForHost(hostname(currentUrl ?? ''))
  const used = new Set(profile.search.engines.map(engine => engine.id))
  const importedCustom: ProfileV2['search']['engines'] = []
  const custom = Array.isArray(searchEngine.custom) ? searchEngine.custom.slice(0, 100) : []
  for (const [index, value] of custom.entries()) {
    const entry = object(value)
    const template = templateFor(entry.target)
    if (!template || !string(entry.name).trim()) { summary.skipped++; continue }
    const preset = engineForHost(hostname(template.replace('{query}', 'test')))
    if (preset) continue
    if (profile.search.engines.some(engine => engine.template === template) || importedCustom.some(engine => engine.template === template)) continue
    const base = string(entry.name).trim().slice(0, MAX_NAME)
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'engine'
    let id = `infinity-${slug}-${index + 1}`
    while (used.has(id)) id += '-x'
    used.add(id)
    importedCustom.push({ id, name: base, template, builtinName: 'custom-search' })
  }
  profile.search.engines.push(...importedCustom)
  summary.engines = importedCustom.length
  if (selectedPreset) {
    const existing = profile.search.engines.find(engine => engine.id === selectedPreset.id)
    if (existing) return existing.id
    const engine = { id: selectedPreset.id, name: selectedPreset.name, template: selectedPreset.template }
    profile.search.engines.push(engine)
    return engine.id
  }
  const selectedCustom = importedCustom.find(engine => currentTemplate && engine.template === currentTemplate)
  return selectedCustom?.id
}

function appendWidgets(data: RecordValue, profile: ProfileV2, summary: InfinitySummary): void {
  const areas = profile.layout.areas.flatMap(row => row.trim().split(/\s+/))
  const area = areas.includes('overview') ? 'overview' : areas[0]
  if (!area) return
  const todoData = object(data.todo).todoList
  const todos = Array.isArray(todoData) ? todoData.slice(0, 100).flatMap((value, index) => {
    const entry = object(value)
    const text = cleanName(entry.text ?? entry.name ?? entry.title, '').slice(0, 500)
    return text ? [{ id: `infinity-todo-${index}-${crypto.randomUUID()}`, text, done: entry.done === true }] : []
  }) : []
  if (todos.length) {
    profile.widgets.push({ id: `infinity-todo-${crypto.randomUUID()}`, type: 'todo', area, order: Math.max(-1, ...profile.widgets.map(widget => widget.order)) + 1, props: { title: 'Todo', items: todos } })
    summary.todos = todos.length
  }
  const noteData = object(data.note).list
  const notes = Array.isArray(noteData) ? noteData.slice(0, 50).flatMap(value => {
    const entry = object(value)
    const title = cleanName(entry.title, '')
    const content = cleanName(entry.content, '')
    const text = [title, content].filter(Boolean).join('\n')
    return text ? [text.slice(0, 10_000)] : []
  }) : []
  if (notes.length) {
    profile.widgets.push({ id: `infinity-note-${crypto.randomUUID()}`, type: 'note', area, order: Math.max(-1, ...profile.widgets.map(widget => widget.order)) + 1, props: { title: 'Note', content: notes.join('\n\n').slice(0, 10_000) } })
    summary.notes = notes.length
  }
}

function unsupportedNotices(data: RecordValue): InfinityNotice[] {
  const notices: InfinityNotice[] = []
  const wallpaper = object(data.wallpaper)
  if (string(wallpaper.type) === 'cloud' || string(wallpaper.url).startsWith('http')) notices.push('wallpaper')
  const weather = object(data.weather)
  if (Array.isArray(weather.list) && weather.list.length) notices.push('weather')
  if (['ai', 'gmail', 'notification'].some(key => key in data)) notices.push('services')
  return notices
}

/** Convert an Infinity v2 backup locally; remote image references are never read or fetched. */
export function parseInfinityBackup(json: string, current: ProfileV2): InfinityImportResult {
  if (typeof json !== 'string' || json.length > MAX_BACKUP_JSON_CHARS) throw new Error('Invalid Infinity backup size')
  let raw: unknown
  try { raw = JSON.parse(json) } catch { throw new Error('Invalid Infinity JSON file') }
  const parsed = infinitySchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid Infinity v2 backup structure')
  const root = parsed.data as RecordValue
  const data = object(root.data)
  const pages = object(data.site).sites as unknown[][]
  const profile = structuredClone(current)
  profile.bookmarks.groups = []
  const summary: InfinitySummary = { groups: 0, links: 0, engines: 0, todos: 0, notes: 0, skipped: 0, notices: unsupportedNotices(data) }
  const firstPageItems = pages[0] ?? []
  const topLinks = firstPageItems.filter(item => !Array.isArray(object(item).children)).map((item, index) => makeLink(item, index, summary))
  addGroup('Quick links', topLinks, profile, summary, true)
  let folderIndex = 0
  for (const page of pages) {
    for (const item of page) {
      if (Array.isArray(object(item).children)) mapFolder(item, folderIndex++, profile, summary)
    }
  }
  for (const [pageIndex, page] of pages.entries()) {
    if (pageIndex === 0) continue
    const items = page.filter(item => !Array.isArray(object(item).children)).map((item, index) => makeLink(item, pageIndex * MAX_LINKS + index, summary))
    addGroup(`Page ${pageIndex + 1}`, items, profile, summary)
  }

  const settings = object(object(data.setting).setting)
  const icon = object(settings.icon)
  const layout = object(settings.layout)
  const bookmarks = profile.widgets.find(widget => widget.type === 'bookmarks')
  if (bookmarks) {
    const columns = layout.col
    if (typeof columns === 'number' && Number.isInteger(columns) && columns >= 2 && columns <= 10) bookmarks.props.maxColumns = columns
    if (icon.isHideIconName === true) bookmarks.props.style = 'icon-only'
  }
  if (typeof icon.radius === 'number' && Number.isFinite(icon.radius)) profile.theme.iconShape = icon.radius >= 0.45 ? 'circle' : 'rounded'

  const selectedId = importEngines(data, profile, summary)
  if (selectedId) profile.search.defaultEngineId = selectedId
  appendWidgets(data, profile, summary)
  profile.meta.updatedAt = new Date().toISOString()
  return { profile, summary }
}
