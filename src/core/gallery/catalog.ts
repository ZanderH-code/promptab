import { z } from 'zod'
import { aiPackSchema, keyTree, partsOf, unknownKeys } from '../ai/pack'
import { areaStyleSchema, variableDeclSchema, widgetSchema } from '../schema/profile'
import { sanitizeCss } from '../css/sanitize'
import { checkTheme } from '../tokens/quality'
import { themeColorsFor } from '../tokens/derive'

export const MAX_GALLERY_BYTES = 64 * 1024
export function galleryColors<T>(theme: { mode: string; color: T; colorLight?: T }): T {
  return theme.mode === 'light' && theme.colorLight ? theme.colorLight : theme.color
}
const metadata = z.object({ name: z.string().trim().min(1), author: z.string().trim().min(1), tags: z.array(z.string().trim().min(1)).min(1).max(12), prompt: z.object({ en: z.string().trim().min(1), 'zh-CN': z.string().trim().min(1) }).strict() }).passthrough()

/** Gallery entries are ordinary AI packs with additional, strictly checked metadata. */
export function validateGalleryPack(value: unknown): string[] {
  const errors: string[] = []
  let json: string
  try { json = JSON.stringify(value) ?? '' } catch { return ['Invalid JSON value'] }
  if (new TextEncoder().encode(json).length > MAX_GALLERY_BYTES) errors.push('Pack exceeds size limit')
  if (/(?:https?:)?\/\/|\b(?:ftp|file):/i.test(json)) errors.push('External URL is not allowed')
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [...errors, 'Pack must be an object']
  const raw = value as Record<string, unknown>
  if (raw.kind !== 'mnt.theme-pack' || raw.packVersion !== 2) errors.push('Gallery requires mnt.theme-pack version 2')
  if (Array.isArray(raw.widgets)) {
    for (const [index, value] of raw.widgets.entries()) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const widget = value as Record<string, unknown>
      const schema = widgetSchema.options.find(option => option.shape.type.value === widget.type)
      if (schema) errors.push(...unknownKeys(widget, keyTree(schema), `widgets.${index}`).map(key => `Unknown key: ${key}`))
    }
    if (!raw.widgets.some(value => value && typeof value === 'object' && value.type === 'bookmarks' && value.hidden !== true)) errors.push('A visible bookmarks widget is required')
  }
  if (raw.layout && !Array.isArray(raw.widgets)) errors.push('A layout requires a visible bookmarks widget')
  if (Array.isArray(raw.variables)) {
    for (const [index, value] of raw.variables.entries()) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const variable = value as Record<string, unknown>
      const schema = variableDeclSchema.options.find(option => option.shape.type.value === variable.type)
      if (schema) errors.push(...unknownKeys(variable, keyTree(schema), `variables.${index}`).map(key => `Unknown key: ${key}`))
    }
  }
  const styles = (raw.layout && typeof raw.layout === 'object' ? (raw.layout as Record<string, unknown>).areaStyles : undefined)
  if (styles && typeof styles === 'object' && !Array.isArray(styles)) {
    for (const [area, style] of Object.entries(styles)) errors.push(...unknownKeys(style, keyTree(areaStyleSchema), `layout.areaStyles.${area}`).map(key => `Unknown key: ${key}`))
  }
  const metaResult = metadata.safeParse(raw.meta)
  if (!metaResult.success) errors.push(...metaResult.error.issues.map(issue => `Metadata ${issue.path.join('.')}: ${issue.message}`))
  const { tags: _tags, prompt: _prompt, ...packMeta } = (raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta) ? raw.meta : {}) as Record<string, unknown>
  const packValue = { ...raw, meta: packMeta }
  errors.push(...unknownKeys(packValue).map(key => `Unknown key: ${key}`))
  const result = aiPackSchema.safeParse(packValue)
  if (!result.success) return [...errors, ...result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)]
  const pack = result.data
  if (!Object.values(partsOf(pack)).some(Boolean)) errors.push('Pack has no content')
  if (pack.css !== undefined) {
    const css = sanitizeCss(pack.css)
    errors.push(...css.errors.map(issue => `CSS ${issue.code} at ${issue.line}:${issue.column}`))
    if (css.assets.length) errors.push('CSS assets are not allowed in gallery packs')
  }
  if (!pack.theme?.color || !pack.theme.mode || pack.theme.mode === 'system') errors.push('Gallery requires explicit dark or light theme colors')
  else {
    const theme = { mode: pack.theme.mode, color: pack.theme.color, colorLight: pack.theme.colorLight } as Parameters<typeof themeColorsFor>[0]
    const colors = themeColorsFor(theme, pack.theme.mode)
    for (const failure of checkTheme(colors, pack.theme.mode).failures) errors.push(`Contrast ${failure.id}: ${failure.ratio.toFixed(2)} < ${failure.required}`)
  }
  return errors
}
