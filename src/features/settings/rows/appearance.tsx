import { variableValue } from '../../../core/ai/variable'
import { Check, TriangleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { isAssetFont } from '../../../core/font'
import { RANGES, darkSurface, lightSurface } from '../../../core/schema/defaults'
import type { ProfileV2 } from '../../../core/schema/profile'
import type { MessageKey } from '../../../i18n'
import { ColorField, RangeField, Row, Segmented, Toggle } from '../controls'
import { FontUpload } from '../FontUpload'
import { WallpaperContrast } from '../WallpaperContrast'
import { FONT_KEYS, PRESETS, applyPreset, colorsFor, contrastIssues, editTheme, fixedColors, isFontKey, thumbnailTokens, withColors, type BaseColors, type ThemeMode } from '../themeApi'
import { Select, touch, type Ctx, type Item } from './shared'

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
    ...profile.custom.variables.map(variable => {
      const label = variable.label[ctx.s.language]
      const value = variableValue(variable, profile.custom.values[variable.name])
      const set = (next: string | number) => change(p => touch({ ...p, custom: { ...p.custom, values: { ...p.custom.values, [variable.name]: next } } }))
      const node = variable.type === 'range' ? <RangeField t={t} label={label} value={value as number} min={variable.min} max={variable.max} unit={variable.unit} step={(variable.max - variable.min) / 100 || 1} onChange={set} />
        : variable.type === 'color' ? <ColorField t={t} label={label} value={value as string} onChange={set} />
          : variable.type === 'toggle' ? <Toggle label={label} checked={value === 1} onChange={checked => set(checked ? 1 : 0)} />
            : <Row label={label}><Select ctx={ctx} label={label} value={value as string} options={variable.options.map(option => ({ value: option, label: option }))} onChange={set} /></Row>
      return { id: `variable-${variable.name}`, group: 'settings.theme' as const, keys: [] as Item['keys'], words: [label, variable.name], node }
    }),
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
