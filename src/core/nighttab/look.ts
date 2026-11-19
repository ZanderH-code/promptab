import type { ProfileV2 } from '../schema/profile'
import { hexRgb, primaryRamp, type Ramp } from './palette'
import { own } from '../own'

type AnyRecord = Record<string, unknown>
type Variable = ProfileV2['custom']['variables'][number]
const record = (value: unknown): AnyRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
const number = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const shown = (value: unknown) => record(value).show === true
const n = (value: number) => String(Math.round(value * 10000) / 10000)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function rgbOf(value: unknown): { r: number; g: number; b: number } | undefined {
  const rgb = record(record(value).rgb)
  const channels = [rgb.r, rgb.g, rgb.b]
  return channels.every(channel => typeof channel === 'number' && Number.isFinite(channel)) ? { r: rgb.r as number, g: rgb.g as number, b: rgb.b as number } : undefined
}
const rgba = (color: { r: number; g: number; b: number }, alpha: number) => `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)} / ${n(Math.min(1, Math.max(0, alpha)))})`

/** HSL lightness (0-100) of a hex colour. */
function lightness(hex: string): number {
  const { r, g, b } = hexRgb(hex)
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255 * 100
}

/**
 * Lengths are multiples of nightTab's root font (16px, or 12px on narrow windows). Values a person can change
 * in settings stay variables: `--mnt-radius`, `--mnt-shadow-strength`, the theme colours, Interface scale (the
 * zoom on the layout), each widget's size (the zoom on its frame), and the `--nt-*` variables this look declares.
 */
const r = (multiple: number) => `calc(var(--nt-root) * ${n(multiple)})`
/** A length that must not grow with its widget's own size, because nightTab does not scale it there. */
const fixed = (length: string) => `calc(${length} / var(--mnt-widget-size, 1))`
const padding = (multiple = 1) => `calc(var(--nt-root) * var(--nt-padding) * ${n(0.05 * multiple)})`
const gutter = (multiple = 1) => `calc(var(--nt-root) * var(--nt-gutter) * ${n(0.05 * multiple)})`
/** nightTab's corner radius in units of the element's font, read from the radius setting. */
const radius = (multiple = 1) => multiple === 1 ? 'var(--nt-radius)' : `calc(var(--nt-radius) * ${n(multiple)})`
/** A plate in one of nightTab's shades at an opacity variable (0-100), `fallback` when the look does not declare it. */
const plate = (shade: string, opacity: string, fallback: number) => `color-mix(in srgb, var(${shade}) calc(var(${opacity}, ${n(fallback)}) * 1%), transparent)`

function ramp(theme: AnyRecord, light: boolean): Ramp {
  const color = record(theme.color), primary = record(record(color.range).primary), contrast = record(color.contrast)
  return primaryRamp(number(primary.h, 222), number(primary.s, 14), number(contrast.start, 8), number(contrast.end, 88), number(color.shades, 14), light)
}

/**
 * nightTab's large shadow: four layers whose offset, blur and darkness grow with the shadow strength. `--nt-m`
 * is the strength setting (Promptab 0-100 is nightTab's 0-400) times 3/100, switched off by `--nt-hover-shadow`.
 */
const SHADOW = [2, 4, 8, 16].map((f, index) => `0 calc(var(--nt-m) * ${n(0.02 * f)}em) calc(var(--nt-m) * ${n(0.06 * f)}em) rgb(0 0 0 / calc(var(--nt-m) * ${n(0.02 * (index + 1))}))`).join(', ')

/** nightTab's text on the accent: white below 55% luminance, black above, recomputed when the accent changes. */
const ON_ACCENT = (() => {
  const channel = 'clamp(0, (140.25 - (0.2721 * r + 0.7152 * g + 0.1255 * b)) * 1000, 255)'
  return `rgb(from var(--mnt-accent) ${channel} ${channel} ${channel})`
})()

const JUSTIFY: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' }
const FLOW: Record<string, string> = { 'vertical header-bookmark': 'column', 'vertical bookmark-header': 'column-reverse', 'horizontal header-bookmark': 'row', 'horizontal bookmark-header': 'row-reverse' }
const MARGIN_TOWARDS: Record<string, string> = { column: 'bottom', 'column-reverse': 'top', row: 'right', 'row-reverse': 'left' }
const PLACE: Record<string, [string, string]> = { top: ['flex-start', 'flex-start'], center: ['center', 'center'], bottom: ['flex-end', 'flex-end'], left: ['flex-start', 'flex-start'], right: ['flex-end', 'flex-end'] }

const range = (name: string, zh: string, en: string, min: number, max: number, value: number): Variable => ({ name, label: { 'zh-CN': zh, en }, type: 'range', min, max, unit: '', default: clamp(Math.round(value), min, max) })
const toggle = (name: string, zh: string, en: string, on: boolean): Variable => ({ name, label: { 'zh-CN': zh, en }, type: 'toggle', default: on ? 1 : 0 })

export type NightTabLook = { css: string; variables: Variable[] }

/**
 * Custom CSS that gives Promptab nightTab's look for one backup: sizes, spacing, plates and hover, written from
 * nightTab's documented behaviour (no nightTab CSS is copied) with public Promptab classes only. It is a starting
 * point: every value it reads is a setting or one of the variables it returns, which appear under Theme.
 */
export function nightTabLook(state: AnyRecord, profile: ProfileV2, parts: { header: boolean; bookmarks: boolean }): NightTabLook {
  const layout = record(state.layout), header = record(state.header), bookmark = record(state.bookmark), toolbar = record(state.toolbar), theme = record(state.theme), group = record(state.group)
  const direction = layout.direction === 'horizontal' ? 'horizontal' : 'vertical'
  const flow = parts.header && parts.bookmarks ? FLOW[`${direction} ${layout.order === 'bookmark-header' ? 'bookmark-header' : 'header-bookmark'}`] : 'column'
  const horizontal = flow.startsWith('row')
  const themeLayout = record(theme.layout), themeHeader = record(theme.header), themeBookmark = record(theme.bookmark)
  const layoutColor = record(themeLayout.color), headerColor = record(themeHeader.color), bookmarkColor = record(themeBookmark.color)
  const allTheme = [layoutColor, headerColor, bookmarkColor].every(color => color.by !== 'custom')
  const divider = number(record(themeLayout.divider).size, 0)
  const showDivider = divider > 0 && parts.header
  const order = Array.isArray(header.order) ? header.order : ['clock', 'date', 'search', 'toolbar']
  const hasSearch = parts.header && order.includes('search') && shown(header.search)
  const hasToolbar = toolbar.location === 'corner' || (parts.header && order.includes('toolbar'))
  const hasOpenAll = parts.bookmarks && profile.bookmarks.groups.some(item => item.openAll === true)
  const css: string[] = []
  const rule = (selector: string, body: string) => css.push(`${selector} { ${body} }`)

  // The variables a person can tune afterwards, starting at the backup's values.
  const searchOpacity = number(record(themeHeader.search).opacity, 0)
  const toolbarOpacity = number(record(theme.toolbar).opacity, 0)
  const openAllOpacity = number(record(record(theme.group).openAll).opacity, 100)
  const variables: Variable[] = [
    range('--nt-width', 'nightTab 布局宽度（占窗口 %）', 'nightTab layout width (% of window)', 0, 100, number(layout.width, 80)),
    range('--nt-padding', 'nightTab 区域内边距', 'nightTab area padding', 0, 200, number(layout.padding, 40)),
    range('--nt-gutter', 'nightTab 间距', 'nightTab gutter', 0, 200, number(layout.gutter, 20)),
    ...(hasSearch ? [range('--nt-search-opacity', 'nightTab 搜索框底板不透明度', 'nightTab search plate opacity', 0, 100, searchOpacity)] : []),
    ...(hasToolbar ? [range('--nt-toolbar-opacity', 'nightTab 工具栏底板不透明度', 'nightTab toolbar plate opacity', 0, 100, toolbarOpacity)] : []),
    ...(hasOpenAll ? [range('--nt-open-all-opacity', 'nightTab “打开全部”底板不透明度', 'nightTab “Open all” plate opacity', 0, 100, openAllOpacity)] : []),
    ...(parts.bookmarks ? [
      toggle('--nt-line', 'nightTab 网站底部强调色线', 'nightTab accent line under websites', shown(bookmark.line)),
      toggle('--nt-hover-zoom', 'nightTab 悬停时放大网站', 'nightTab enlarge websites on hover', shown(bookmark.hoverScale)),
      toggle('--nt-hover-shadow', 'nightTab 悬停时的阴影', 'nightTab shadow on hover', shown(bookmark.shadow)),
    ] : []),
  ]

  // Colours follow the theme: the page and plate colours are the theme's background and surface, and nightTab's
  // hover shades are the surface one ramp step (or two) further from the page, so they follow a changed surface.
  const shadeVariables = (light: boolean) => {
    const shades = ramp(theme, light)
    const step = (role: number) => n(lightness(shades.shade(role)) - lightness(shades.shade(2)))
    const text = (role: number) => shades.text(role) === shades.text(1) ? 'var(--mnt-text)' : shades.text(role)
    return [`--nt-030: hsl(from var(--mnt-surface) h s calc(l + ${step(3)}))`, `--nt-040: hsl(from var(--mnt-surface) h s calc(l + ${step(4)}))`, `--nt-text-020: ${text(2)}`, `--nt-text-030: ${text(3)}`].join('; ')
  }
  rule('.mnt-root', ['--nt-unit: 1', '--nt-root: calc(16px * var(--nt-unit))', '--nt-radius: calc(var(--mnt-radius) * var(--nt-unit))', '--nt-010: var(--mnt-bg)', '--nt-020: var(--mnt-surface)', '--nt-text-010: var(--mnt-text)', `--nt-accent-text: ${ON_ACCENT}`].join('; '))
  rule(':root:not([data-theme="light"]) .mnt-root', shadeVariables(false))
  rule(':root[data-theme="light"] .mnt-root', shadeVariables(true))
  css.push('@media (max-width: 899px) { .mnt-root { --nt-unit: 0.75; } }')
  const displayFont = record(record(theme.font).display), uiFont = record(record(theme.font).ui)
  const displayWeight = number(displayFont.weight, 400), uiWeight = number(uiFont.weight, 400)
  const displayStyle = displayFont.style === 'italic' ? 'italic' : 'normal', uiStyle = uiFont.style === 'italic' ? 'italic' : 'normal'

  // The layout box: a share of the window (at most the content width), placed by the alignment. Interface scale
  // zooms the layout; the share of the window stays the same, as nightTab's size does not change it.
  const [vertical, across] = String(layout.alignment ?? 'center-center').split('-')
  rule('.mnt-root', `justify-content: ${own(PLACE, vertical)?.[0] ?? 'center'}; align-items: ${own(PLACE, across)?.[1] ?? 'center'}`)
  rule('.mnt-layout', [
    'display: flex !important', `flex-direction: ${flow}`, 'flex-wrap: nowrap', 'width: min(calc(max(10, var(--nt-width)) * 1vw / var(--mnt-scale, 1)), var(--mnt-content-width, 100vw))', 'max-width: none', 'min-height: 0', 'margin: 0', 'padding: 0', 'gap: 0',
    'transform: none', 'grid-template: none', `font-family: var(--mnt-font-ui)`, `font-weight: ${uiWeight}`, `font-style: ${uiStyle}`, `color: var(--nt-text-010)`, 'align-self: auto',
    ...(horizontal ? ['align-items: stretch'] : []),
    ...(layoutColor.by === 'custom' && rgbOf(layoutColor) ? [`background: ${rgba(rgbOf(layoutColor)!, number(layoutColor.opacity, 10) / 100)}`, `border-radius: ${radius()}`, `backdrop-filter: blur(${r(number(layoutColor.blur, 0) * 0.01)})`] : []),
  ].join('; '))
  rule('.mnt-root > .mnt-layout', `margin-block: ${vertical === 'top' ? '0 auto' : vertical === 'bottom' ? 'auto 0' : 'auto'}; margin-inline: ${across === 'left' ? '0 auto' : across === 'right' ? 'auto 0' : 'auto'}`)
  rule('.mnt-layout > .mnt-area', `box-sizing: border-box; min-width: 0; min-height: 0; margin: 0; padding: ${padding()}; border-radius: 0; background: none; backdrop-filter: none`)

  const area = record(layout.area), headerArea = record(area.header), bookmarkArea = record(area.bookmark)
  const headerWidth = number(headerArea.width, 100), bookmarkWidth = number(bookmarkArea.width, 100)
  const selfAlign = (justify: unknown) => justify === 'left' ? 'flex-start' : justify === 'right' ? 'flex-end' : 'center'
  if (horizontal) {
    rule('.mnt-layout > [data-area="header"]', `order: 1; flex: 1 1 ${n(headerWidth - bookmarkWidth / 2)}%; align-self: center`)
    rule('.mnt-layout > [data-area="bookmarks"]', `order: 3; flex: 1 1 ${n(bookmarkWidth - headerWidth / 2)}%`)
  } else {
    rule('.mnt-layout > [data-area="header"]', `order: 1; flex: none; width: ${n(headerWidth)}%; align-self: ${selfAlign(headerArea.justify)}`)
    rule('.mnt-layout > [data-area="bookmarks"]', `order: 3; flex: none; width: ${n(bookmarkWidth)}%; align-self: ${selfAlign(bookmarkArea.justify)}`)
  }
  const areaPlate = (selector: string, color: AnyRecord) => {
    const rgb = rgbOf(color)
    if (color.by === 'custom' && rgb) rule(selector, `background: ${rgba(rgb, number(color.opacity, 10) / 100)}`)
  }
  areaPlate('.mnt-layout > [data-area="header"]', headerColor)
  areaPlate('.mnt-layout > [data-area="bookmarks"]', bookmarkColor)
  if (showDivider) {
    const thickness = r(divider * 0.25)
    rule('.mnt-layout::before', `content: ''; order: 2; flex: none; align-self: stretch; ${horizontal ? `width: ${thickness}` : `height: ${thickness}`}; background: var(--mnt-accent); border-radius: ${allTheme ? radius() : '0'}`)
  } else if (parts.header && parts.bookmarks && allTheme) {
    // Without a divider the two areas share one padding between them.
    rule('.mnt-layout > [data-area="header"]', `margin-${MARGIN_TOWARDS[flow]}: calc(-1 * ${padding()})`)
  }

  // Header: one wrapping row of items, each at least 2.5em tall. Each item's size is its widget size (a zoom).
  const justify = own(JUSTIFY, String(record(header.item).justify)) ?? 'flex-start'
  rule('.mnt-layout > [data-area="header"]', `display: flex; flex-flow: row wrap; align-items: center; align-content: center; justify-content: ${justify}; gap: ${gutter()}`)
  rule('[data-area="header"] > .mnt-widget', `display: flex; align-items: center; justify-content: ${justify}; flex: none; box-sizing: border-box; min-width: 0; min-height: ${fixed(r(2.5))}; margin: 0; padding: 0; text-align: start`)

  // Clock and date: parts in the display font, 1.5em, 0.25em apart, separators in the accent.
  const partText = (kind: 'clock' | 'date') => {
    rule(`.mnt-${kind}`, `display: inline-flex; align-items: baseline; flex-wrap: nowrap; gap: ${r(0.25)}; margin: 0; padding: 0; font-family: var(--mnt-font-display); font-weight: ${displayWeight}; font-style: ${displayStyle}; font-size: ${r(1.5)}; line-height: 1.2; letter-spacing: normal; text-transform: none; font-variant-numeric: normal; color: var(--nt-text-010); text-shadow: none; opacity: 1`)
    rule(`.mnt-${kind} :is(.mnt-${kind}-part, .mnt-${kind}-separator)`, `font-size: ${r(1.5)}; line-height: 1.2; white-space: nowrap`)
    rule(`.mnt-${kind}-separator:empty`, 'display: none')
  }
  partText('clock')
  rule('.mnt-clock > span', `display: inline-flex; align-items: baseline; gap: ${r(0.25)}`)
  rule('[data-widget="clock"] .intro', 'display: contents')
  partText('date')
  rule('.mnt-clock-separator, .mnt-date-separator', 'color: var(--mnt-accent)')
  rule('[data-widget="greeting"]', `font-family: var(--mnt-font-display); font-size: ${r(1.5)}; line-height: 1.2; color: var(--nt-text-010)`)

  // Search: a plain field 2.5em tall on a plate in the second shade.
  const search = record(header.search)
  const searchWidth = record(search.width)
  rule('[data-area="header"] > [data-widget="search"]', searchWidth.by === 'custom' ? `flex: 0 0 ${n(number(searchWidth.size, 30))}%` : 'flex: 1 1 0')
  rule('.mnt-search', `box-sizing: border-box; width: 100%; height: ${r(2.5)}; min-height: 0; margin: 0; padding: 0 ${r(1.25)}; border: 0; border-radius: ${radius()}; background: ${plate('--nt-020', '--nt-search-opacity', searchOpacity)}; box-shadow: none; backdrop-filter: none`)
  rule('.mnt-search:focus-within', `border: 0; box-shadow: none; background: ${plate('--nt-020', '--nt-search-opacity', searchOpacity)}`)
  rule('.mnt-search :is(.search-icon, kbd, button)', 'display: none')
  rule('.mnt-search-input', `width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: none; font-family: var(--mnt-font-ui); font-size: ${r(1)}; color: var(--nt-text-010); text-align: ${['left', 'center', 'right'].includes(String(record(search.text).justify)) ? record(search.text).justify : 'left'}`)
  rule('.mnt-search-input::placeholder', `color: ${searchOpacity >= 40 ? 'var(--nt-040)' : 'var(--nt-text-010)'}; opacity: 1`)

  // Items marked to start a new line take the whole row.
  for (const item of ['clock', 'date', 'search', 'greeting', 'transitional', 'toolbar']) {
    if (record(header[item]).newLine === true || (item === 'toolbar' && toolbar.newLine === true)) rule(`[data-area="header"] > [data-widget-id="${item === 'transitional' ? 'greeting' : item}"]`, 'flex-basis: 100%')
  }

  // Toolbar: joined plates in the second shade; below 40% opacity the buttons read as links.
  const linkLook = toolbarOpacity < 40
  rule('.mnt-widget-toolbar', `--mnt-toolbar-plate: ${plate('--nt-020', '--nt-toolbar-opacity', toolbarOpacity)}; --mnt-toolbar-plate-hover: ${plate(linkLook ? '--nt-020' : '--nt-030', '--nt-toolbar-opacity', toolbarOpacity)}; --mnt-toolbar-button-height: ${r(2.5)}; font-size: ${r(1)}`)
  rule('.mnt-widget-toolbar[data-toolbar-style="buttons"]', '--mnt-radius: var(--nt-radius)')
  rule('.mnt-widget-toolbar[data-toolbar-style="buttons"] > :is(button, .mnt-toolbar-accent)', `width: ${r(4)}; height: ${r(2.5)}; min-height: ${r(2.5)}; padding: ${r(0.25)} ${r(1.25)}; color: ${linkLook ? 'var(--nt-text-010)' : 'var(--nt-text-020)'}`)
  rule('.mnt-widget-toolbar[data-toolbar-style="buttons"] svg', `width: ${r(1.5)}; height: ${r(1.5)}`)
  rule('.mnt-accent-dot', `width: ${r(1.25)}; height: ${r(1.25)}; box-shadow: ${linkLook ? `0 0 0 ${r(0.1875)} var(--nt-text-010)` : 'none'}`)
  rule('.mnt-corner-toolbar', `margin: 0; top: auto; right: auto; bottom: auto; left: auto`)
  const position = String(toolbar.position ?? 'bottom-right')
  rule('.mnt-corner-toolbar', `${position.startsWith('top') ? 'top' : 'bottom'}: ${fixed(r(1))}; ${position.endsWith('left') ? 'left' : 'right'}: ${fixed(r(1))}`)

  // Websites: block plates on an auto-filling grid. The websites widget's size zooms the tiles and their gaps,
  // as nightTab's website size does; group headings and the space between groups keep their own size.
  const list = bookmark.style === 'list'
  const strip = list ? 1.5 : 2.25
  const pad = list ? '0.5em' : '1em'
  rule('[data-area="bookmarks"]', 'container: nt-websites / inline-size')
  // Groups stand two gutters apart.
  rule('.mnt-bookmark-block', `display: flex; flex-direction: column; gap: ${fixed(gutter(2))}; margin: 0; padding: 0; border: 0; background: none; box-shadow: none`)
  rule('.mnt-bookmark-block .mnt-group-section', 'margin: 0; padding: 0')
  rule('.mnt-bookmark-block .grid', `--mnt-block-min: ${list ? 20 : 11}em; --mnt-block-row: ${list ? 4 : 10}em; --mnt-block-gap: calc(var(--nt-gutter) * 0.05em); font-size: ${r(1)}; font-family: var(--mnt-font-ui); padding: 0; margin: 0`)
  css.push('@container nt-websites (max-width: 700px) { .mnt-bookmark-block .grid > * { grid-column: auto; grid-row: auto; } }')
  rule('.mnt-bookmark-block .shortcut-wrap', 'position: relative; height: 100%; min-width: 0; margin: 0; padding: 0')
  // `--nt-l` is the accent line under the plate (0.25em when on); `--nt-band` the accent showing below the front plate.
  rule('.mnt-bookmark-block .shortcut', [
    '--nt-l: calc(0.25em * var(--nt-line, 0))', '--nt-l-off: calc(0.25em - var(--nt-l))',
    'position: relative', 'isolation: isolate', 'box-sizing: border-box', 'width: 100%', 'height: 100%', 'overflow: hidden', 'border: 0', 'border-radius: 0', 'background: none', 'box-shadow: none', 'transform: none',
    `padding: ${list ? '0.5em 1.25em' : '1em'}`, `padding-bottom: calc(${pad} + var(--nt-l))`, 'gap: var(--mnt-tile-gap, 0.625em)', 'color: var(--nt-text-020)',
    'transition: transform .2s ease-in-out, box-shadow .2s ease-in-out, padding-bottom .2s ease-in-out',
  ].join('; '))
  if (!profile.bookmarks.groups.some(item => item.items.some(link => link.tile?.align))) rule('.mnt-bookmark-block .shortcut', list ? 'flex-direction: row; justify-content: flex-start; align-items: center; text-align: left' : 'justify-content: center; align-items: center')
  // The front plate.
  rule('.mnt-bookmark-block .shortcut > .mnt-link-backdrop', `display: block; inset: 0 0 var(--nt-l) 0; border-radius: ${radius()}; background: color-mix(in srgb, var(--mnt-tile-bg, var(--nt-020)) calc(var(--mnt-tile-opacity, 1) * 100%), transparent); box-sizing: border-box; border: var(--mnt-tile-border, 0) solid var(--mnt-accent); transition: background-color .2s, bottom .2s ease-in-out, border-radius .2s`)
  rule('.mnt-bookmark-block .shortcut[style*="--mnt-tile-border"]', 'border: 0')
  // The accent back plate: a bar under the front (taller behind a solid plate), and the strip behind the address on hover.
  const back = (top: string, band: string) => `inset: ${top} 0.25em var(--nt-l-off); clip-path: inset(calc(100% - ${band}) 0 0 0)`
  rule('.mnt-bookmark-block .shortcut::before', `content: ''; position: absolute; z-index: -2; ${back('0.25em', 'calc(1em + var(--nt-l))')}; border-radius: ${radius()}; background: var(--mnt-accent); transition: clip-path .2s ease-in-out, inset .2s ease-in-out; pointer-events: none`)
  rule('.mnt-bookmark-block .shortcut[style*="--mnt-tile-opacity"]::before', back('0.25em', 'var(--nt-l)'))
  rule('.mnt-bookmark-block .shortcut .shortcut-icon', `display: inline-flex; align-items: center; justify-content: center; width: auto; height: auto; padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; color: var(--mnt-accent); font-family: var(--mnt-font-display); font-weight: ${displayWeight}; font-size: calc(2.5em * var(--mnt-tile-icon-scale, 1)); line-height: 1; transition: color .2s`)
  rule('.mnt-bookmark-block .shortcut .shortcut-icon :is(svg, img)', 'width: 1em; height: 1em')
  rule('.mnt-bookmark-block .shortcut[data-tile-hide-icon] .shortcut-icon', 'display: none')
  // Icons follow the visual colour, including its hover colour.
  rule('.mnt-bookmark-block .shortcut .shortcut-icon svg', 'color: inherit !important')
  rule('.mnt-bookmark-block .shortcut > .mnt-link-name', `color: var(--nt-text-020); font-size: calc(0.7em * var(--mnt-tile-name-scale, 1)); line-height: 1.2; font-weight: ${uiWeight}`)

  // Hover: lift, shadow and the next shade; with the address shown (Websites → Show address), the address strip.
  const hover = '.mnt-bookmark-block .shortcut:is(:hover, :focus-visible)'
  rule(hover, `--nt-m: calc(var(--mnt-shadow-strength, 40) * 0.12 * var(--nt-hover-shadow, 0)); transform: scale(calc(1 + 0.05 * var(--nt-hover-zoom, 0))); box-shadow: ${SHADOW}; outline: none`)
  rule('.mnt-bookmark-block .shortcut:active', 'transform: scale(calc(1 + 0.04 * var(--nt-hover-zoom, 0)))')
  rule(`${hover} > .mnt-link-backdrop`, 'background: color-mix(in srgb, var(--mnt-tile-bg, var(--nt-030)) calc(var(--mnt-tile-opacity, 1) * 100%), transparent)')
  rule(`${hover} .shortcut-icon`, 'color: var(--nt-text-030)')
  rule('.mnt-bookmark-block .mnt-link::after', 'content: none; display: none')
  const shownUrl = `[data-show-url] ${hover}`
  rule(shownUrl, `padding-bottom: calc(${pad} + ${strip}em)`)
  rule(`${shownUrl} > .mnt-link-backdrop`, `bottom: ${strip}em; border-radius: ${radius()} ${radius()} ${radius(0.25)} ${radius(0.25)}`)
  rule(`${shownUrl}::before`, back('0', `${strip + 1}em`))
  rule(`[data-show-url] .mnt-bookmark-block .shortcut[style*="--mnt-tile-opacity"]:is(:hover, :focus-visible)::before`, back('0', `${strip}em`))
  rule('[data-show-url] .mnt-bookmark-block .mnt-link::after', [
    'content: attr(data-link-url)', 'display: block', 'position: absolute', 'z-index: 1', 'top: auto', 'left: 0.25em', 'right: 0.25em', 'bottom: 0', `height: ${n(strip / 0.75)}em`, `line-height: ${n(strip / 0.75)}em`,
    `padding: 0 ${n(1 / 0.75)}em`, 'box-sizing: border-box', 'font-size: 0.75em', 'font-family: var(--mnt-font-ui)', 'color: var(--nt-accent-text)', 'background: none', 'border: 0', 'border-radius: 0', 'box-shadow: none',
    'white-space: nowrap', 'overflow: hidden', 'text-overflow: ellipsis', 'text-align: center', 'opacity: 1', 'translate: 0 100%', 'transform: none', 'transition: translate .4s cubic-bezier(.8, .8, .4, 1.4)', 'pointer-events: none',
  ].join('; '))
  rule('[data-show-url] .mnt-bookmark-block .mnt-link:is(:hover, :focus-visible)::after', 'translate: 0 0')
  rule('[data-show-url] .mnt-bookmark-block .mnt-link:is([data-tile-align$="left"])::after', 'text-align: left')
  rule('[data-show-url] .mnt-bookmark-block .mnt-link:is([data-tile-align$="right"])::after', 'text-align: right')
  if (list) rule('[data-show-url] .mnt-bookmark-block .mnt-link:not([data-tile-align])::after', 'text-align: left')

  // A faint plate (under 40% in the website's editor) shows the name in the page's text colour.
  rule('.mnt-bookmark-block .shortcut[data-tile-faint] > .mnt-link-name', 'color: var(--nt-text-010)')

  // Groups: nightTab's name and open-all text button, when a group shows them.
  const nameSize = number(record(group.name).size, 100) / 100
  const openAllSize = number(record(group.openAll).size, 100) / 100
  rule('.mnt-bookmark-block .mnt-group-title', `margin: 0 0 ${fixed(gutter())}; padding: 0; border: 0; gap: ${fixed(r(1))}; min-height: ${fixed(r(2.5 * openAllSize))}; justify-content: ${own(JUSTIFY, String(record(group.area).justify)) ?? 'flex-start'}`)
  rule('.mnt-bookmark-block .mnt-group-title :is(.line, .count)', 'display: none')
  rule('.mnt-bookmark-block .mnt-group-name', `font-family: var(--mnt-font-display); font-size: ${fixed(r(1.5 * nameSize))}; color: var(--nt-text-010); letter-spacing: normal; text-transform: none`)
  // nightTab groups cannot be folded away; an open group hides its fold button (a folded one keeps it, to reopen).
  rule('.mnt-bookmark-block .mnt-group-toggle[aria-expanded="true"]', 'display: none')
  // Open all is a text button on a plate in the second shade, like the search field.
  const openAllText = openAllOpacity < 40 ? 'var(--nt-text-010)' : 'var(--nt-text-020)'
  rule('.mnt-bookmark-block .mnt-group-open-all', `display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: auto; height: ${fixed(r(2.5 * openAllSize))}; min-width: 0; margin: 0; padding: 0 ${fixed(r(1.25 * openAllSize))}; border: 0; border-radius: ${fixed(radius(openAllSize))}; background: ${plate('--nt-020', '--nt-open-all-opacity', openAllOpacity)}; color: ${openAllText}; font-family: var(--mnt-font-ui); font-size: ${fixed(r(openAllSize))}; letter-spacing: normal; text-transform: none; line-height: 1; cursor: pointer; transition: background-color .2s`)
  rule('.mnt-bookmark-block .mnt-group-open-all:is(:hover, :focus-visible)', `background: ${plate('--nt-030', '--nt-open-all-opacity', openAllOpacity)}; color: ${openAllOpacity < 40 ? 'var(--nt-text-010)' : 'var(--nt-text-030)'}`)
  rule('.mnt-bookmark-block .mnt-group-open-all > svg', 'display: none')
  rule('.mnt-bookmark-block .mnt-group-open-all > .mnt-group-open-all-text', 'display: inline')

  // Background media: opacity, blur, grayscale, zoom and vignette strength are the Background settings (the
  // importer sets them); only the vignette's shape is nightTab's: clear to `end`, darkest from `start`.
  const background = record(theme.background)
  const type = String(background.type ?? '')
  if (type === 'image' || type === 'video') {
    const vignette = record(record(background[type]).vignette)
    rule('.wallpaper-vignette', `inset: calc(-1 * var(--nt-root)); background: radial-gradient(circle, transparent ${n(number(vignette.end, 70))}%, rgb(0 0 0 / var(--vignette, 0%)) ${n(number(vignette.start, 90))}%)`)
  }
  return { css: `/* nightTab look, generated by the importer. Its values are settings or the nightTab variables under Theme; edit freely. Importing again replaces it. */\n${css.join('\n')}\n`, variables }
}
