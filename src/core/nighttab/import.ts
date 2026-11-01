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

function displayVisual(item: AnyRecord): { icon?: string; image?: string; mode?: string } {
  const display = record(item.display)
  const visual = record(display.visual)
  const type = text(visual.type)
  if (type === 'letter') return { icon: text(record(visual.letter).text), mode: 'text' }
  if (type === 'icon') return { icon: text(record(visual.icon).name), mode: 'lucide' }
  if (type === 'image') return { image: text(record(visual.image).url), mode: 'auto' }
  return {}
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
  const officialFormat = root.nightTab === true
  const groups = groupsOf(root)
  if (!officialFormat && Array.isArray(root.bookmark)) warnings.push('Backup is missing the nightTab format marker; imported recognized fields only')
  if (!groups.length) warnings.push('No bookmark groups were found')
  const seen = new Set(profile.bookmarks.groups.flatMap(group => group.items.map(item => item.url)))
  const imported = groups.flatMap((group, groupIndex) => {
    const sourceItems = bookmarkItems(group)
    const items = sourceItems.flatMap((item, index) => {
      const url = bookmarkUrl(item)
      const display = record(item.display)
      const visual = displayVisual(item)
      const name = text(first(record(display.name).text, item.name, item.title, item.label))
      if (!url || !name || seen.has(url)) return []
      seen.add(url)
      const colorData = record(item.color)
      const color = colorData.by === 'theme' ? profile.theme.color.accent : colorOf(first(rgbColor(colorData.rgb), colorData.rgb, item.color, item.accent, record(item.style).color)) ?? profile.theme.color.accent
      const iconName = visual.mode === 'lucide' ? visual.icon : undefined
      if (visual.mode === 'auto' && visual.image) warnings.push(`Skipped external bookmark image for: ${name}`)
      const icon = (visual.mode === 'text' ? visual.icon : undefined) ?? text(first(item.letter, item.icon, item.text))
      return [{ id: `nighttab-${groupIndex}-${index}-${crypto.randomUUID()}`, name, url, color, icon: icon.slice(0, 8) || name.slice(0, 1).toUpperCase(), iconMode: visual.mode === 'lucide' ? 'lucide' as const : 'text' as const, ...(iconName ? { iconName } : {}) }]
    })
    if (!items.length) return []
    const name = text(first(record(group.name).text, group.name, group.title, group.label)) || `Group ${groupIndex + 1}`
    const collapse = record(group.name).show === false ? false : group.collapse
    return [{ id: `nighttab-group-${groupIndex}-${crypto.randomUUID()}`, name, collapsed: typeof collapse === 'boolean' ? collapse : false, items }]
  })
  profile.bookmarks.groups.push(...imported)

  const state = record(root.state)
  const theme = record(first(state.theme, root.theme))
  const accentState = record(theme.accent)
  const accent = colorOf(first(rgbColor(accentState.rgb), accentState.rgb, theme.accentColor, theme.accent))
  if (accent && accentState.by !== 'theme') profile.theme.color.accent = accent
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
  }
  const radius = theme.radius
  if (typeof radius === 'number' && Number.isFinite(radius)) profile.theme.radius = Math.max(0, Math.min(28, radius))
  const displayFont = text(record(record(theme.font).display).name)
  const uiFont = text(record(record(theme.font).ui).name)
  if (displayFont || uiFont) profile.theme.font = { display: displayFont ? fontFamily(displayFont) : profile.theme.font.display, ui: uiFont ? fontFamily(uiFont) : profile.theme.font.ui }

  const known = new Set(['nightTab', 'version', 'state', 'bookmark', 'groups', 'bookmarks', 'data', 'settings', 'preferences', 'config', 'theme', 'colour', 'color', 'accent', 'accentColor', 'background', 'backgroundColor', 'gradient', 'radius', 'shape', 'font', 'fontFamily'])
  const unknown = Object.keys(root).filter(key => !known.has(key))
  for (const key of unknown) warnings.push(`Ignored unrecognized field: ${key}`)
  profile.meta.updatedAt = new Date().toISOString()
  return { profile, warnings, count: imported.reduce((sum, group) => sum + group.items.length, 0) }
}
