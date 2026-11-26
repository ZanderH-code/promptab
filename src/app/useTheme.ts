import { variableValue } from '../core/ai/variable'
import { useLayoutEffect, useMemo, type CSSProperties } from 'react'
import { deriveTokens, themeColorsFor, type ThemeMode } from '../core/tokens/derive'
import { assetFontFamily, isAssetFont } from '../core/font'
import { mixOklch } from '../core/tokens/oklch'
import { accentPalette } from '../core/tokens/accent'
import { isSafeFontRef, isSafeThemeValue } from '../core/css/safeValue'
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

/** A font key, an uploaded font or a plain family list; anything else (brackets, escapes, `;`) falls back to the system stack. */
export const fontStack = (ref: string) => Object.hasOwn(FONTS, ref) ? FONTS[ref]
  : isAssetFont(ref) ? `"${assetFontFamily(ref)}", ${FONTS.system}`
    : isSafeFontRef(ref) ? ref : FONTS.system

const ACCENT_SELECTION_KEY = 'mnt:accent-selection:v1'

function selectedAccent(profile: ProfileV2, mode: ThemeMode): string | undefined {
  if (profile.prefs.accentOnOpen === 'off') return undefined
  try {
    const accent = sessionStorage.getItem(ACCENT_SELECTION_KEY)
    return accent && accentPalette(profile.theme, mode).includes(accent) ? accent : undefined
  } catch { return undefined }
}

/** Every CSS custom property the theme writes on the root, so stale ones can be cleared. */
function themeProperties(profile: ProfileV2, mode: ThemeMode, accent = selectedAccent(profile, mode)): Record<string, string> {
  const { theme } = profile
  const colors = { ...themeColorsFor(theme, mode), ...(accent ? { accent } : {}) }
  const tokens: Record<string, string> = { ...deriveTokens(colors, mode, { minContrast: theme.preset === 'contrast' ? 7 : 4.5 }) }
  tokens['--mnt-scheme-bg'] = colors.bg
  const shadowAlpha = theme.shadow * (mode === 'dark' ? 1 : 0.4)
  tokens['--mnt-shadow-color'] = `color-mix(in oklch, var(--mnt-black) ${shadowAlpha}%, transparent)`
  tokens['--mnt-radius'] = `${theme.radius}px`
  tokens['--mnt-shadow-strength'] = String(theme.shadow)
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
    const value = `${variableValue(variable, profile.custom.values[variable.name])}${variable.type === 'range' ? variable.unit : ''}`
    // Stored profiles accept any text here; only plain values may reach the page, where CSS can read them.
    if (isSafeThemeValue(value)) tokens[variable.name] = value
  }
  return tokens
}

/** Writes the resolved theme tokens onto <html>. */
export function useThemeTokens(latest: ProfileV2 | null, mode: ThemeMode | undefined, cache = true) {
  // The effect reads only these parts, so edits elsewhere (bookmarks, widgets, CSS) keep the profile it last saw.
  const inputs = latest ? JSON.stringify([latest.theme, latest.background, latest.custom.variables, latest.custom.values, latest.prefs.accentOnOpen]) : ''
  const profile = useMemo(() => latest, [inputs])
  useLayoutEffect(() => {
    if (!profile || !mode) return
    const root = document.documentElement
    const properties = themeProperties(profile, mode)
    const accentVariants = profile.prefs.accentOnOpen === 'off' ? [] : accentPalette(profile.theme, mode).map(accent => ({ accent, properties: themeProperties(profile, mode, accent), background: pageBackground(profile, mode, accent) }))
    // Same helper as the inline page background, so the first painted frame cannot disagree with React.
    const background = pageBackground(profile, mode)
    root.dataset.theme = mode
    root.dataset.glass = profile.theme.glass > 0 ? 'on' : 'off'
    // CSS and ui/motion read the in-app motion setting from here; `system` defers to the OS preference.
    root.dataset.reduceMotion = profile.prefs.reduceMotion
    for (const [name, value] of Object.entries(properties)) root.style.setProperty(name, value)
    try {
      if (cache) {
        const json = JSON.stringify({ mode, system: profile.theme.mode === 'system', glass: root.dataset.glass, background, accentMode: profile.prefs.accentOnOpen, accentVariants, properties: Object.fromEntries(Object.entries(properties).filter(([name]) => name.startsWith('--mnt-'))) })
        if (localStorage.getItem('mnt:theme-cache:v1') !== json) localStorage.setItem('mnt:theme-cache:v1', json)
      } else localStorage.removeItem('mnt:theme-cache:v1')
    } catch { /* Storage can be unavailable. */ }
    return () => { for (const name of Object.keys(properties)) root.style.removeProperty(name) }
  }, [profile, mode, cache])
}

/**
 * The page background as a CSS `background` value: the one place the first-paint cache and the inline
 * page style both read it. `undefined` means the page keeps the theme background (`--mnt-scheme-bg`).
 */
function pageBackground(profile: ProfileV2, mode: ThemeMode, accent = selectedAccent(profile, mode)): string | undefined {
  const { background } = profile
  const colors = { ...themeColorsFor(profile.theme, mode), ...(accent ? { accent } : {}) }
  switch (background.type) {
    case 'color': return mode === 'dark' || !profile.theme.colorLight ? background.color ?? colors.bg : colors.bg
    // One gradient serves both modes, so light falls back to the plain background to stay readable.
    case 'gradient': return background.gradient && mode === 'dark'
      ? `linear-gradient(${background.gradient.angle}deg, ${background.gradient.stops.join(', ')})` : undefined
    case 'accent': return mixOklch(colors.bg, colors.accent, 0.18)
    default: return undefined
  }
}

/** Inline styles for the page background (colour, gradient or accent wash); images use <Wallpaper>. */
export function backgroundStyle(profile: ProfileV2, mode: ThemeMode): CSSProperties {
  const background = pageBackground(profile, mode)
  return background ? { background } : {}
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
