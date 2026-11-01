import { z } from 'zod'
import { MessageError } from '../../i18n'
import type { Language } from '../../i18n'
import { localizeIssue } from './issueMessages'
import type { ProfileIssue } from './profile'
import { profileV2Schema } from './profile'

/**
 * Internal partial theme pack: the slice of a profile that a preset (or a future imported theme) may set.
 * Field rules come straight from the profile schema, so a pack can never express a value a profile rejects.
 * Wallpaper assets, bookmarks, layout, widgets, prefs and custom code are deliberately not expressible.
 */

const themeShape = profileV2Schema.shape.theme.shape
const backgroundShape = profileV2Schema.shape.background.shape
const dim = backgroundShape.dim.unwrap()
const label = z.object({ 'zh-CN': z.string().min(1), en: z.string().min(1) })

export const themePackThemeSchema = z.object({
  mode: themeShape.mode,
  color: themeShape.color,
  colorLight: themeShape.colorLight,
  font: themeShape.font.optional(),
  radius: themeShape.radius.optional(),
  shadow: themeShape.shadow.optional(),
  glass: themeShape.glass.optional(),
  density: themeShape.density.optional(),
  scale: themeShape.scale.optional(),
  iconShape: themeShape.iconShape.optional(),
  iconSize: themeShape.iconSize.optional(),
}).strict()

export const themePackBackgroundSchema = z.object({
  type: backgroundShape.type,
  color: backgroundShape.color,
  gradient: backgroundShape.gradient,
  dim: dim.optional(),
}).strict()

export const themePackSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, { error: 'lowercase id' }),
  name: label,
  description: label.optional(),
  theme: themePackThemeSchema,
  /** Used as-is. For a pack with `wallpaper`, this is the safe fallback when the profile has no wallpaper. */
  background: themePackBackgroundSchema.optional(),
  /** The pack wants the user's wallpaper: with one, show it with this glass and dim; without, use the fallbacks. */
  wallpaper: z.object({ glass: themeShape.glass, dim }).strict().optional(),
  /** Contrast level the pack was authored for: 4.5 (AA, default) or 7 (AAA). */
  minContrast: z.union([z.literal(4.5), z.literal(7)]).optional(),
}).strict().superRefine((pack, ctx) => {
  const { background } = pack
  if (background?.type === 'gradient' && !background.gradient) ctx.addIssue({ code: 'custom', path: ['background', 'gradient'], message: 'gradient required for gradient background' })
  if (background?.type === 'color' && !background.color) ctx.addIssue({ code: 'custom', path: ['background', 'color'], message: 'color required for color background' })
})

export type ThemePack = z.infer<typeof themePackSchema>

function describe(value: unknown, issue: z.core.$ZodIssue): ProfileIssue {
  const actual = issue.path.reduce<unknown>((current, key) =>
    current != null && typeof current === 'object' ? (current as Record<PropertyKey, unknown>)[key] : undefined, value)
  let display: string
  try { display = typeof actual === 'string' ? actual : JSON.stringify(actual) ?? String(actual) }
  catch { display = String(actual) }
  return { path: issue.path.map(String).join('.') || '$', expected: issue.message, value: display }
}

/** Every validation problem in a candidate pack (empty when valid). */
export function themePackIssues(value: unknown, language?: Language): ProfileIssue[] {
  const result = themePackSchema.safeParse(value)
  if (result.success) return []
  const issues = result.error.issues.map(issue => describe(value, issue))
  return language ? issues.map(issue => localizeIssue(issue, language)) : issues
}

/** Parse a pack or throw a localizable error with the first invalid path. */
export function parseThemePack(value: unknown): ThemePack {
  const result = themePackSchema.safeParse(value)
  if (!result.success) throw new MessageError('error.profileValidation', { ...describe(value, result.error.issues[0]) })
  return result.data
}
