import { z } from 'zod'
import { MessageError } from '../../i18n'
import { isHttpUrl } from '../model'

const nonempty = z.string().refine(value => value.trim().length > 0, { error: 'non-empty string' })
const color = z.string().regex(/^#[\da-f]{6}$/i, { error: '#RRGGBB color' })
const date = z.string().refine(value => Number.isFinite(Date.parse(value)), { error: 'valid date' })
const asset = z.string().regex(/^mnt-asset:[\da-f]{64}$/i, { error: 'mnt-asset:<64 hex>' })
const template = z.string().refine(value => value.includes('{query}') && isHttpUrl(value.replaceAll('{query}', 'test')), { error: 'HTTP(S) URL containing {query}' })

export const baseColorsSchema = z.object({ bg: color, surface: color, text: color, accent: color })
export const fontRefSchema = nonempty
const label = z.object({ 'zh-CN': nonempty, en: nonempty })
const variableBase = { name: z.string().regex(/^--[a-zA-Z_][\w-]*$/), label }
export const variableDeclSchema = z.discriminatedUnion('type', [
  z.object({ ...variableBase, type: z.literal('range'), min: z.number(), max: z.number(), unit: z.string(), default: z.number() }).refine(v => v.min <= v.max && v.default >= v.min && v.default <= v.max),
  z.object({ ...variableBase, type: z.literal('color'), default: color }),
  z.object({ ...variableBase, type: z.literal('toggle'), default: z.union([z.literal(0), z.literal(1)]) }),
  z.object({ ...variableBase, type: z.literal('select'), options: z.array(nonempty).min(1), default: nonempty }).refine(v => v.options.includes(v.default)),
])

export const linkSchema = z.object({
  id: nonempty, name: nonempty, url: z.string().refine(isHttpUrl, { error: 'HTTP(S) URL' }), color, icon: nonempty,
  image: asset.optional(), iconMode: z.enum(['auto', 'text']).optional(),
})
export const widgetSchema = z.object({
  id: nonempty, type: z.enum(['clock', 'date', 'greeting', 'search', 'bookmarks', 'text', 'spacer']),
  area: nonempty, order: z.number().int().nonnegative(), props: z.record(z.string(), z.unknown()), hidden: z.boolean().optional(),
})
const grid = z.object({ areas: z.array(nonempty).min(1), columns: z.array(nonempty).optional() })
const backgroundImage = z.object({ asset, blur: z.number(), dim: z.number(), grayscale: z.number(), scale: z.number(), vignette: z.number(), position: nonempty })

export const profileV2Schema = z.object({
  schemaVersion: z.literal(2),
  meta: z.object({ id: nonempty, name: nonempty, createdAt: date, updatedAt: date }),
  prefs: z.object({ language: z.enum(['system', 'zh-CN', 'en']), openIn: z.enum(['same-tab', 'new-tab']), reduceMotion: z.enum(['system', 'on', 'off']), reduceTransparency: z.enum(['system', 'on', 'off']) }),
  theme: z.object({
    preset: nonempty.optional(), mode: z.enum(['dark', 'light', 'system']), color: baseColorsSchema, colorLight: baseColorsSchema.optional(),
    font: z.object({ display: fontRefSchema, ui: fontRefSchema }), radius: z.number(), shadow: z.number(), glass: z.number(),
    density: z.enum(['compact', 'comfortable', 'spacious']), scale: z.number().positive(), iconShape: z.enum(['circle', 'rounded', 'square']), iconSize: z.number().int().min(40).max(120),
  }),
  background: z.object({ type: z.enum(['theme', 'color', 'gradient', 'image', 'accent']), color: color.optional(), gradient: z.object({ angle: z.number(), stops: z.array(color).min(2).max(3) }).optional(), image: backgroundImage.optional() }),
  layout: grid.extend({ contentWidth: z.number().positive(), align: z.enum(['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']), gap: z.number().nonnegative(), breakpoints: z.object({ narrow: grid.optional(), medium: grid.optional() }).optional() }),
  widgets: z.array(widgetSchema),
  bookmarks: z.object({ groups: z.array(z.object({ id: nonempty, name: nonempty, collapsed: z.boolean(), items: z.array(linkSchema) })) }),
  search: z.object({ engines: z.array(z.object({ id: nonempty, name: nonempty, template })), defaultEngineId: nonempty }),
  custom: z.object({ css: z.string(), cssEnabled: z.boolean(), variables: z.array(variableDeclSchema), values: z.record(z.string(), z.union([z.string(), z.number()])), sourcePack: z.object({ name: nonempty, importedAt: date }).optional() }),
})

export type ProfileV2 = z.infer<typeof profileV2Schema>
export type VariableDecl = z.infer<typeof variableDeclSchema>

/** Parse a profile or throw a localizable error with the first invalid path. */
export function parseProfileV2(value: unknown): ProfileV2 {
  const result = profileV2Schema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const actual = issue.path.reduce<unknown>((current, key) =>
      current != null && typeof current === 'object' ? (current as Record<PropertyKey, unknown>)[key] : undefined, value)
    let displayValue: string
    try { displayValue = typeof actual === 'string' ? actual : JSON.stringify(actual) ?? String(actual) }
    catch { displayValue = String(actual) }
    throw new MessageError('error.profileValidation', {
      path: issue.path.map(String).join('.') || '$',
      expected: issue.message,
      value: displayValue,
    })
  }
  return result.data
}
