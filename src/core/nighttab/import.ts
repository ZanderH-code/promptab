import type { ProfileV2, Widget } from '../schema/profile'
import { isHttpUrl } from '../model'
import { SEARCH_ENGINES } from '../search/engines'
import { RANGES } from '../schema/defaults'
import { MAX_BACKUP_JSON_CHARS } from '../backup-v2'
import { primaryRamp, rgbHex, type Ramp } from './palette'
import { own } from '../own'
import { clipText, firstChar } from '../text'
import { nightTabLook } from './look'
import { FONT_AWESOME } from './fontAwesome'

export type NightTabResult = { profile: ProfileV2; warnings: string[]; count: number }
type AnyRecord = Record<string, unknown>
type Link = ProfileV2['bookmarks']['groups'][number]['items'][number]
type Group = ProfileV2['bookmarks']['groups'][number]
type Tile = NonNullable<Link['tile']>
const record = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const hex = (value: unknown) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : undefined
const first = (...values: unknown[]) => values.find(value => value !== undefined && value !== null && value !== '')
const bool = (value: unknown) => typeof value === 'boolean' ? value : undefined
const shown = (value: unknown) => bool(record(value).show)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places

function colorOf(value: unknown): string | undefined {
  const raw = text(value)
  if (hex(raw)) return raw
  if (/^[\da-f]{6}$/i.test(raw)) return `#${raw}`
  return undefined
}

function groupsOf(root: AnyRecord): AnyRecord[] {
  const candidates = first(root.bookmark, root.groups, record(root.bookmarks).groups, record(root.data).groups)
  return Array.isArray(candidates) ? candidates.map(record) : []
}

function bookmarkItems(group: AnyRecord): AnyRecord[] {
  const candidates = first(group.items, group.bookmarks, group.links, group.children)
  return Array.isArray(candidates) ? candidates.map(record) : []
}

function rgbColor(value: unknown): string | undefined {
  const rgb = record(value)
  const channels = ['r', 'g', 'b'].map(key => rgb[key])
  if (channels.some(channel => typeof channel !== 'number' || !Number.isFinite(channel) || channel < 0 || channel > 255)) return undefined
  return rgbHex({ r: channels[0] as number, g: channels[1] as number, b: channels[2] as number })
}

/** A nightTab colour object (`{ by, rgb }`) or a plain hex string; `by: 'theme'` means "no own colour". */
function customColor(value: unknown): string | undefined {
  const data = record(value)
  if (data.by === 'theme') return undefined
  return colorOf(first(rgbColor(data.rgb), data.rgb, typeof value === 'string' ? value : undefined))
}

/**
 * nightTab icons are Font Awesome names. The few with a built-in generic equivalent keep an icon; brand icons
 * (`fab`) and everything else fall back to the automatic website icon, which resolves brands and favicons.
 */
const FONT_AWESOME_GENERIC: Record<string, string> = {
  home: 'house', house: 'house', globe: 'globe', 'globe-americas': 'globe', 'globe-europe': 'globe', 'globe-asia': 'globe', search: 'search', 'magnifying-glass': 'search',
  envelope: 'mail', 'envelope-open': 'mail', star: 'star', heart: 'heart', book: 'book-open', 'book-open': 'book-open', briefcase: 'briefcase', camera: 'camera',
  cloud: 'cloud', code: 'code', gamepad: 'gamepad-2', music: 'music', 'shopping-bag': 'shopping-bag', 'shopping-cart': 'shopping-bag', 'cart-shopping': 'shopping-bag', video: 'video', film: 'video',
}

type Visual = { mode: 'text'; icon: string } | { mode: 'lucide'; iconName: string } | { mode: 'auto'; image?: string } | { mode: 'fa'; name: string; title: string; width: number; path: string }

function displayVisual(item: AnyRecord): Visual | undefined {
  const visual = record(record(item.display).visual)
  const type = text(visual.type)
  if (type === 'letter') return { mode: 'text', icon: text(record(visual.letter).text) }
  if (type === 'icon') {
    const icon = record(visual.icon)
    const name = text(icon.name).replace(/^fa-/, '')
    const glyph = FONT_AWESOME[`${text(icon.prefix) === 'fab' ? 'fab' : 'fas'} ${name}`]
    if (glyph) return { mode: 'fa', name, title: (text(icon.label) || name).slice(0, 100), width: glyph[0], path: glyph[1] }
    const generic = text(icon.prefix) === 'fab' ? undefined : own(FONT_AWESOME_GENERIC, name)
    return generic ? { mode: 'lucide', iconName: generic } : { mode: 'auto' }
  }
  if (type === 'image') return { mode: 'auto', image: text(record(visual.image).url) }
  return undefined
}

function bookmarkUrl(item: AnyRecord): string {
  const candidate = text(first(item.url, item.href, item.address))
  return isHttpUrl(candidate) ? candidate : ''
}

/**
 * A nightTab font name as a font stack with nightTab's own fallbacks; the font itself must be on this computer or
 * uploaded. Only characters a plain family list may hold are kept (no quotes, escapes, brackets or line breaks),
 * so the stack is never dropped when the theme is applied.
 */
const fontStack = (name: string, fallback: string) => {
  const family = name.replace(/[^\p{L}\p{N} ._-]+/gu, ' ').replace(/\s+/g, ' ').trim()
  return `${family ? `"${family}", ` : ''}"${fallback}", sans-serif`
}

const ALIGNMENTS = ['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const
type Alignment = typeof ALIGNMENTS[number]
const alignment = (value: unknown): Alignment | undefined => ALIGNMENTS.find(candidate => candidate === value)

/** The per-website look nightTab stores on each bookmark. Only values that differ from a plain block are kept. */
function tileOf(item: AnyRecord, warnings: string[], name: string): Tile | undefined {
  const display = record(item.display)
  const tile: Tile = {}
  const shape = record(item.shape)
  if (shape.wide === true && shape.tall === true) tile.span = 'large'
  else if (shape.wide === true) tile.span = 'wide'
  else if (shape.tall === true) tile.span = 'tall'
  const accent = customColor(item.accent)
  if (accent) tile.accent = accent
  const color = record(item.color)
  const plate = customColor(color)
  if (plate) tile.background = plate
  const opacity = number(color.opacity)
  if (opacity !== undefined && opacity !== 100) tile.opacity = clamp(opacity, 0, 100)
  const border = number(item.border)
  if (border) tile.border = clamp(border * 4, 0, 16)
  const align = alignment(display.alignment)
  if (align && align !== 'center-center') tile.align = align
  if (display.direction === 'horizontal') tile.direction = 'horizontal'
  if (display.order === 'name-visual') tile.nameFirst = true
  if (record(display.name).show === false) tile.hideName = true
  if (record(display.visual).show === false) tile.hideIcon = true
  const gap = number(display.gutter)
  if (gap !== undefined && gap !== 25) tile.gap = clamp(round(gap * 0.025, 3), 0, 5)
  const visualSize = number(record(display.visual).size)
  if (visualSize !== undefined && visualSize !== 25) tile.iconScale = clamp(round(visualSize / 25, 3), 0.25, 8)
  const nameSize = number(record(display.name).size)
  if (nameSize !== undefined && nameSize !== 7) tile.nameScale = clamp(round(nameSize / 7, 3), 0.25, 4)
  const rotate = number(display.rotate)
  if (rotate) tile.rotate = clamp(rotate, -360, 360)
  const translate = record(display.translate)
  const x = number(translate.x), y = number(translate.y)
  if (x) tile.offsetX = clamp(round(x / 10, 3), -20, 20)
  if (y) tile.offsetY = clamp(round(y / 10, 3), -20, 20)
  const background = record(item.background)
  if (background.show === true) {
    const url = text(record(background[text(background.type) === 'video' ? 'video' : 'image']).url)
    tile.imageOpacity = clamp(number(background.opacity) ?? 100, 0, 100)
    if (url) warnings.push(`Website "${name}" has a background image at ${url}. Save that file, then choose it in the website's editor under Tile image.`)
  }
  return Object.keys(tile).length ? tile : undefined
}

function importBookmarks(root: AnyRecord, profile: ProfileV2, warnings: string[]): number {
  const groups = groupsOf(root)
  if (!groups.length) warnings.push('No bookmark groups were found')
  const seen = new Set(profile.bookmarks.groups.flatMap(group => group.items.map(item => item.url)))
  const imported = groups.flatMap((group, groupIndex): Group[] => {
    const items = bookmarkItems(group).flatMap((item, index): Link[] => {
      const url = bookmarkUrl(item)
      const display = record(item.display)
      const name = text(first(record(display.name).text, item.name, item.title, item.label))
      if (!url || !name || seen.has(url)) return []
      seen.add(url)
      const visual = displayVisual(item)
      const tile = tileOf(item, warnings, name)
      const color = customColor(item.color) ?? customColor(item.accent) ?? colorOf(first(record(item.style).color)) ?? profile.theme.color.accent
      if (visual?.mode === 'auto' && visual.image) warnings.push(`Website "${name}" uses the icon image ${visual.image}. Save that file, then choose it in the website's editor under Icon → Image.`)
      const letter = (visual?.mode === 'text' ? visual.icon : '') || text(first(item.letter, typeof item.icon === 'string' ? item.icon : undefined, item.text)) || firstChar(name).toUpperCase()
      const id = `nighttab-${groupIndex}-${index}-${crypto.randomUUID()}`
      const base = { id, name, url, color, icon: clipText(letter, 8), ...(tile ? { tile } : {}) }
      if (visual?.mode === 'fa') return [{ ...base, iconMode: 'brand', iconName: `fa-${visual.name}`, iconColorMode: 'accent', brand: { slug: `fa-${visual.name}`, title: visual.title, path: visual.path, hex: '000000', viewBox: `0 0 ${visual.width} 512` } }]
      if (visual?.mode === 'lucide') return [{ ...base, iconMode: 'lucide', iconName: visual.iconName }]
      if (visual?.mode === 'auto') return [{ ...base, iconMode: 'auto' }]
      return [{ ...base, iconMode: 'text' }]
    })
    if (!items.length) return []
    const title = record(group.name)
    const name = text(first(title.text, group.name, group.title, group.label)) || `Group ${groupIndex + 1}`
    const openAll = first(shown(record(group.toolbar).openAll), shown(group.openAll))
    return [{
      id: `nighttab-group-${groupIndex}-${crypto.randomUUID()}`, name, collapsed: typeof group.collapse === 'boolean' && title.show !== false ? group.collapse : false, items,
      ...(title.show === false ? { showName: false } : title.show === true ? { showName: true } : {}),
      ...(typeof openAll === 'boolean' ? { openAll } : {}),
    }]
  })
  // An empty or sample-only group would show as an extra heading above the imported websites.
  const kept = profile.bookmarks.groups.filter(group => group.items.some(item => !item.builtinName))
  profile.bookmarks.groups = [...imported, ...kept]
  return imported.reduce((sum, group) => sum + group.items.length, 0)
}

type Patchable<T extends Widget['type']> = Extract<Widget, { type: T }>

function clockProps(clock: AnyRecord): Patchable<'clock'>['props'] {
  const hours = shown(clock.hour), minutes = shown(clock.minute), seconds = shown(clock.second)
  const hour24 = shown(clock.hour24) !== false
  const separator = record(clock.separator)
  const words = ['hour', 'minute', 'second'].some(part => record(clock[part]).display === 'word')
  return {
    hours: hours !== false, minutes: minutes !== false, seconds: seconds === true,
    hour12: !hour24, pad: hour24, ...(words ? { words: true } : {}),
    ...(!hour24 && shown(clock.meridiem) ? { meridiem: true } : {}),
    separator: separator.show === false ? '' : (text(separator.text) || ':').slice(0, 8), separatorSpacing: 0, separatorAccent: true,
  }
}

function dateProps(date: AnyRecord, warnings: string[]): Patchable<'date'>['props'] {
  const day = record(date.day), dayOfMonth = record(date.date), month = record(date.month), year = record(date.year), separator = record(date.separator)
  const weekStart = day.weekStart === 'monday' || day.weekStart === 'sunday' ? day.weekStart : undefined
  if (year.display === 'word') warnings.push('The year shown in words was imported as a number')
  return {
    format: 'custom',
    weekday: day.show !== false, day: dayOfMonth.show !== false, month: month.show !== false, year: year.show === true,
    weekdayStyle: day.length === 'short' ? 'short' : 'long',
    monthStyle: month.display === 'number' ? 'numeric' : month.length === 'short' ? 'short' : 'long',
    ...(dayOfMonth.display === 'word' ? { dayStyle: 'word' as const } : {}),
    ordinal: dayOfMonth.ordinal === true,
    ...(weekStart ? { weekStart } : {}),
    order: date.format === 'month-date' ? ['weekday', 'month', 'day', 'year'] : ['weekday', 'day', 'month', 'year'],
    separator: separator.show === false ? '' : (text(separator.text) || '/').slice(0, 8), separatorSpacing: 0, separatorAccent: true,
  }
}

const NIGHTTAB_ENGINES: Record<string, { name: string; template: string }> = {
  youtube: { name: 'YouTube', template: 'https://www.youtube.com/results?search_query={query}' },
  giphy: { name: 'Giphy', template: 'https://giphy.com/search/{query}' },
}

function searchEngine(search: AnyRecord): { id: string; name: string; template: string } | undefined {
  const engine = record(search.engine)
  const selected = text(engine.selected)
  const builtin = SEARCH_ENGINES.find(candidate => candidate.id === selected)
  if (builtin) return { id: builtin.id, name: builtin.name, template: builtin.template }
  const known = own(NIGHTTAB_ENGINES, selected)
  if (known) return { id: `nighttab-${selected}`, ...known }
  if (selected !== 'custom') return undefined
  const custom = record(engine.custom)
  const url = text(custom.url), query = text(custom.queryName)
  if (!url) return undefined
  const template = url.includes('{query}') ? url : query ? `${url}${url.includes('?') ? '&' : '?'}${encodeURIComponent(query)}={query}` : `${url}{query}`
  if (!isHttpUrl(template.replaceAll('{query}', 'test'))) return undefined
  return { id: 'nighttab-custom', name: text(custom.name) || 'nightTab search', template }
}

function importSearchEngine(search: AnyRecord, profile: ProfileV2, warnings: string[]) {
  const newTab = bool(search.newTab)
  if (newTab !== undefined) profile.prefs.openSearchInNewTab = newTab
  const engine = searchEngine(search)
  if (engine) {
    const existing = profile.search.engines.find(candidate => candidate.id === engine.id || candidate.template === engine.template)
    if (existing) profile.search.defaultEngineId = existing.id
    else {
      profile.search.engines.push(engine)
      profile.search.defaultEngineId = engine.id
    }
  } else if (text(record(search.engine).selected)) warnings.push('The search engine could not be imported')
}

const HEADER_ITEMS = ['greeting', 'transitional', 'clock', 'date', 'search', 'toolbar'] as const
const KEPT_TYPES = new Set<Widget['type']>(['todo', 'note', 'countdown', 'weather', 'text', 'spacer'])

/** Rebuilds the widgets as nightTab lays them out: header items in their order in one area, the websites in another. */
function importWidgets(state: AnyRecord, profile: ProfileV2, warnings: string[]): { header: boolean; bookmarks: boolean } {
  const header = record(state.header), toolbar = record(state.toolbar), bookmark = record(state.bookmark)
  const rawOrder = Array.isArray(header.order) ? header.order.filter((item): item is string => typeof item === 'string') : ['clock', 'date', 'search', 'toolbar']
  const corner = toolbar.location === 'corner'
  const order = rawOrder.filter(item => (HEADER_ITEMS as readonly string[]).includes(item) && !(corner && item === 'toolbar'))
  const showsItem = (item: string) => {
    const value = record(header[item])
    if (item === 'clock') return ['hour', 'minute', 'second'].some(part => shown(value[part]) === true)
    if (item === 'date') return ['day', 'date', 'month', 'year'].some(part => shown(value[part]) === true)
    if (item === 'toolbar') return true
    return value.show === true
  }
  const visible = order.filter(showsItem)
  const bookmarksShown = bookmark.show !== false
  const hasHeader = visible.length > 0
  const headerArea = hasHeader || !bookmarksShown ? 'header' : 'bookmarks'
  const bookmarkArea = bookmarksShown || !hasHeader ? 'bookmarks' : 'header'
  const widgets: Widget[] = []
  // nightTab sizes are percentages; Promptab sizes are each widget's zoom. A corner toolbar sits outside the
  // layout, so Interface scale (nightTab's overall size) does not reach it and is folded into its own size.
  const sized = (...percents: unknown[]) => {
    const size = clamp(round(percents.reduce<number>((total, percent) => total * (number(percent) ?? 100) / 100, 1), 3), RANGES.widgetSize.min, RANGES.widgetSize.max)
    return size === 1 ? {} : { size }
  }
  const at = (item: string) => { const index = visible.indexOf(item); return index < 0 ? 50 + HEADER_ITEMS.indexOf(item as typeof HEADER_ITEMS[number]) : index }

  widgets.push({ id: 'clock', type: 'clock', area: headerArea, order: at('clock'), hidden: !visible.includes('clock'), props: { ...clockProps(record(header.clock)), ...sized(record(header.clock).size) } })
  widgets.push({ id: 'date', type: 'date', area: headerArea, order: at('date'), hidden: !visible.includes('date'), props: { ...dateProps(record(header.date), warnings), ...sized(record(header.date).size) } })
  const greeting = record(header.greeting), name = text(greeting.name).slice(0, 60)
  const greets = visible.includes('greeting'), transitional = visible.includes('transitional')
  if (greets && text(greeting.type) !== 'good') warnings.push('The greeting wording was imported as "Good morning/afternoon/evening"')
  widgets.push({ id: 'greeting', type: 'greeting', area: headerArea, order: Math.min(at('greeting'), at('transitional')), hidden: !(greets || transitional), props: { ...(name ? { name } : {}), ...(transitional ? { transitional: true } : {}), ...sized(record(header[greets ? 'greeting' : 'transitional']).size) } })
  const search = record(header.search)
  importSearchEngine(search, profile, warnings)
  widgets.push({ id: 'search', type: 'search', area: headerArea, order: at('search'), hidden: !visible.includes('search'), props: { namePlaceholder: true, ...(bookmarksShown ? { findBookmarks: true } : {}), ...sized(search.size) } })
  const actions: ('accent' | 'add' | 'edit' | 'settings')[] = [
    ...(shown(toolbar.accent) === true ? ['accent' as const] : []), ...(shown(toolbar.add) === true ? ['add' as const] : []), ...(shown(toolbar.edit) === true ? ['edit' as const] : []), 'settings',
  ]
  const position = text(toolbar.position)
  const cornerPosition = (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).find(value => value === position) ?? 'bottom-right'
  widgets.push({ id: 'toolbar', type: 'toolbar', area: headerArea, order: at('toolbar'), hidden: !corner && !visible.includes('toolbar'), props: { actions, style: 'buttons', ...(corner ? { corner: cornerPosition } : {}), ...(corner ? sized(toolbar.size, record(state.layout).size) : sized(toolbar.size)) } })
  widgets.push({
    id: 'bookmarks', type: 'bookmarks', area: bookmarkArea, order: 100, hidden: !bookmarksShown,
    props: { style: 'block', showUrl: shown(bookmark.url) !== false, showAdd: false, showGroupTitles: true, groupDisplay: 'sections', openAll: true, iconColor: 'accent', ...sized(bookmark.size) },
  })
  const taken = new Set(widgets.map(widget => widget.id))
  const kept = profile.widgets.filter(widget => KEPT_TYPES.has(widget.type) && !taken.has(widget.id)).map((widget, index) => ({ ...widget, area: bookmarkArea, order: 200 + index, hidden: true }))
  if (kept.length) warnings.push(`${kept.length} Promptab widgets nightTab does not have were hidden; show them again under Widgets`)
  profile.widgets = [...widgets, ...kept]
  return { header: hasHeader, bookmarks: bookmarksShown }
}

function importLayout(state: AnyRecord, profile: ProfileV2, parts: { header: boolean; bookmarks: boolean }) {
  const layout = record(state.layout)
  const align = alignment(layout.alignment)
  if (align) profile.layout.align = align
  const horizontal = layout.direction === 'horizontal'
  const reversed = layout.order === 'bookmark-header'
  const names = parts.header && parts.bookmarks ? (reversed ? ['bookmarks', 'header'] : ['header', 'bookmarks']) : [parts.header || !parts.bookmarks ? 'header' : 'bookmarks']
  profile.layout.areas = horizontal && names.length === 2 ? [names.join(' ')] : names
  profile.layout.columns = undefined
  profile.layout.rows = undefined
  profile.layout.breakpoints = horizontal && names.length === 2 ? { narrow: { areas: names }, medium: { areas: names } } : undefined
  profile.layout.areaStyles = undefined
  profile.layout.gap = 0
  // The look sizes the layout as nightTab's share of the window; Content width only caps it, so it starts at its widest.
  profile.layout.contentWidth = RANGES.contentWidth.max
  profile.theme.scale = clamp(round((number(layout.size) ?? 100) / 100, 2), RANGES.scale.min, RANGES.scale.max)
  const title = text(layout.title).slice(0, 80)
  profile.prefs.pageTitle = title || undefined
}

function importBookmarkPrefs(bookmark: AnyRecord, profile: ProfileV2) {
  const newTab = bool(bookmark.newTab)
  if (newTab !== undefined) profile.prefs.openShortcutsInNewTab = newTab
  // The nightTab hover (scale and shadow) comes with the generated CSS.
  profile.prefs.liftOnHover = false
}

/** The theme's shade ramp for one style; `ramp.shade(1)` is the page. */
export function rampOf(theme: AnyRecord, light: boolean): Ramp {
  const color = record(theme.color), primary = record(record(color.range).primary), contrast = record(color.contrast)
  return primaryRamp(number(primary.h) ?? 222, number(primary.s) ?? 14, number(contrast.start) ?? 8, number(contrast.end) ?? 88, number(color.shades) ?? 14, light)
}

function importTheme(theme: AnyRecord, profile: ProfileV2, warnings: string[]) {
  const accentState = record(theme.accent)
  const accent = customColor(accentState) ?? colorOf(first(theme.accentColor)) ?? profile.theme.color.accent
  profile.prefs.accentOnOpen = record(accentState.cycle).active === true ? 'cycle' : record(accentState.random).active === true ? 'random' : 'off'
  const mode = text(theme.style)
  const style = mode === 'light' || mode === 'system' ? mode : 'dark'
  const dark = rampOf(theme, false), light = rampOf(theme, true)
  const { preset: _preset, ...rest } = profile.theme
  profile.theme = {
    ...rest, mode: style,
    color: { bg: dark.shade(1), surface: dark.shade(2), text: dark.text(1), accent },
    colorLight: { bg: light.shade(1), surface: light.shade(2), text: light.text(1), accent },
  }
  const radius = number(theme.radius)
  if (radius !== undefined) profile.theme.radius = clamp(round(radius * 0.16), RANGES.radius.min, RANGES.radius.max)
  const shadow = number(theme.shadow)
  if (shadow !== undefined) profile.theme.shadow = clamp(round(shadow / 4), RANGES.shadow.min, RANGES.shadow.max)
  profile.theme.glass = 0

  const font = record(theme.font)
  const displayFont = text(record(font.display).name), uiFont = text(record(font.ui).name)
  profile.theme.font = { display: fontStack(displayFont || 'Fjalla One', 'Fjalla One'), ui: fontStack(uiFont || 'Open Sans', 'Open Sans') }
  const needed = [...new Set([displayFont || 'Fjalla One', uiFont || 'Open Sans'])]
  warnings.push(`Fonts: ${needed.map(name => `"${name}"`).join(' and ')} come from Google Fonts. Install ${needed.length > 1 ? 'them' : 'it'} on this computer, or download the font file${needed.length > 1 ? 's' : ''} from fonts.google.com and add ${needed.length > 1 ? 'them' : 'it'} under Theme → Fonts.`)

  const backgroundRaw = record(theme.background)
  const type = text(backgroundRaw.type)
  const media = record(backgroundRaw[type])
  const background: ProfileV2['background'] = { type: 'theme', dim: 0 }
  if (type === 'color') {
    const value = colorOf(first(rgbColor(record(backgroundRaw.color).rgb), record(backgroundRaw.color).rgb, backgroundRaw.color))
    if (value) Object.assign(background, { type: 'color', color: value })
  } else if (type === 'gradient') {
    const gradient = record(backgroundRaw.gradient)
    const start = colorOf(first(rgbColor(record(gradient.start).rgb), record(gradient.start).rgb))
    const end = colorOf(first(rgbColor(record(gradient.end).rgb), record(gradient.end).rgb))
    if (start && end) Object.assign(background, { type: 'gradient', gradient: { angle: number(gradient.angle) ?? 135, stops: [start, end] } })
  } else if (type === 'accent') {
    background.type = 'accent'
  } else if (type === 'image' || type === 'video') {
    const tint = number(media.accent)
    if (tint) background.tint = clamp(tint, 0, 100)
    const url = text(media.url)
    if (url) warnings.push(`Background ${type}: download ${url} and choose it under Background → ${type === 'image' ? 'Image' : 'Video'}. Its opacity, blur, grayscale, zoom, accent tint and vignette are already set; change them there.`)
  }
  // Keep a wallpaper the person already chose, so the nightTab look applies to it straight away.
  let { image, video } = profile.background
  let nextLook: ProfileV2['background']['nextLook']
  if (type === 'image' || type === 'video') {
    const look = {
      opacity: clamp(number(media.opacity) ?? 100, 0, 100), blur: clamp(number(media.blur) ?? 0, RANGES.blur.min, RANGES.blur.max),
      grayscale: clamp(number(media.grayscale) ?? 0, RANGES.grayscale.min, RANGES.grayscale.max), scale: clamp(round((number(media.scale) ?? 100) / 100), RANGES.scale.min, RANGES.scale.max),
      vignette: clamp(number(record(media.vignette).opacity) ?? 0, RANGES.vignette.min, RANGES.vignette.max),
    }
    const { scale: _scale, ...videoLook } = look
    if (type === 'image' && image) image = { ...image, ...look }
    else if (type === 'video' && video) video = { ...video, ...videoLook }
    else nextLook = look
  }
  if ((type === 'image' && image) || (type === 'video' && video)) background.type = type
  profile.background = { ...background, ...(image ? { image } : {}), ...(video ? { video } : {}), ...(nextLook ? { nextLook } : {}) }

  const customThemes = record(theme.custom).all
  if (Array.isArray(customThemes) && customThemes.length) warnings.push(`${customThemes.length} saved nightTab themes were not imported`)
  return { accent, ramp: style === 'light' ? light : dark }
}

export function parseNightTabBackup(json: string, current: ProfileV2): NightTabResult {
  if (typeof json !== 'string' || json.length > MAX_BACKUP_JSON_CHARS) throw new Error('Invalid nightTab backup size')
  let raw: unknown
  try { raw = JSON.parse(json) } catch { throw new Error('Invalid JSON') }
  const root = record(raw)
  const warnings: string[] = []
  const profile = structuredClone(current)
  if (root.nightTab !== true && Array.isArray(root.bookmark)) warnings.push('Backup is missing the nightTab format marker; imported recognized fields only')
  const count = importBookmarks(root, profile, warnings)

  const state = record(root.state)
  if (Object.keys(state).length) {
    const theme = record(first(state.theme, root.theme))
    importTheme(theme, profile, warnings)
    const parts = importWidgets(state, profile, warnings)
    importLayout(state, profile, parts)
    importBookmarkPrefs(record(state.bookmark), profile)
    const look = nightTabLook(state, profile, parts)
    if (current.custom.css.trim()) warnings.push('Your custom CSS was replaced by the nightTab look; Undo brings it back')
    // The look's variables start at the backup's values, so earlier values for them are dropped.
    const values = Object.fromEntries(Object.entries(profile.custom.values).filter(([name]) => !name.startsWith('--nt-')))
    profile.custom = { ...profile.custom, css: look.css, cssEnabled: true, variables: look.variables, values }
    warnings.push('The nightTab look follows your settings: colours, corner radius, shadow, fonts, Interface scale, each widget\'s size and the background. nightTab\'s width, padding, gutter, plate opacity, accent line and hover effects are the "nightTab" options under Theme.')
  } else {
    const theme = record(root.theme)
    if (Object.keys(theme).length) importTheme(theme, profile, warnings)
  }

  const known = new Set(['nightTab', 'version', 'state', 'bookmark', 'groups', 'bookmarks', 'data', 'settings', 'preferences', 'config', 'theme', 'colour', 'color', 'accent', 'accentColor', 'background', 'backgroundColor', 'gradient', 'radius', 'shape', 'font', 'fontFamily'])
  for (const key of Object.keys(root).filter(key => !known.has(key))) warnings.push(`Ignored unrecognized field: ${key}`)
  profile.meta.updatedAt = new Date().toISOString()
  return { profile, warnings, count }
}

