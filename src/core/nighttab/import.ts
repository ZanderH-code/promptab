import type { ProfileV2 } from '../schema/profile'

export type NightTabResult = { profile: ProfileV2; warnings: string[]; count: number }
type AnyRecord = Record<string, unknown>
const record = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const hex = (value: unknown) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : undefined
const first = (...values: unknown[]) => values.find(value => value !== undefined && value !== null && value !== '')

function colorOf(value: unknown): string | undefined {
  const raw = text(value)
  if (hex(raw)) return raw
  if (/^[\da-f]{6}$/i.test(raw)) return `#${raw}`
  return undefined
}

function groupsOf(root: AnyRecord): AnyRecord[] {
  const candidates = first(root.groups, record(root.bookmarks).groups, record(root.data).groups)
  return Array.isArray(candidates) ? candidates.map(record) : []
}

function bookmarkItems(group: AnyRecord): AnyRecord[] {
  const candidates = first(group.bookmarks, group.items, group.links, group.children)
  return Array.isArray(candidates) ? candidates.map(record) : []
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

export function parseNightTabBackup(json: string, current: ProfileV2): NightTabResult {
  let raw: unknown
  try { raw = JSON.parse(json) } catch { throw new Error('Invalid JSON') }
  const root = record(raw)
  const warnings: string[] = []
  const profile = structuredClone(current)
  const groups = groupsOf(root)
  if (!groups.length) warnings.push('No bookmark groups were found')
  const seen = new Set(profile.bookmarks.groups.flatMap(group => group.items.map(item => item.url)))
  const imported = groups.flatMap((group, groupIndex) => {
    const sourceItems = bookmarkItems(group)
    const items = sourceItems.flatMap((item, index) => {
      const url = bookmarkUrl(item)
      const name = text(first(item.name, item.title, item.label))
      if (!url || !name || seen.has(url)) return []
      seen.add(url)
      const color = colorOf(first(item.color, item.accent, record(item.style).color)) ?? profile.theme.color.accent
      const letter = text(first(item.letter, item.icon, item.text))
      return [{ id: `nighttab-${groupIndex}-${index}-${crypto.randomUUID()}`, name, url, color, icon: letter.slice(0, 8) || name.slice(0, 1).toUpperCase(), iconMode: 'text' as const }]
    })
    if (!items.length) return []
    const name = text(first(group.name, group.title, group.label)) || `Group ${groupIndex + 1}`
    return [{ id: `nighttab-group-${groupIndex}-${crypto.randomUUID()}`, name, collapsed: false, items }]
  })
  profile.bookmarks.groups.push(...imported)

  const settings = record(first(root.settings, root.preferences, root.config, root))
  const theme = record(first(root.theme, settings.theme, root.colour, root.color))
  const accent = colorOf(first(theme.accent, theme.accentColor, settings.accent, settings.accentColor))
  const backgroundColor = colorOf(first(record(theme.background).color, theme.backgroundColor, theme.background, settings.backgroundColor, settings.background))
  if (accent) profile.theme.color.accent = accent
  const backgroundRaw = record(first(theme.background, settings.background))
  const stopsRaw = first(backgroundRaw.stops, backgroundRaw.colors, theme.gradient, settings.gradient)
  const stops = Array.isArray(stopsRaw) ? stopsRaw.map(colorOf).filter((value): value is string => !!value) : []
  if (stops.length >= 2) {
    profile.background = { ...profile.background, type: 'gradient', gradient: { angle: typeof backgroundRaw.angle === 'number' ? backgroundRaw.angle : 135, stops: stops.slice(0, 3) } }
  } else if (backgroundColor) {
    profile.theme.color.bg = backgroundColor
    profile.theme.color.surface = backgroundColor
    profile.background = { ...profile.background, type: 'color', color: backgroundColor }
  }
  const radius = first(theme.radius, settings.radius, record(theme.shape).radius)
  if (typeof radius === 'number' && Number.isFinite(radius)) profile.theme.radius = Math.max(0, Math.min(28, radius))
  const font = first(theme.font, theme.fontFamily, settings.font, settings.fontFamily)
  if (font !== undefined) profile.theme.font = { ...profile.theme.font, display: fontFamily(font) }

  const known = new Set(['groups', 'bookmarks', 'data', 'settings', 'preferences', 'config', 'theme', 'colour', 'color', 'accent', 'accentColor', 'background', 'backgroundColor', 'gradient', 'radius', 'shape', 'font', 'fontFamily'])
  const unknown = Object.keys(root).filter(key => !known.has(key))
  for (const key of unknown) warnings.push(`Ignored unrecognized field: ${key}`)
  profile.meta.updatedAt = new Date().toISOString()
  return { profile, warnings, count: imported.reduce((sum, group) => sum + group.items.length, 0) }
}
