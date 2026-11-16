import type { ProfileV2, Widget } from '../schema/profile'
import { isHttpUrl } from '../model'
import { SEARCH_ENGINES } from '../search/engines'

export type NightTabResult = { profile: ProfileV2; warnings: string[]; count: number }
type AnyRecord = Record<string, unknown>
type Link = ProfileV2['bookmarks']['groups'][number]['items'][number]
const record = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const hex = (value: unknown) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : undefined
const first = (...values: unknown[]) => values.find(value => value !== undefined && value !== null && value !== '')
const bool = (value: unknown) => typeof value === 'boolean' ? value : undefined
const shown = (value: unknown) => bool(record(value).show)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined

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
  return `#${channels.map(channel => Math.round(channel as number).toString(16).padStart(2, '0')).join('')}`
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

type Visual = { mode: 'text'; icon: string } | { mode: 'lucide'; iconName: string } | { mode: 'auto'; image?: string }

function displayVisual(item: AnyRecord): Visual | undefined {
  const visual = record(record(item.display).visual)
  const type = text(visual.type)
  if (type === 'letter') return { mode: 'text', icon: text(record(visual.letter).text) }
  if (type === 'icon') {
    const icon = record(visual.icon)
    const name = text(icon.name).replace(/^fa-/, '')
    const generic = text(icon.prefix) === 'fab' ? undefined : FONT_AWESOME_GENERIC[name]
    return generic ? { mode: 'lucide', iconName: generic } : { mode: 'auto' }
  }
  if (type === 'image') return { mode: 'auto', image: text(record(visual.image).url) }
  return undefined
}

function bookmarkUrl(item: AnyRecord): string {
  const candidate = text(first(item.url, item.href, item.address))
  try { return ['http:', 'https:'].includes(new URL(candidate).protocol) ? candidate : '' } catch { return '' }
}

function fontFamily(value: unknown): string {
  const font = text(value).toLowerCase()
  if (/barlow|condensed|oswald|bebas|anton|roboto condensed/.test(font)) return 'barlow-condensed'
  if (/serif|georgia|times|garamond|cormorant/.test(font)) return 'serif'
  if (/mono|code|terminal/.test(font)) return 'mono'
  if (/rounded|comfortaa|nunito|circular/.test(font)) return 'rounded'
  return 'system'
}

function importBookmarks(root: AnyRecord, profile: ProfileV2, warnings: string[]): number {
  const groups = groupsOf(root)
  if (!groups.length) warnings.push('No bookmark groups were found')
  const seen = new Set(profile.bookmarks.groups.flatMap(group => group.items.map(item => item.url)))
  const imported = groups.flatMap((group, groupIndex) => {
    const items = bookmarkItems(group).flatMap((item, index): Link[] => {
      const url = bookmarkUrl(item)
      const display = record(item.display)
      const name = text(first(record(display.name).text, item.name, item.title, item.label))
      if (!url || !name || seen.has(url)) return []
      seen.add(url)
      const visual = displayVisual(item)
      const color = customColor(item.color) ?? customColor(item.accent) ?? colorOf(first(record(item.style).color)) ?? profile.theme.color.accent
      if (visual?.mode === 'auto' && visual.image) warnings.push(`Skipped external bookmark image for: ${name}`)
      const letter = (visual?.mode === 'text' ? visual.icon : '') || text(first(item.letter, typeof item.icon === 'string' ? item.icon : undefined, item.text)) || name.slice(0, 1).toUpperCase()
      const base = { id: `nighttab-${groupIndex}-${index}-${crypto.randomUUID()}`, name, url, color, icon: letter.slice(0, 8) }
      if (visual?.mode === 'lucide') return [{ ...base, iconMode: 'lucide', iconName: visual.iconName }]
      if (visual?.mode === 'auto') return [{ ...base, iconMode: 'auto' }]
      return [{ ...base, iconMode: 'text' }]
    })
    if (!items.length) return []
    const name = text(first(record(group.name).text, group.name, group.title, group.label)) || `Group ${groupIndex + 1}`
    const collapse = record(group.name).show === false ? false : group.collapse
    return [{ id: `nighttab-group-${groupIndex}-${crypto.randomUUID()}`, name, collapsed: typeof collapse === 'boolean' ? collapse : false, items }]
  })
  profile.bookmarks.groups.push(...imported)
  return imported.reduce((sum, group) => sum + group.items.length, 0)
}

type Patchable<T extends Widget['type']> = Extract<Widget, { type: T }>
function eachWidget<T extends Widget['type']>(profile: ProfileV2, type: T, update: (widget: Patchable<T>) => void): boolean {
  const matches = profile.widgets.filter((widget): widget is Patchable<T> => widget.type === type)
  matches.forEach(update)
  return matches.length > 0
}

function importClock(clock: AnyRecord, profile: ProfileV2, warnings: string[]) {
  if (!Object.keys(clock).length) return
  const hours = shown(clock.hour), minutes = shown(clock.minute), seconds = shown(clock.second)
  const hour24 = shown(clock.hour24)
  const separator = record(clock.separator)
  const visible = [hours, minutes, seconds].some(part => part !== false)
  eachWidget(profile, 'clock', widget => {
    widget.props = {
      ...widget.props,
      ...(hours !== undefined ? { hours } : {}), ...(minutes !== undefined ? { minutes } : {}), ...(seconds !== undefined ? { seconds } : {}),
      ...(hour24 !== undefined ? { hour12: !hour24 } : {}),
      ...(separator.show === false ? { separator: ' ' } : separator.show === true ? { separator: (text(separator.text) || ':').slice(0, 8) } : {}),
    }
    widget.hidden = !visible
  })
  if (['hour', 'minute', 'second'].some(part => record(clock[part]).display === 'word')) warnings.push('Clock shown in words was imported as numbers')
}

function importDate(date: AnyRecord, profile: ProfileV2, warnings: string[]) {
  if (!Object.keys(date).length) return
  const day = record(date.day), dayOfMonth = record(date.date), month = record(date.month), year = record(date.year), separator = record(date.separator)
  const weekday = bool(day.show), dayShown = bool(dayOfMonth.show), monthShown = bool(month.show), yearShown = bool(year.show)
  const weekStart = day.weekStart === 'monday' || day.weekStart === 'sunday' ? day.weekStart : undefined
  const monthFirst = date.format === 'month-date'
  eachWidget(profile, 'date', widget => {
    widget.props = {
      ...widget.props, format: 'custom',
      ...(weekday !== undefined ? { weekday } : {}), ...(dayShown !== undefined ? { day: dayShown } : {}), ...(monthShown !== undefined ? { month: monthShown } : {}), ...(yearShown !== undefined ? { year: yearShown } : {}),
      ...(day.length === 'short' || day.length === 'long' ? { weekdayStyle: day.length } : {}),
      ...(month.display === 'number' ? { monthStyle: 'numeric' as const } : month.length === 'short' || month.length === 'long' ? { monthStyle: month.length } : {}),
      ...(bool(dayOfMonth.ordinal) !== undefined && dayOfMonth.display !== 'word' ? { ordinal: dayOfMonth.ordinal as boolean } : {}),
      ...(weekStart ? { weekStart } : {}),
      order: monthFirst ? ['weekday', 'month', 'day', 'year'] : ['weekday', 'day', 'month', 'year'],
      ...(separator.show === false ? { separator: ' ' } : separator.show === true ? { separator: (text(separator.text) || ' ').slice(0, 8) } : {}),
    }
    widget.hidden = ![weekday, dayShown, monthShown, yearShown].some(part => part !== false)
  })
  if (dayOfMonth.display === 'word' || year.display === 'word') warnings.push('Date shown in words was imported as numbers')
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
  if (NIGHTTAB_ENGINES[selected]) return { id: `nighttab-${selected}`, ...NIGHTTAB_ENGINES[selected] }
  if (selected !== 'custom') return undefined
  const custom = record(engine.custom)
  const url = text(custom.url), query = text(custom.queryName)
  if (!url) return undefined
  const template = url.includes('{query}') ? url : query ? `${url}${url.includes('?') ? '&' : '?'}${encodeURIComponent(query)}={query}` : `${url}{query}`
  if (!isHttpUrl(template.replaceAll('{query}', 'test'))) return undefined
  return { id: 'nighttab-custom', name: text(custom.name) || 'nightTab search', template }
}

function importHeader(header: AnyRecord, profile: ProfileV2, warnings: string[]) {
  importClock(record(header.clock), profile, warnings)
  importDate(record(header.date), profile, warnings)

  const greeting = record(header.greeting), transitional = record(header.transitional)
  if (Object.keys(greeting).length || Object.keys(transitional).length) {
    const name = text(greeting.name).slice(0, 60)
    const greetingShown = bool(greeting.show), transitionalShown = bool(transitional.show)
    const found = eachWidget(profile, 'greeting', widget => {
      widget.props = { ...widget.props, ...(name ? { name } : {}), ...(transitionalShown !== undefined ? { transitional: transitionalShown } : {}) }
      if (greetingShown !== undefined || transitionalShown !== undefined) widget.hidden = !(greetingShown || transitionalShown)
    })
    if (!found && (greetingShown || transitionalShown)) warnings.push('The greeting was not imported because this layout has no greeting widget')
  }

  const search = record(header.search)
  if (Object.keys(search).length) {
    const searchShown = bool(search.show)
    if (searchShown !== undefined) eachWidget(profile, 'search', widget => { widget.hidden = !searchShown })
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
}

const ALIGNMENTS = ['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const

function importLayout(layout: AnyRecord, profile: ProfileV2) {
  const alignment = ALIGNMENTS.find(value => value === layout.alignment)
  if (alignment) profile.layout.align = alignment
  const size = number(layout.size)
  if (size !== undefined) profile.theme.scale = Math.round(clamp(size / 100, 0.5, 2) * 100) / 100
  const title = text(layout.title).slice(0, 80)
  if (title) profile.prefs.pageTitle = title
}

function importBookmarkSettings(bookmark: AnyRecord, profile: ProfileV2) {
  const style = bookmark.style === 'list' ? 'list' : bookmark.style === 'block' ? 'tile' : undefined
  const showUrl = shown(bookmark.url)
  eachWidget(profile, 'bookmarks', widget => {
    widget.props = { ...widget.props, ...(style ? { style } : {}), ...(showUrl !== undefined ? { showUrl } : {}) }
  })
  const newTab = bool(bookmark.newTab)
  if (newTab !== undefined) profile.prefs.openShortcutsInNewTab = newTab
  const lift = shown(bookmark.hoverScale)
  if (lift !== undefined) profile.prefs.liftOnHover = lift
}

function importTheme(theme: AnyRecord, profile: ProfileV2, warnings: string[]) {
  const accentState = record(theme.accent)
  const accent = customColor(accentState) ?? colorOf(first(theme.accentColor))
  if (accent) profile.theme.color.accent = accent
  if (record(accentState.cycle).active === true) profile.prefs.accentOnOpen = 'cycle'
  else if (record(accentState.random).active === true) profile.prefs.accentOnOpen = 'random'
  const mode = text(theme.style)
  if (mode === 'dark' || mode === 'light' || mode === 'system') profile.theme.mode = mode
  const backgroundRaw = record(theme.background)
  if (backgroundRaw.type === 'color') {
    const backgroundColor = colorOf(first(rgbColor(record(backgroundRaw.color).rgb), record(backgroundRaw.color).rgb, backgroundRaw.color))
    if (backgroundColor) {
      profile.theme.color.bg = backgroundColor
      profile.theme.color.surface = backgroundColor
      profile.background = { ...profile.background, type: 'color', color: backgroundColor }
    }
  } else if (backgroundRaw.type === 'gradient') {
    const gradient = record(backgroundRaw.gradient)
    const start = colorOf(first(rgbColor(record(gradient.start).rgb), record(gradient.start).rgb))
    const end = colorOf(first(rgbColor(record(gradient.end).rgb), record(gradient.end).rgb))
    if (start && end) profile.background = { ...profile.background, type: 'gradient', gradient: { angle: typeof gradient.angle === 'number' ? gradient.angle : 135, stops: [start, end] } }
  } else if (backgroundRaw.type === 'accent') {
    profile.background = { ...profile.background, type: 'accent' }
  } else if ((backgroundRaw.type === 'image' || backgroundRaw.type === 'video') && text(record(backgroundRaw[backgroundRaw.type]).url)) {
    warnings.push(`The ${backgroundRaw.type} background links to the web and was not downloaded; save it and choose it under Background`)
  }
  const radius = theme.radius
  if (typeof radius === 'number' && Number.isFinite(radius)) profile.theme.radius = Math.max(0, Math.min(28, radius))
  const displayFont = text(record(record(theme.font).display).name)
  const uiFont = text(record(record(theme.font).ui).name)
  if (displayFont || uiFont) profile.theme.font = { display: displayFont ? fontFamily(displayFont) : profile.theme.font.display, ui: uiFont ? fontFamily(uiFont) : profile.theme.font.ui }
  const customThemes = record(theme.custom).all
  if (Array.isArray(customThemes) && customThemes.length) warnings.push(`${customThemes.length} saved nightTab themes were not imported`)
}

export function parseNightTabBackup(json: string, current: ProfileV2): NightTabResult {
  let raw: unknown
  try { raw = JSON.parse(json) } catch { throw new Error('Invalid JSON') }
  const root = record(raw)
  const warnings: string[] = []
  const profile = structuredClone(current)
  if (root.nightTab !== true && Array.isArray(root.bookmark)) warnings.push('Backup is missing the nightTab format marker; imported recognized fields only')
  const count = importBookmarks(root, profile, warnings)

  const state = record(root.state)
  importHeader(record(state.header), profile, warnings)
  importLayout(record(state.layout), profile)
  importBookmarkSettings(record(state.bookmark), profile)
  importTheme(record(first(state.theme, root.theme)), profile, warnings)

  const known = new Set(['nightTab', 'version', 'state', 'bookmark', 'groups', 'bookmarks', 'data', 'settings', 'preferences', 'config', 'theme', 'colour', 'color', 'accent', 'accentColor', 'background', 'backgroundColor', 'gradient', 'radius', 'shape', 'font', 'fontFamily'])
  for (const key of Object.keys(root).filter(key => !known.has(key))) warnings.push(`Ignored unrecognized field: ${key}`)
  profile.meta.updatedAt = new Date().toISOString()
  return { profile, warnings, count }
}
