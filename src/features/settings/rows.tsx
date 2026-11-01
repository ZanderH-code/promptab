import { Check, Minus, Plus, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { isAssetFont } from '../../core/font'
import { searchUrl, type Settings } from '../../core/model'
import { RANGES, darkSurface, lightSurface } from '../../core/schema/defaults'
import type { ProfileV2 } from '../../core/schema/profile'
import type { MessageKey, MessageRef, Translate } from '../../i18n'
import type { ChangeKind } from '../../store/history'
import type { ProfileStore } from '../../store/profile'
import { Dropdown } from '../../ui/Dropdown'
import { BackupSection } from './BackupSection'
import { ColorField, RangeField, Row, Segmented, Toggle } from './controls'
import { AiWorkbench } from './AiWorkbench'
import { CssEditor } from './CssEditor'
import { FontUpload } from './FontUpload'
import { ProfileSection } from './ProfileSection'
import { WallpaperContrast } from './WallpaperContrast'
import { FONT_KEYS, PRESETS, applyPreset, colorsFor, contrastIssues, editTheme, fixedColors, isFontKey, thumbnailTokens, withColors, type BaseColors, type ThemeMode } from './themeApi'

export const TABS = ['appearance', 'background', 'layout', 'widgets', 'shortcuts', 'search', 'style', 'ai', 'data', 'about'] as const
export type TabId = (typeof TABS)[number]

/** One searchable setting. `keys` are the localized labels (including option names) the search matches against. */
export type Item = { id: string; group?: MessageKey; keys: MessageKey[]; words?: string[]; node: ReactNode }

export type Ctx = {
  t: Translate
  s: Settings
  profile: ProfileV2
  mode: ThemeMode
  store: StoreApi<ProfileStore>
  change: (update: (profile: ProfileV2) => ProfileV2, kind?: ChangeKind) => void
  patch: (changes: Partial<Settings>) => void
  onWallpaperFile: (file?: File) => void
  onWallpaperRemove: () => void
  onReset: () => void
  onError: (error: MessageRef) => void
  /** Safe mode is on: custom CSS is paused for this page. */
  safe: boolean
  /** Commit the running AI preview to the active profile (with the usual undo snapshot). */
  onApplyPreview: () => void
}

const SEARCH_ENGINES = [
  { value: 'https://www.google.com/search?q={query}', label: 'Google' },
  { value: 'https://www.bing.com/search?q={query}', label: 'Bing' },
]
const BAIDU = 'https://www.baidu.com/s?wd={query}'

const touch = (profile: ProfileV2): ProfileV2 => ({ ...profile, meta: { ...profile.meta, updatedAt: new Date().toISOString() } })

function Select({ ctx, label, value, options, onChange, wide }: { ctx: Ctx; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; wide?: boolean }) {
  return <Dropdown theme={ctx.mode} label={label} value={value} options={options} onChange={onChange} fullWidth={wide} />
}

// ---- appearance -------------------------------------------------------------------------------------------

const derivedSurface = (mode: ThemeMode, colors: BaseColors, bg = colors.bg) => (mode === 'dark' ? darkSurface(bg, colors.text) : lightSurface(bg))

function fontOptions(ctx: Ctx, current: string) {
  const { t } = ctx
  const labels: Record<(typeof FONT_KEYS)[number], string> = { system: t('settings.fontSystem'), serif: t('settings.fontSerif'), mono: t('settings.fontMono'), rounded: t('settings.fontRounded'), 'barlow-condensed': t('font.barlowCondensed'), cormorant: t('font.cormorant'), outfit: t('font.outfit') }
  return [...FONT_KEYS.map(value => ({ value: value as string, label: labels[value] })), ...(isFontKey(current) ? [] : [{ value: current, label: isAssetFont(current) ? t('font.uploaded', { name: current.slice(10, 18) }) : t('common.custom') }])]
}

function presetBackground(preset: ProfileV2['background']): CSSProperties {
  return preset.type === 'gradient' && preset.gradient ? { background: `linear-gradient(${preset.gradient.angle}deg, ${preset.gradient.stops.join(', ')})` } : {}
}

export function appearanceItems(ctx: Ctx): Item[] {
  const { t, profile, mode, change } = ctx
  const lang = ctx.s.language
  const theme = profile.theme
  const colors = colorsFor(theme, mode)
  const setColor = (key: keyof BaseColors, value: string) => change(p => {
    const current = colorsFor(p.theme, mode)
    const next = { ...current, [key]: value }
    if (key === 'bg' && current.surface === derivedSurface(mode, current)) next.surface = derivedSurface(mode, current, value)
    return touch({ ...p, theme: withColors(p.theme, mode, next) })
  })
  const setTheme = (changes: Partial<ProfileV2['theme']>) => change(p => touch({ ...p, theme: editTheme(p.theme, changes) }))
  const issues = contrastIssues(theme, mode)
  const colorName = { colorText: 'settings.colorText', colorMuted: 'settings.colorMuted', colorOnAccent: 'settings.colorOnAccent', colorSurface: 'settings.colorSurface', background: 'settings.background', accent: 'settings.accent' } as const
  const fontRow = (which: 'display' | 'ui', label: MessageKey): Item => ({
    id: `font-${which}`, group: 'settings.typography', keys: [label, 'settings.fontSystem', 'settings.fontSerif', 'settings.fontMono', 'settings.fontRounded', 'font.barlowCondensed', 'font.cormorant', 'font.outfit'],
    node: <Row label={t(label)}><Select ctx={ctx} label={t(label)} value={theme.font[which]} options={fontOptions(ctx, theme.font[which])} onChange={value => setTheme({ font: { ...theme.font, [which]: value } })} /></Row>,
  })
  const range = (id: string, label: MessageKey, value: number, bounds: { min: number; max: number }, set: (value: number) => void, extra: { step?: number; unit?: string } = {}): Item => ({
    id, group: 'settings.shapeGroup', keys: [label],
    node: <RangeField t={t} label={t(label)} value={value} min={bounds.min} max={bounds.max} {...extra} onChange={set} />,
  })
  return [
    {
      id: 'mode', keys: ['settings.theme', 'settings.themeSystem', 'settings.themeDark', 'settings.themeLight'],
      node: (
        <Row label={t('settings.theme')}>
          <Select ctx={ctx} label={t('settings.theme')} value={theme.mode} onChange={value => change(p => touch({ ...p, theme: { ...p.theme, mode: value as ThemeMode | 'system' } }))}
            options={[{ value: 'system', label: t('settings.themeSystem') }, { value: 'dark', label: t('settings.themeDark') }, { value: 'light', label: t('settings.themeLight') }]} />
        </Row>
      ),
    },
    {
      id: 'presets', keys: ['settings.presets'], words: PRESETS.flatMap(preset => [preset.name['zh-CN'], preset.name.en]),
      node: (
        <div className="sd-presets" role="group" aria-label={t('settings.presets')}>
          {PRESETS.map(preset => {
            const applied = applyPreset(profile, preset)
            const tokens = thumbnailTokens(applied.theme, preset.theme.mode === 'light' ? 'light' : 'dark')
            const name = preset.name[lang]
            return (
              <button key={preset.id} type="button" className="sd-preset" aria-pressed={theme.preset === preset.id} aria-label={name} title={name} onClick={() => change(p => touch(applyPreset(p, preset)), 'preset')}>
                <span className="sd-preset-card" style={{ ...tokens, ...presetBackground(applied.background) } as CSSProperties}>
                  <span className="sd-preset-title">Aa</span>
                  <span className="sd-preset-panel"><span className="sd-preset-line" /><span className="sd-preset-dot" /></span>
                </span>
                <span className="sd-preset-name">{name}{theme.preset === preset.id && <Check size={12} strokeWidth={1.5} aria-hidden="true" />}</span>
              </button>
            )
          })}
        </div>
      ),
    },
    { id: 'color-bg', group: 'settings.colors', keys: ['settings.background', 'settings.colors'], node: <ColorField t={t} label={t('settings.background')} value={colors.bg} onChange={value => setColor('bg', value)} /> },
    { id: 'color-surface', group: 'settings.colors', keys: ['settings.colorSurface', 'settings.colors'], node: <ColorField t={t} label={t('settings.colorSurface')} value={colors.surface} onChange={value => setColor('surface', value)} /> },
    { id: 'color-text', group: 'settings.colors', keys: ['settings.colorText', 'settings.colors'], node: <ColorField t={t} label={t('settings.colorText')} value={colors.text} onChange={value => setColor('text', value)} /> },
    { id: 'color-accent', group: 'settings.colors', keys: ['settings.accent', 'settings.colors'], node: <ColorField t={t} label={t('settings.accent')} value={colors.accent} onChange={value => setColor('accent', value)} /> },
    {
      id: 'contrast', group: 'settings.colors', keys: ['settings.contrast', 'settings.contrastFix', 'settings.colorMuted', 'settings.colorOnAccent'],
      node: (
        <div className="sd-contrast" role="status" data-state={issues.length ? 'warn' : 'ok'}>
          {issues.length === 0
            ? <span className="sd-ok"><Check size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.contrastOk', { mode: t(mode === 'dark' ? 'settings.themeDark' : 'settings.themeLight') })}</span>
            : <>
              <ul>{issues.map(issue => <li key={issue.id}><TriangleAlert size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.contrastPair', { fg: t(colorName[issue.fg]), bg: t(colorName[issue.bg]), ratio: issue.ratio.toFixed(1), min: issue.min })}</li>)}</ul>
              <button type="button" className="sd-button" onClick={() => change(p => touch({ ...p, theme: withColors(p.theme, mode, fixedColors(p.theme, mode)) }))}>{t('settings.contrastFix')}</button>
            </>}
          <WallpaperContrast t={t} profile={profile} mode={mode} onDim={dim => change(p => touch({ ...p, background: { ...p.background, dim } }))} />
        </div>
      ),
    },
    fontRow('display', 'settings.fontDisplay'),
    fontRow('ui', 'settings.fontUi'),
    { id: 'font-upload', group: 'settings.typography', keys: ['font.upload', 'font.uploadHint', 'font.uploadDisplay', 'font.uploadUi'], words: ['font', 'woff2', 'ttf', 'otf'], node: <FontUpload ctx={ctx} /> },
    range('radius', 'settings.radius', theme.radius, RANGES.radius, value => setTheme({ radius: value }), { unit: 'px' }),
    range('shadow', 'settings.shadow', theme.shadow, RANGES.shadow, value => setTheme({ shadow: value })),
    range('glass', 'settings.glass', theme.glass, RANGES.glass, value => setTheme({ glass: value })),
    {
      id: 'density', group: 'settings.shapeGroup', keys: ['settings.density', 'settings.densityCompact', 'settings.densityComfortable', 'settings.densitySpacious'],
      node: (
        <Row label={t('settings.density')} stack>
          <Segmented label={t('settings.density')} value={theme.density} onChange={value => setTheme({ density: value })}
            options={[{ value: 'compact', label: t('settings.densityCompact') }, { value: 'comfortable', label: t('settings.densityComfortable') }, { value: 'spacious', label: t('settings.densitySpacious') }]} />
        </Row>
      ),
    },
    range('scale', 'settings.scale', theme.scale, RANGES.scale, value => setTheme({ scale: value }), { step: 0.05, unit: '×' }),
  ]
}

// ---- background -------------------------------------------------------------------------------------------

const NAMED_POSITIONS = [
  ['top-left', 'settings.posTopLeft', 0, 0], ['top', 'settings.posTop', 50, 0], ['top-right', 'settings.posTopRight', 100, 0],
  ['left', 'settings.posLeft', 0, 50], ['center', 'settings.posCenter', 50, 50], ['right', 'settings.posRight', 100, 50],
  ['bottom-left', 'settings.posBottomLeft', 0, 100], ['bottom', 'settings.posBottom', 50, 100], ['bottom-right', 'settings.posBottomRight', 100, 100],
] as const

/** Named positions are stored hyphenated ("top-left", as the renderer expects); exact ones as "X% Y%". */
export function parsePosition(position: string): { named?: string; x: number; y: number } {
  const normalized = position.trim().toLowerCase().split(/[\s-]+/)
  const named = NAMED_POSITIONS.find(([name]) => {
    const parts = name.split('-')
    return parts.length === normalized.length && parts.every(part => normalized.includes(part))
  })
  if (named) return { named: named[0], x: named[2], y: named[3] }
  const match = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/.exec(position.trim())
  return match ? { x: Math.min(100, Math.max(0, Number(match[1]))), y: Math.min(100, Math.max(0, Number(match[2]))) } : { x: 50, y: 50 }
}

const GRADIENT_DEFAULT_ANGLE = 135

export function backgroundItems(ctx: Ctx): Item[] {
  const { t, profile, mode, change } = ctx
  const bg = profile.background
  const image = bg.image
  const colors = colorsFor(profile.theme, mode)
  const setBackground = (update: (background: ProfileV2['background']) => ProfileV2['background']) => change(p => touch({ ...p, background: update(p.background) }))
  const setImage = (changes: Partial<NonNullable<ProfileV2['background']['image']>>) => setBackground(b => b.image ? { ...b, image: { ...b.image, ...changes } } : b)
  const setType = (type: ProfileV2['background']['type']) => change(p => {
    const current = colorsFor(p.theme, mode)
    const background = { ...p.background, type }
    if (type === 'color' && !background.color) background.color = current.bg
    if (type === 'gradient' && !background.gradient) background.gradient = { angle: GRADIENT_DEFAULT_ANGLE, stops: [current.bg, current.surface] }
    return touch({ ...p, background })
  })
  const stops = bg.gradient?.stops ?? []
  const setStops = (next: string[]) => setBackground(b => ({ ...b, gradient: { angle: b.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE, stops: next } }))
  const position = parsePosition(image?.position ?? 'center')
  const setExact = (x: number, y: number) => setImage({ position: `${x}% ${y}%` })
  const imageRange = (id: string, label: MessageKey, value: number, bounds: { min: number; max: number }, set: (value: number) => void, extra: { step?: number; unit?: string } = {}): Item => ({
    id, group: 'settings.imageGroup', keys: [label],
    node: <RangeField t={t} label={t(label)} value={value} min={bounds.min} max={bounds.max} {...extra} onChange={set} />,
  })
  const disabledHint = !image ? <p className="sd-hint">{t('settings.imageNone')}</p> : null
  const items: Item[] = [
    {
      id: 'bg-type', keys: ['settings.bgType', 'settings.bgTheme', 'settings.bgColor', 'settings.bgGradient', 'settings.bgAccent', 'settings.bgImage'],
      node: (
        <Row label={t('settings.bgType')} stack>
          <Segmented label={t('settings.bgType')} value={bg.type} onChange={setType} options={[
            { value: 'theme', label: t('settings.bgTheme') }, { value: 'color', label: t('settings.bgColor') }, { value: 'gradient', label: t('settings.bgGradient') },
            { value: 'accent', label: t('settings.bgAccent') }, { value: 'image', label: t('settings.bgImage') },
          ]} />
        </Row>
      ),
    },
  ]
  if (bg.type === 'color') {
    items.push({ id: 'bg-color', keys: ['settings.bgColor'], node: <ColorField t={t} label={t('settings.bgColor')} value={bg.color ?? colors.bg} onChange={value => setBackground(b => ({ ...b, color: value }))} /> })
  }
  if (bg.type === 'gradient') {
    items.push({
      id: 'bg-gradient', keys: ['settings.bgGradient', 'settings.gradientAngle'],
      node: (
        <div className="sd-gradient">
          <div className="sd-gradient-preview" aria-hidden="true" style={{ background: `linear-gradient(${bg.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE}deg, ${stops.join(', ')})` }} />
          <RangeField t={t} label={t('settings.gradientAngle')} value={bg.gradient?.angle ?? GRADIENT_DEFAULT_ANGLE} min={0} max={360} unit="°" onChange={angle => setBackground(b => ({ ...b, gradient: { angle, stops: b.gradient?.stops ?? stops } }))} />
          {stops.map((stop, index) => (
            <div className="sd-stop" key={index}>
              <ColorField t={t} label={t('settings.gradientStop', { n: index + 1 })} value={stop} onChange={value => setStops(stops.map((item, i) => i === index ? value : item))} />
              {stops.length > 2 && <button type="button" className="sd-icon-button" aria-label={t('settings.gradientRemove', { n: index + 1 })} onClick={() => setStops(stops.filter((_, i) => i !== index))}><Minus size={16} strokeWidth={1.5} aria-hidden="true" /></button>}
            </div>
          ))}
          {stops.length < 3 && <button type="button" className="sd-button" onClick={() => setStops([...stops, stops[stops.length - 1] ?? colors.accent])}><Plus size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.gradientAdd')}</button>}
        </div>
      ),
    })
  }
  items.push(
    {
      id: 'wallpaper', keys: ['settings.wallpaper', 'settings.wallpaperUpload', 'settings.wallpaperRemove', 'settings.blur', 'settings.grayscale', 'settings.imageScale', 'settings.vignette', 'settings.focal'],
      node: (
        <div className="sd-upload">
          <label className="sd-label" htmlFor="sd-wallpaper-file">{t('settings.wallpaperUpload')}</label>
          <input id="sd-wallpaper-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { ctx.onWallpaperFile(event.target.files?.[0]); event.target.value = '' }} />
          {image && <button type="button" className="sd-button" onClick={ctx.onWallpaperRemove}><Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.wallpaperRemove')}</button>}
        </div>
      ),
    },
    { id: 'dim', keys: ['settings.overlay'], node: <RangeField t={t} label={t('settings.overlay')} value={bg.dim} min={RANGES.dim.min} max={RANGES.dim.max} unit="%" onChange={dim => setBackground(b => ({ ...b, dim }))} /> },
  )
  if (image) {
    items.push(
      imageRange('blur', 'settings.blur', image.blur, RANGES.blur, blur => setImage({ blur }), { unit: 'px' }),
      imageRange('grayscale', 'settings.grayscale', image.grayscale, RANGES.grayscale, grayscale => setImage({ grayscale }), { unit: '%' }),
      imageRange('image-scale', 'settings.imageScale', image.scale, RANGES.scale, scale => setImage({ scale }), { step: 0.05, unit: '×' }),
      imageRange('vignette', 'settings.vignette', image.vignette, RANGES.vignette, vignette => setImage({ vignette }), { unit: '%' }),
      {
        id: 'focal', group: 'settings.imageGroup', keys: ['settings.focal', 'settings.focalX', 'settings.focalY', ...NAMED_POSITIONS.map(([, key]) => key)],
        node: (
          <div className="sd-focal">
            <Row label={t('settings.focal')} stack>
              <Segmented label={t('settings.focal')} columns={3} value={position.named ?? ''} onChange={value => setImage({ position: value })}
                options={NAMED_POSITIONS.map(([value, key]) => ({ value, label: t(key) }))} />
            </Row>
            <RangeField t={t} label={t('settings.focalX')} value={position.x} min={0} max={100} unit="%" onChange={x => setExact(x, position.y)} />
            <RangeField t={t} label={t('settings.focalY')} value={position.y} min={0} max={100} unit="%" onChange={y => setExact(position.x, y)} />
          </div>
        ),
      },
    )
  } else {
    items.push({ id: 'image-hint', keys: ['settings.imageNone'], node: disabledHint })
  }
  return items
}

// ---- layout / widgets / shortcuts / search -------------------------------------------------------------------

export function layoutItems(ctx: Ctx): Item[] {
  const { t, s, profile, change, patch } = ctx
  const choice = (id: string, label: MessageKey, value: string, options: [string, MessageKey][], set: (value: string) => void): Item => ({
    id, keys: [label, ...options.map(([, key]) => key)],
    node: <Row label={t(label)}><Select ctx={ctx} label={t(label)} value={value} onChange={set} options={options.map(([v, key]) => ({ value: v, label: t(key) }))} /></Row>,
  })
  return [
    choice('layout', 'settings.layout', s.layout, [['stacked', 'settings.layoutStacked'], ['split', 'settings.layoutSplit']], value => patch({ layout: value as Settings['layout'] })),
    { id: 'reverse', keys: ['settings.reverse'], node: <Toggle label={t('settings.reverse')} checked={s.reverse} onChange={reverse => patch({ reverse })} /> },
    choice('alignment', 'settings.alignment', s.alignment, [['center', 'settings.alignCenter'], ['left', 'settings.alignLeft']], value => patch({ alignment: value as Settings['alignment'] })),
    { id: 'content-width', keys: ['settings.contentWidth'], node: <RangeField t={t} label={t('settings.contentWidth')} value={profile.layout.contentWidth} min={RANGES.contentWidth.min} max={RANGES.contentWidth.max} step={10} unit="px" onChange={contentWidth => change(p => touch({ ...p, layout: { ...p.layout, contentWidth } }))} /> },
    { id: 'gap', keys: ['settings.gap'], node: <RangeField t={t} label={t('settings.gap')} value={profile.layout.gap} min={RANGES.gap.min} max={RANGES.gap.max} unit="px" onChange={gap => change(p => touch({ ...p, layout: { ...p.layout, gap } }))} /> },
    { id: 'columns', keys: ['settings.columns'], node: <RangeField t={t} label={t('settings.columns')} value={s.columns} min={2} max={10} onChange={columns => patch({ columns })} /> },
    { id: 'icon-size', keys: ['settings.iconSize'], node: <RangeField t={t} label={t('settings.iconSize')} value={s.iconSize} min={40} max={120} unit="px" onChange={iconSize => patch({ iconSize })} /> },
    choice('icon-shape', 'settings.iconShape', s.iconShape, [['circle', 'settings.shapeCircle'], ['rounded', 'settings.shapeRounded'], ['square', 'settings.shapeSquare']], value => patch({ iconShape: value as Settings['iconShape'] })),
  ]
}

export function widgetsItems(ctx: Ctx): Item[] {
  const { t, s, patch } = ctx
  const flags = [['showClock', 'settings.showClock'], ['showDate', 'settings.showDate'], ['showSearch', 'settings.showSearch'], ['hour12', 'settings.hour12']] as const
  return flags.map(([key, label]) => ({ id: key, keys: [label], node: <Toggle label={t(label)} checked={s[key]} onChange={value => patch({ [key]: value })} /> }))
}

export function shortcutsItems(ctx: Ctx): Item[] {
  const { t, s } = ctx
  return [{ id: 'shortcuts', keys: ['settings.shortcuts', 'settings.shortcutsHint'], node: <div className="sd-note"><p>{t('settings.shortcutsHint')}</p><p>{t('settings.shortcutsCount', { count: s.shortcuts.length })}</p></div> }]
}

export function searchItems(ctx: Ctx): Item[] {
  const { t, s, patch, onError } = ctx
  const options = [
    ...SEARCH_ENGINES, { value: BAIDU, label: t('settings.engineBaidu') },
    ...(![...SEARCH_ENGINES.map(engine => engine.value), BAIDU].includes(s.searchTemplate) ? [{ value: s.searchTemplate, label: t('common.custom') }] : []),
  ]
  return [
    { id: 'engine', keys: ['settings.searchEngine', 'settings.engineBaidu'], words: ['Google', 'Bing'], node: <Row label={t('settings.searchEngine')} stack><Select ctx={ctx} wide label={t('settings.searchEngine')} value={s.searchTemplate} options={options} onChange={searchTemplate => patch({ searchTemplate })} /></Row> },
    {
      id: 'engine-custom', keys: ['settings.searchCustom'],
      node: (
        <Row label={t('settings.searchCustom')} htmlFor="sd-search-template" stack>
          <input
            id="sd-search-template" className="sd-input" defaultValue={s.searchTemplate} key={s.searchTemplate}
            onBlur={event => {
              try { searchUrl(event.target.value, 'test'); if (event.target.value !== s.searchTemplate) patch({ searchTemplate: event.target.value }) }
              catch { onError({ key: 'error.searchTemplate' }) }
            }}
          />
        </Row>
      ),
    },
  ]
}

// ---- data / about --------------------------------------------------------------------------------------------

export function styleItems(ctx: Ctx): Item[] {
  return [
    { id: 'css', keys: ['css.title', 'css.hint', 'css.enable', 'css.editor'], words: ['css', 'style'], node: <CssEditor ctx={ctx} safeMode={ctx.safe} /> },
  ]
}

export function aiItems(ctx: Ctx): Item[] {
  return [
    { id: 'ai', keys: ['ai.title', 'ai.intro', 'ai.copyPrompt', 'ai.reply', 'ai.copyErrors', 'ai.preview', 'ai.apply'], words: ['ai', 'prompt', 'chatgpt', 'claude', 'kimi', 'deepseek', '主题包'], node: <AiWorkbench ctx={ctx} /> },
  ]
}

export function dataItems(ctx: Ctx): Item[] {
  const { t, s, store, onError, onReset } = ctx
  return [
    { id: 'profiles', keys: ['profile.heading', 'profile.active', 'profile.new', 'profile.rename', 'profile.delete', 'profile.history', 'profile.archived'], node: <ProfileSection store={store} t={t} language={s.language} /> },
    { id: 'backup', keys: ['settings.data', 'settings.dataHint', 'settings.export', 'settings.import'], node: <BackupSection settings={s} t={t} onError={onError} store={store} /> },
    {
      id: 'reset-all', keys: ['settings.reset'],
      node: <button type="button" className="sd-button sd-danger" onClick={() => { if (confirm(t('settings.confirmReset'))) onReset() }}><RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />{t('settings.reset')}</button>,
    },
  ]
}

export function aboutItems(ctx: Ctx): Item[] {
  const { t, profile, change } = ctx
  return [
    {
      id: 'language', keys: ['settings.language', 'settings.languageSystem'], words: ['简体中文', 'English'],
      node: (
        <Row label={t('settings.language')}>
          <Select ctx={ctx} label={t('settings.language')} value={profile.prefs.language} onChange={value => change(p => touch({ ...p, prefs: { ...p.prefs, language: value as ProfileV2['prefs']['language'] } }))}
            options={[{ value: 'system', label: t('settings.languageSystem') }, { value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} />
        </Row>
      ),
    },
    { id: 'about', keys: ['settings.about', 'settings.aboutText', 'settings.intro'], node: <div className="sd-note"><p>{t('settings.aboutText')}</p><p>{t('settings.intro')}</p></div> },
  ]
}

export function itemsFor(tab: TabId, ctx: Ctx): Item[] {
  switch (tab) {
    case 'appearance': return appearanceItems(ctx)
    case 'background': return backgroundItems(ctx)
    case 'layout': return layoutItems(ctx)
    case 'widgets': return widgetsItems(ctx)
    case 'shortcuts': return shortcutsItems(ctx)
    case 'search': return searchItems(ctx)
    case 'style': return styleItems(ctx)
    case 'ai': return aiItems(ctx)
    case 'data': return dataItems(ctx)
    case 'about': return aboutItems(ctx)
  }
}
