import { defaults, validate } from '../model'
import { recognizeSearchEngine } from '../search/engines'
import { DARK_COLORS, DEFAULT_CONTENT_WIDTH, DEFAULT_GAP, DEFAULT_GLASS, DEFAULT_RADIUS, DEFAULT_SHADOW, LIGHT_COLORS, darkSurface, lightSurface } from '../schema/defaults'
import { parseProfileV2, type ProfileV2 } from '../schema/profile'

export type MigrationOptions = {
  id: () => string
  now: () => string
  add: (blob: Blob) => Promise<string>
  wallpaper?: Blob
  /** Language for generated names (profile, group, search engine); defaults to the legacy settings language. */
  language?: 'zh-CN' | 'en'
}

const assetPattern = /^mnt-asset:[a-f0-9]{64}$/
const dataPattern = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/

function decodeImage(data: string): Blob {
  const match = dataPattern.exec(data)
  if (!match || !match[2] || match[2].length % 4 !== 0) throw new Error('Invalid image data')
  let binary: string
  try { binary = atob(match[2]) } catch { throw new Error('Invalid image data') }
  if (btoa(binary) !== match[2]) throw new Error('Invalid image data')
  return new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type: match[1] })
}

const names = {
  profile: { 'zh-CN': '默认', en: 'Default' },
  group: { 'zh-CN': '常用', en: 'Quick links' },
  custom: { 'zh-CN': '自定义', en: 'Custom' },
} as const

const BOOKMARKS = 'bookmarks', OVERVIEW = 'overview'

/** Convert a validated legacy settings object without writing profile storage. */
export async function migrateV1(input: unknown, options: MigrationOptions): Promise<ProfileV2> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid settings')
  const v = validate(input)
  const language = options.language ?? v.language
  // Validate every image before adding any assets.
  const wallpaper = v.wallpaper === undefined ? undefined : decodeImage(v.wallpaper)
  const iconBlobs = v.shortcuts.map(item => item.image === undefined ? undefined : decodeImage(item.image))
  if (options.wallpaper && (!['image/png', 'image/jpeg', 'image/webp'].includes(options.wallpaper.type) || !options.wallpaper.size)) throw new Error('Invalid wallpaper')
  const add = async (blob: Blob) => {
    const ref = await options.add(blob)
    if (!assetPattern.test(ref)) throw new Error('Invalid asset reference')
    return ref
  }
  // The separate wallpaper wins over the inline one; only the effective image is stored (the raw v1 backup keeps the other).
  const effective = options.wallpaper ?? wallpaper
  const activeWallpaper = effective ? await add(effective) : undefined
  const items = await Promise.all(v.shortcuts.map(async (item, i) => ({ ...item, ...(item.id === 'example' && item.name === defaults.shortcuts[0].name && item.icon === defaults.shortcuts[0].icon ? { builtinName: 'sample-website' as const, builtinIcon: 'sample-website' as const, builtinGroup: 'quick-links' as const } : {}), color: item.color.toLowerCase(), ...(iconBlobs[i] ? { image: await add(iconBlobs[i]!) } : {}) })))
  const timestamp = options.now()
  const bg = v.background.toLowerCase(), accent = v.accent.toLowerCase()
  const stacked = v.reverse ? [BOOKMARKS, OVERVIEW] : [OVERVIEW, BOOKMARKS]
  const engine = recognizeSearchEngine(v.searchTemplate, language) ?? { id: 'custom', name: names.custom[language] }
  const engineMetadata = engine.id === 'custom' ? { builtinName: 'custom-search' as const } : {}
  return parseProfileV2({
    schemaVersion: 2,
    meta: { id: options.id(), name: names.profile[language], builtinName: 'default-profile', createdAt: timestamp, updatedAt: timestamp },
    prefs: { language: v.language, openIn: 'same-tab', openShortcutsInNewTab: false, openSearchInNewTab: false, keyboardShortcuts: true, accentOnOpen: 'off', liftOnHover: false, reduceMotion: 'system', reduceTransparency: 'system' },
    theme: {
      mode: v.theme,
      color: { bg, surface: darkSurface(bg), text: DARK_COLORS.text, accent },
      ...(v.theme === 'light' ? { colorLight: { bg: LIGHT_COLORS.bg, surface: lightSurface(LIGHT_COLORS.bg), text: LIGHT_COLORS.text, accent } } : {}),
      font: { display: 'system', ui: 'system' }, radius: DEFAULT_RADIUS, shadow: DEFAULT_SHADOW, glass: DEFAULT_GLASS, density: 'comfortable', scale: 1, iconShape: v.iconShape, iconSize: v.iconSize,
    },
    background: { type: activeWallpaper ? 'image' : 'theme', dim: v.overlay, ...(activeWallpaper ? { image: { asset: activeWallpaper, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } : {}) },
    layout: {
      areas: v.layout === 'split' ? [v.reverse ? `${OVERVIEW} ${BOOKMARKS}` : `${BOOKMARKS} ${OVERVIEW}`] : stacked,
      ...(v.layout === 'split' ? { columns: ['minmax(0, 1fr)', 'minmax(280px, 0.7fr)'] } : {}),
      breakpoints: { narrow: { areas: stacked, columns: ['1fr'] } },
      contentWidth: DEFAULT_CONTENT_WIDTH, align: v.alignment === 'left' ? 'center-left' : 'center-center', gap: v.layout === 'stacked' ? 0 : DEFAULT_GAP,
    },
    widgets: [
      { id: 'clock', type: 'clock', area: OVERVIEW, order: 0, props: { hour12: v.hour12 }, hidden: !v.showClock },
      { id: 'date', type: 'date', area: OVERVIEW, order: 1, props: {}, hidden: !v.showDate },
      { id: 'search', type: 'search', area: OVERVIEW, order: 2, props: {}, hidden: !v.showSearch },
      { id: 'bookmarks', type: 'bookmarks', area: BOOKMARKS, order: 3, props: { maxColumns: v.columns } },
    ],
    bookmarks: { groups: [{ id: 'default', name: names.group[language], builtinName: 'quick-links', collapsed: false, items: items.map(item => ({ ...item, ...(item.builtinName ? { builtinGroup: 'quick-links' as const } : {}) })) }] },
    search: { engines: [{ ...engine, ...engineMetadata, template: v.searchTemplate }], defaultEngineId: engine.id },

    custom: { css: '', cssEnabled: false, variables: [], values: {} },
  })
}
