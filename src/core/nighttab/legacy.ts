import { own } from '../own'

/**
 * Converts the nightTab fields this importer reads from a pre-7 backup to their version 7 shape, following the
 * first step of nightTab's own update chain (`update/index.js`, `7.0.0`). The rest of that chain upgrades much
 * older exports to 6.x before this step runs; exports below 6.x may still be missing tile details.
 *
 * Not ported because the importer never reads them: padding, gutter, scrollbar, overscroll and language, nightTab's
 * panel colours and shade, group and toolbar sizes, per-item timestamps and hover shadows, and the saved custom
 * theme list. The old HSL colour and contrast steps are converted to the version 7 shade ramp the importer uses.
 */

type AnyRecord = Record<string, unknown>
const record = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const shown = (value: unknown) => typeof record(value).show === 'boolean' ? record(value).show as boolean : undefined
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** A pre-7 fraction (1 = default) as the percent or ×100 value version 7 stores. */
const hundreds = (value: unknown) => { const n = number(value); return n === undefined ? undefined : n * 100 }
/** A pre-7 item size (1 = default) as the version 7 size (10×). */
const tens = (value: unknown) => { const n = number(value); return n === undefined ? undefined : n * 10 }

const ALIGNMENTS: Record<string, string> = {
  topleft: 'top-left', topcenter: 'top-center', topright: 'top-right',
  centerleft: 'center-left', centercenter: 'center-center', centerright: 'center-right',
  bottomleft: 'bottom-left', bottomcenter: 'bottom-center', bottomright: 'bottom-right',
}
const LAYOUT_ORDERS: Record<string, string> = { headerlink: 'header-bookmark', linkheader: 'bookmark-header' }
const DATE_FORMATS: Record<string, string> = { datemonth: 'date-month', monthdate: 'month-date' }
const DISPLAY_ORDERS: Record<string, string> = { visualname: 'visual-name', namevisual: 'name-visual' }

const alignment = (value: unknown) => own(ALIGNMENTS, text(value).toLowerCase())

function isLegacy(root: AnyRecord): boolean {
  const major = Number.parseInt(text(root.version).split('.')[0] ?? '', 10)
  if (Number.isFinite(major)) return major < 7
  if (root.nightTab === true) return false
  // 3.18–6.x mark themselves `nighttab` (lowercase); even older exports only have the old group array.
  return root.nighttab === true || (Array.isArray(root.bookmarks) && !Array.isArray(root.bookmark))
}

function upgradeItem(value: unknown, fallbackBorder: number | undefined): AnyRecord {
  const item = record(value)
  const display = record(item.display)
  const visual = record(display.visual)
  const name = record(display.name)
  const color = record(item.color)
  const background = record(item.background)
  // Pre-7 keeps the visual size on the chosen kind (letter/icon/image); 7.0 moves it to `visual.size` ×10.
  const kindSize = number(record(own(visual, text(visual.type))).size)
  const visualSize = kindSize ?? number(visual.size)
  const shape = record(item.shape)
  const opacity = hundreds(color.opacity)
  const backgroundColorOpacity = hundreds(background.opacity)
  const border = number(item.border)
  const alignmentNext = alignment(display.alignment)
  const orderNext = own(DISPLAY_ORDERS, text(display.order))
  return {
    ...item,
    timestamp: item.timestamp ?? item.timeStamp,
    shape: shape.wide !== undefined || shape.tall !== undefined ? item.shape : { wide: item.wide === true, tall: item.tall === true },
    border: border ?? fallbackBorder ?? item.border,
    display: {
      ...display,
      ...(alignmentNext ? { alignment: alignmentNext } : {}),
      ...(orderNext ? { order: orderNext } : {}),
      gutter: tens(display.gutter) ?? display.gutter,
      name: { ...name, size: tens(name.size) ?? name.size },
      visual: { ...visual, size: tens(visualSize) ?? visual.size },
    },
    color: { ...color, opacity: opacity === undefined ? color.opacity : clamp(opacity, 0, 100) },
    background: { ...background, opacity: backgroundColorOpacity === undefined ? background.opacity : clamp(backgroundColorOpacity, 0, 100) },
  }
}

function upgradeGroup(value: unknown, fallbackBorder: number | undefined): AnyRecord {
  const group = record(value)
  return {
    ...group,
    items: Array.isArray(group.items) ? group.items.map(item => upgradeItem(item, fallbackBorder)) : group.items,
  }
}

/** Pre-7 stores the wallpaper as one `visual` block of 0-1 fractions; 7.0 splits it into image and video. */
function upgradeBackground(state: AnyRecord): AnyRecord | undefined {
  const raw = record(state.background)
  const visual = record(raw.visual)
  if (!Object.keys(raw).length || !Object.keys(visual).length) return undefined
  const type = visual.show === true ? (text(visual.type) === 'video' ? 'video' : 'image') : record(raw.color).by === 'custom' ? 'color' : 'theme'
  const percent = (value: unknown) => { const n = hundreds(value); return n === undefined ? undefined : clamp(Math.round(n), 0, 100) }
  const look = {
    blur: number(visual.blur) ?? 0,
    grayscale: percent(visual.grayscale),
    scale: hundreds(visual.scale),
    opacity: percent(visual.opacity),
    accent: percent(visual.accent),
    vignette: record(visual.vignette),
  }
  const media = (url: unknown) => ({ url: text(url), ...look })
  const { visual: _visual, ...rest } = raw
  return { ...rest, type, image: media(record(visual.image).url), video: media(record(visual.video).url) }
}

function upgradeTheme(state: AnyRecord): AnyRecord {
  const theme = record(state.theme)
  const color = record(theme.color)
  const hsl = record(color.hsl)
  const contrast = record(color.contrast)
  const radius = hundreds(theme.radius)
  const shadow = hundreds(theme.shadow)
  const font = record(theme.font)
  const background = upgradeBackground(state)
  let colorNext = color
  if (!Object.keys(record(color.range)).length) {
    // 7.0 derives the shade ramp from the old HSL colour and its dark/light contrast steps.
    const light = number(hsl.l) ?? 50
    const dark = number(contrast.dark) ?? 4
    const bright = number(contrast.light) ?? 4
    const start = clamp(Math.round(light - dark * 10), 0, 100)
    let end = clamp(Math.round(light + bright * 10), 0, 100)
    if (end <= start) end = clamp(start + 10, 0, 100)
    colorNext = {
      ...color,
      range: { primary: { h: number(hsl.h) ?? 222, s: number(hsl.s) ?? 14 } },
      contrast: { start, end },
      shades: number(color.shades) ?? 14,
    }
  }
  const family = (value: unknown) => typeof value === 'string' ? { name: value } : record(value)
  return {
    ...theme,
    color: colorNext,
    radius: radius === undefined ? theme.radius : radius,
    shadow: shadow === undefined ? theme.shadow : shadow,
    ...(Object.keys(font).length ? { font: { ...font, display: family(font.display), ui: family(font.ui) } } : {}),
    ...(background ? { background } : {}),
  }
}

function upgradeState(value: unknown): AnyRecord {
  const state = record(value)
  const layout = record(state.layout)
  const header = record(state.header)
  const clock = record(header.clock)
  const date = record(header.date)
  const menu = record(header.menu)
  const link = record(state.link)
  const linkItem = record(link.item)
  const next: AnyRecord = { ...state, layout: { ...layout }, header: { ...header }, theme: upgradeTheme(state) }

  // Pre-7 keeps the websites widget settings on `state.link`; 7.0 moves them to `state.bookmark`.
  if (!Object.keys(record(state.bookmark)).length && Object.keys(link).length) {
    const size = hundreds(linkItem.size)
    next.bookmark = { ...link, url: linkItem.url ?? link.url, newTab: linkItem.newTab ?? link.newTab, ...(size === undefined ? {} : { size }) }
  }

  const layoutSize = hundreds(layout.size)
  const align = alignment(layout.alignment)
  const layoutOrder = own(LAYOUT_ORDERS, text(layout.order).toLowerCase())
  const dateFormat = own(DATE_FORMATS, text(date.format).toLowerCase())
  next.layout = {
    ...layout,
    ...(align ? { alignment: align } : {}),
    ...(layoutOrder ? { order: layoutOrder } : {}),
    ...(layoutSize === undefined ? {} : { size: layoutSize }),
  }

  const sizeOf = (item: unknown) => { const size = hundreds(record(item).size); return size === undefined ? record(item).size : size }
  const order = Array.isArray(header.order) ? header.order : []
  // 7.0 removes the old add/accent buttons and appends the toolbar; a corner toolbar keeps its own order entry.
  const orderNext = order.flatMap(item => typeof item !== 'string' ? [] : item === 'menu' ? ['toolbar'] : item === 'editAdd' || item === 'colorAccent' ? [] : [item])
  if (Object.keys(menu).length && !orderNext.includes('toolbar')) orderNext.push('toolbar')
  next.header = {
    ...header,
    ...(order.length ? { order: orderNext } : {}),
    greeting: { ...record(header.greeting), size: sizeOf(header.greeting) },
    transitional: { ...record(header.transitional), size: sizeOf(header.transitional) },
    clock: { ...clock, hour: clock.hour ?? clock.hours, minute: clock.minute ?? clock.minutes, second: clock.second ?? clock.seconds, size: sizeOf(clock) },
    date: { ...date, ...(dateFormat ? { format: dateFormat } : {}), size: sizeOf(date) },
    search: { ...record(header.search), size: sizeOf(header.search) },
  }

  if (!Object.keys(record(state.toolbar)).length && Object.keys(menu).length) {
    const menuSize = hundreds(menu.size)
    next.toolbar = {
      location: 'header', position: 'bottom-right',
      ...(menuSize === undefined ? {} : { size: menuSize }),
      accent: { show: shown(header.colorAccent) ?? true },
      add: { show: shown(header.editAdd) ?? true },
      edit: { show: true },
    }
  }
  return next
}

/** A pre-7 backup in the version 7 shape this importer reads; `legacy` is false when nothing was changed. */
export function upgradeNightTabBackup(root: AnyRecord): { backup: AnyRecord; legacy: boolean } {
  if (!isLegacy(root)) return { backup: root, legacy: false }
  const state = record(root.state)
  const groups = Array.isArray(root.bookmarks) ? root.bookmarks : Array.isArray(root.bookmark) ? root.bookmark : []
  const fallbackBorder = number(record(record(state.bookmark).item).border) ?? number(record(record(state.link).item).border)
  const { nighttab: _marker, nightTab: _markerCased, bookmarks: _groups, ...rest } = root
  return {
    backup: { ...rest, nightTab: true, bookmark: groups.map(group => upgradeGroup(group, fallbackBorder)), state: upgradeState(state) },
    legacy: true,
  }
}
