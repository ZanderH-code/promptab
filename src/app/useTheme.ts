import { variableValue } from '../core/ai/variable'
import { useLayoutEffect, type CSSProperties } from 'react'
import { deriveTokens, themeColorsFor, type ThemeMode } from '../core/tokens/derive'
import { assetFontFamily, isAssetFont } from '../core/font'
import { mixOklch } from '../core/tokens/oklch'
import type { ProfileV2 } from '../core/schema/profile'

const FONTS: Record<string, string> = {
  system: 'system-ui, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Noto Serif SC", "Songti SC", Georgia, serif',
  mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
  rounded: '"HarmonyOS Sans", ui-rounded, system-ui, sans-serif',
  'barlow-condensed': '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif',
  cormorant: '"Cormorant Garamond", "Noto Serif SC", Georgia, serif',
  outfit: 'Outfit, system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
}
const DENSITY = { compact: 0.8, comfortable: 1, spacious: 1.25 } as const
const ICON_RADIUS = { circle: '50%', rounded: '24%', square: '4px' } as const

export const fontStack = (ref: string) => FONTS[ref] ?? (isAssetFont(ref) ? `"${assetFontFamily(ref)}", ${FONTS.system}` : ref)

/** Every CSS custom property the theme writes on the root, so stale ones can be cleared. */
function themeProperties(profile: ProfileV2, mode: ThemeMode): Record<string, string> {
  const { theme } = profile
  const colors = themeColorsFor(theme, mode)
  const tokens: Record<string, string> = { ...deriveTokens(colors, mode, { minContrast: theme.preset === 'contrast' ? 7 : 4.5 }) }
  tokens['--mnt-scheme-bg'] = colors.bg
  const shadowAlpha = theme.shadow * (mode === 'dark' ? 1 : 0.4)
  tokens['--mnt-shadow-color'] = `color-mix(in oklch, var(--mnt-black) ${shadowAlpha}%, transparent)`
  tokens['--mnt-radius'] = `${theme.radius}px`
  tokens['--mnt-font-ui'] = fontStack(theme.font.ui)
  tokens['--mnt-font-display'] = fontStack(theme.font.display)
  tokens['--mnt-density'] = String(DENSITY[theme.density])
  tokens['--mnt-scale'] = String(theme.scale)
  tokens['--mnt-glass'] = String(theme.glass)
  tokens['--mnt-wallpaper-overlay'] = `${profile.background.dim}%`
  tokens['--mnt-icon-size'] = `${theme.iconSize}px`
  tokens['--mnt-icon-radius'] = ICON_RADIUS[theme.iconShape]
  for (const variable of profile.custom.variables) {
    if (/^--mnt-/i.test(variable.name)) continue
    const value = variableValue(variable, profile.custom.values[variable.name])
    tokens[variable.name] = `${value}${variable.type === 'range' ? variable.unit : ''}`
  }
  return tokens
}

/** Writes the resolved theme tokens onto <html>. */
export function useThemeTokens(profile: ProfileV2 | null, mode: ThemeMode | undefined, cache = true) {
  useLayoutEffect(() => {
    if (!profile || !mode) return
    const root = document.documentElement
    const properties = themeProperties(profile, mode)
    const background = profile.background.type === 'color' && profile.background.color
      ? profile.background.color
      : profile.background.type === 'gradient' && mode === 'dark' && profile.background.gradient
        ? `linear-gradient(${profile.background.gradient.angle}deg, ${profile.background.gradient.stops.join(', ')})`
        : undefined
    root.dataset.theme = mode
    root.dataset.glass = profile.theme.glass > 0 ? 'on' : 'off'
    for (const [name, value] of Object.entries(properties)) root.style.setProperty(name, value)
    try {
      if (cache) localStorage.setItem('mnt:theme-cache:v1', JSON.stringify({ mode, system: profile.theme.mode === 'system', glass: root.dataset.glass, background, properties: Object.fromEntries(Object.entries(properties).filter(([name]) => name.startsWith('--mnt-'))) }))
      else localStorage.removeItem('mnt:theme-cache:v1')
    } catch { /* Storage can be unavailable. */ }
    return () => { for (const name of Object.keys(properties)) root.style.removeProperty(name) }
  }, [profile, mode, cache])
}

/** Inline styles for the page background (colour, gradient or accent wash); images use <Wallpaper>. */
export function backgroundStyle(profile: ProfileV2, mode: ThemeMode): CSSProperties {
  const { background } = profile
  const colors = themeColorsFor(profile.theme, mode)
  switch (background.type) {
    case 'color': return { background: mode === 'dark' || !profile.theme.colorLight ? background.color ?? colors.bg : colors.bg }
    // One gradient serves both modes, so light falls back to the plain background to stay readable.
    case 'gradient': return background.gradient && mode === 'dark'
      ? { background: `linear-gradient(${background.gradient.angle}deg, ${background.gradient.stops.join(', ')})` } : {}
    case 'accent': return { background: mixOklch(colors.bg, colors.accent, 0.18) }
    default: return {}
  }
}

export function wallpaperStyle(profile: ProfileV2, url: string): CSSProperties | null {
  const image = profile.background.type === 'image' ? profile.background.image : undefined
  if (!image || !url) return null
  const blur = image.blur
  return {
    backgroundImage: `url("${url}")`,
    backgroundPosition: image.position.replaceAll('-', ' '),
    filter: `${blur ? `blur(${blur}px) ` : ''}grayscale(${image.grayscale}%)`,
    // Scale up past 1 by the blur radius so blurred edges never reveal the page behind.
    transform: `scale(${image.scale * (1 + blur / 200)})`,
  }
}
