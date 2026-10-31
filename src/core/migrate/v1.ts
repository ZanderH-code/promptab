import { validate, type Settings } from '../model'
import { parseProfileV2, type ProfileV2 } from '../schema/profile'

export type MigrationOptions = {
  id: () => string
  now: () => string
  add: (blob: Blob) => Promise<string>
  wallpaper?: Blob
}
export type AssetReader = { get: (reference: string) => Promise<Blob | undefined> }

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

async function encodeImage(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image asset'))
    reader.onerror = () => reject(new Error('Cannot read image asset'))
    reader.onabort = () => reject(new Error('Cannot read image asset'))
    reader.readAsDataURL(blob)
  })
}

async function readAsset(reader: AssetReader, reference: string): Promise<Blob> {
  if (!assetPattern.test(reference)) throw new Error('Invalid asset reference')
  const blob = await reader.get(reference)
  if (!blob) throw new Error(`Missing asset: ${reference}`)
  return blob
}

/** Convert a validated legacy settings object without writing profile storage. */
export async function migrateV1(input: unknown, options: MigrationOptions): Promise<ProfileV2> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid settings')
  const v = validate(input)
  // Validate every image before adding any assets.
  const wallpaper = v.wallpaper === undefined ? undefined : decodeImage(v.wallpaper)
  const iconBlobs = v.shortcuts.map(item => item.image === undefined ? undefined : decodeImage(item.image))
  if (options.wallpaper && (!['image/png', 'image/jpeg', 'image/webp'].includes(options.wallpaper.type) || !options.wallpaper.size)) throw new Error('Invalid wallpaper')
  const add = async (blob: Blob) => {
    const ref = await options.add(blob)
    if (!assetPattern.test(ref)) throw new Error('Invalid asset reference')
    return ref
  }
  const legacyWallpaper = wallpaper ? await add(wallpaper) : undefined
  const suppliedWallpaper = options.wallpaper ? await add(options.wallpaper) : undefined
  const items = await Promise.all(v.shortcuts.map(async (item, i) => ({ ...item, ...(iconBlobs[i] ? { image: await add(iconBlobs[i]!) } : {}) })))
  const activeWallpaper = suppliedWallpaper ?? legacyWallpaper
  const timestamp = options.now()
  return parseProfileV2({
    schemaVersion: 2,
    meta: { id: options.id(), name: 'Migrated profile', createdAt: timestamp, updatedAt: timestamp },
    prefs: { language: v.language, openIn: 'same-tab', reduceMotion: 'system', reduceTransparency: 'system' },
    theme: { mode: v.theme, color: { bg: v.background, surface: v.background, text: '#ffffff', accent: v.accent }, font: { display: 'system', ui: 'system' }, radius: 0, shadow: 0, glass: 0, density: 'comfortable', scale: 1, iconShape: v.iconShape, iconSize: v.iconSize },
    background: activeWallpaper ? { type: 'image', image: { asset: activeWallpaper, blur: 0, dim: v.overlay, grayscale: 0, scale: 1, vignette: 0, position: 'center' } } : { type: 'color', color: v.background },
    layout: {
      areas: v.layout === 'split' ? [v.reverse ? 'overview bookmarks' : 'bookmarks overview'] : (v.reverse ? ['bookmarks', 'overview'] : ['overview', 'bookmarks']),
      ...(v.layout === 'split' ? { columns: ['minmax(0, 1fr)', 'minmax(280px, 0.7fr)'] } : {}),
      breakpoints: { narrow: { areas: v.reverse ? ['bookmarks', 'overview'] : ['overview', 'bookmarks'], columns: ['1fr'] } },
      contentWidth: 1200, align: v.alignment === 'left' ? 'center-left' : 'center', gap: 24,
    },
    widgets: [
      { id: 'clock', type: 'clock', area: 'overview', order: 0, props: { hour12: v.hour12 }, hidden: !v.showClock },
      { id: 'date', type: 'date', area: 'overview', order: 1, props: {}, hidden: !v.showDate },
      { id: 'search', type: 'search', area: 'overview', order: 2, props: {}, hidden: !v.showSearch },
      { id: 'bookmarks', type: 'bookmarks', area: 'bookmarks', order: 3, props: { columns: v.columns, reverse: v.reverse, layout: v.layout } },
    ],
    bookmarks: { groups: [{ id: 'legacy', name: '常用', collapsed: false, items }] },
    search: { engines: [{ id: 'legacy', name: 'Search', template: v.searchTemplate }], defaultEngineId: 'legacy' },
    custom: { css: '', cssEnabled: false, variables: [], values: { 'v1.overlay': v.overlay, ...(legacyWallpaper ? { 'v1.wallpaper': legacyWallpaper } : {}), ...(suppliedWallpaper ? { 'v1.suppliedWallpaper': suppliedWallpaper } : {}) } },
  })
}

/** Project a migrated profile back into v1 settings and its separate wallpaper. */
export async function projectV1(profile: ProfileV2, reader: AssetReader): Promise<{ settings: Settings; wallpaper?: Blob }> {
  const p = parseProfileV2(profile)
  const widget = (id: string) => {
    const found = p.widgets.find(item => item.id === id)
    if (!found) throw new Error(`Missing legacy widget: ${id}`)
    return found
  }
  const clock = widget('clock'), date = widget('date'), search = widget('search'), bookmarks = widget('bookmarks')
  const legacyWallpaper = p.custom.values['v1.wallpaper']
  const suppliedWallpaper = p.custom.values['v1.suppliedWallpaper']
  const engine = p.search.engines.find(item => item.id === p.search.defaultEngineId)
  if (!engine || (legacyWallpaper !== undefined && typeof legacyWallpaper !== 'string') || (suppliedWallpaper !== undefined && typeof suppliedWallpaper !== 'string')) throw new Error('Invalid legacy projection')
  const shortcuts = await Promise.all(p.bookmarks.groups.flatMap(group => group.items).map(async item => ({ ...item, ...(item.image ? { image: await encodeImage(await readAsset(reader, item.image)) } : {}) })))
  const settings = validate({
    schemaVersion: 1, language: p.prefs.language, theme: p.theme.mode, accent: p.theme.color.accent, background: p.theme.color.bg,
    showClock: !clock.hidden, showDate: !date.hidden, showSearch: !search.hidden, hour12: clock.props.hour12,
    searchTemplate: engine.template, shortcuts, columns: bookmarks.props.columns, iconSize: p.theme.iconSize, iconShape: p.theme.iconShape,
    alignment: p.layout.align === 'center-left' ? 'left' : 'center', layout: bookmarks.props.layout, reverse: bookmarks.props.reverse,
    overlay: p.custom.values['v1.overlay'], ...(legacyWallpaper ? { wallpaper: await encodeImage(await readAsset(reader, legacyWallpaper)) } : {}),
  })
  return { settings, ...(suppliedWallpaper ? { wallpaper: await readAsset(reader, suppliedWallpaper) } : {}) }
}
