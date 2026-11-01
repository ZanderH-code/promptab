import { z } from 'zod'
import { MessageError, type Language } from '../../i18n'
import { localizeIssue } from './issueMessages'
import { isHttpUrl } from '../model'
import { DEFAULT_DIM, RANGES } from './defaults'

const nonempty = z.string().refine(value => value.trim().length > 0, { error: 'non-empty string' })
const color = z.string().regex(/^#[\da-f]{6}$/i, { error: '#RRGGBB color' })
const date = z.string().refine(value => Number.isFinite(Date.parse(value)), { error: 'valid date' })
const asset = z.string().regex(/^mnt-asset:[a-f0-9]{64}$/, { error: 'mnt-asset:<64 hex>' })
const template = z.string().refine(value => value.includes('{query}') && isHttpUrl(value.replaceAll('{query}', 'test')), { error: 'HTTP(S) URL containing {query}' })

function ranged({ min, max }: { min: number; max: number }, integer = false) {
  const error = `${integer ? 'integer' : 'number'} ${min}-${max}`
  return z.number({ error }).refine(value => value >= min && value <= max && (!integer || Number.isInteger(value)), { error })
}

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
  image: asset.optional(), iconMode: z.enum(['auto', 'text']).optional(), builtinName: z.literal('sample-website').optional(), builtinIcon: z.literal('sample-website').optional(),
})

// Known props are typed; unknown props are tolerated so newer or AI-written packs still load.
const widgetBase = { id: nonempty, area: nonempty, order: z.number().int().nonnegative(), hidden: z.boolean().optional() }
const looseProps = z.record(z.string(), z.unknown())
export const widgetSchema = z.discriminatedUnion('type', [
  z.object({ ...widgetBase, type: z.literal('clock'), props: z.looseObject({ hour12: z.boolean().optional(), seconds: z.boolean().optional(), size: ranged({ min: 0.5, max: 3 }).optional() }) }),
  z.object({ ...widgetBase, type: z.literal('date'), props: z.looseObject({ format: nonempty.optional() }) }),
  z.object({ ...widgetBase, type: z.literal('search'), props: z.looseObject({ engine: nonempty.optional() }) }),
  z.object({
    ...widgetBase, type: z.literal('bookmarks'),
    props: z.looseObject({ source: nonempty.optional(), style: z.enum(['tile', 'list']).optional(), maxColumns: ranged({ min: 2, max: 10 }, true).optional(), showGroupTitles: z.boolean().optional() }),
  }),
  ...(['greeting', 'text', 'spacer'] as const).map(type => z.object({ ...widgetBase, type: z.literal(type), props: looseProps })),
])
export type Widget = z.infer<typeof widgetSchema>

const grid = z.object({ areas: z.array(nonempty).min(1), columns: z.array(nonempty).optional() })
const backgroundImage = z.object({
  asset, blur: ranged(RANGES.blur), grayscale: ranged(RANGES.grayscale), scale: ranged(RANGES.scale), vignette: ranged(RANGES.vignette), position: nonempty,
})

export const profileV2Schema = z.object({
  schemaVersion: z.literal(2),
  meta: z.object({ id: nonempty, name: nonempty, builtinName: z.literal('default-profile').optional(), createdAt: date, updatedAt: date }),
  prefs: z.object({ language: z.enum(['system', 'zh-CN', 'en']), openIn: z.enum(['same-tab', 'new-tab']), reduceMotion: z.enum(['system', 'on', 'off']), reduceTransparency: z.enum(['system', 'on', 'off']) }),
  theme: z.object({
    preset: nonempty.optional(), mode: z.enum(['dark', 'light', 'system']), color: baseColorsSchema, colorLight: baseColorsSchema.optional(),
    font: z.object({ display: fontRefSchema, ui: fontRefSchema }), radius: ranged(RANGES.radius), shadow: ranged(RANGES.shadow), glass: ranged(RANGES.glass),
    density: z.enum(['compact', 'comfortable', 'spacious']), scale: ranged(RANGES.scale), iconShape: z.enum(['circle', 'rounded', 'square']), iconSize: z.number().int().min(40).max(120),
  }),
  background: z.object({
    type: z.enum(['theme', 'color', 'gradient', 'image', 'accent']), color: color.optional(), gradient: z.object({ angle: z.number(), stops: z.array(color).min(2).max(3) }).optional(),
    /** Wallpaper shade 0-80, independent of whether an image is set. */
    dim: ranged(RANGES.dim).default(DEFAULT_DIM), image: backgroundImage.optional(),
  }),
  layout: grid.extend({
    contentWidth: ranged(RANGES.contentWidth),
    align: z.enum(['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']),
    gap: ranged(RANGES.gap), breakpoints: z.object({ narrow: grid.optional(), medium: grid.optional() }).optional(),
  }),
  widgets: z.array(widgetSchema),
  bookmarks: z.object({ groups: z.array(z.object({ id: nonempty, name: nonempty, builtinName: z.literal('quick-links').optional(), collapsed: z.boolean(), items: z.array(linkSchema.extend({ builtinGroup: z.literal('quick-links').optional() })) })) }),
  search: z.object({ engines: z.array(z.object({ id: nonempty, name: nonempty, builtinName: z.literal('custom-search').optional(), template })), defaultEngineId: nonempty }),
  custom: z.object({ css: z.string(), cssEnabled: z.boolean(), variables: z.array(variableDeclSchema), values: z.record(z.string(), z.union([z.string(), z.number()])), sourcePack: z.object({ name: nonempty, importedAt: date }).optional() }),
}).superRefine((profile, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
  const duplicates = (ids: string[], path: (index: number) => (string | number)[], message: string) => {
    const seen = new Set<string>()
    ids.forEach((id, index) => { if (seen.has(id)) issue(path(index), message); seen.add(id) })
  }
  duplicates(profile.bookmarks.groups.map(group => group.id), i => ['bookmarks', 'groups', i, 'id'], 'unique group id')
  const seenLinks = new Set<string>()
  profile.bookmarks.groups.forEach((group, g) => group.items.forEach((item, i) => {
    if (seenLinks.has(item.id)) issue(['bookmarks', 'groups', g, 'items', i, 'id'], 'unique bookmark id across all groups')
    seenLinks.add(item.id)
  }))
  duplicates(profile.widgets.map(widget => widget.id), i => ['widgets', i, 'id'], 'unique widget id')
  if (!profile.search.engines.some(engine => engine.id === profile.search.defaultEngineId)) issue(['search', 'defaultEngineId'], 'id of an existing search engine')
  duplicates(profile.search.engines.map(engine => engine.id), i => ['search', 'engines', i, 'id'], 'unique search engine id')

  const names = (areas: string[]) => new Set(areas.flatMap(row => row.trim().split(/\s+/)).filter(name => name !== '.'))
  const grids: { areas: string[]; path: string[] }[] = [{ areas: profile.layout.areas, path: ['layout', 'areas'] }]
  for (const key of ['narrow', 'medium'] as const) {
    const breakpoint = profile.layout.breakpoints?.[key]
    if (breakpoint) grids.push({ areas: breakpoint.areas, path: ['layout', 'breakpoints', key, 'areas'] })
  }
  profile.widgets.forEach((widget, i) => {
    for (const { areas, path } of grids) {
      if (!names(areas).has(widget.area)) issue(['widgets', i, 'area'], `area listed in ${path.join('.')}`)
    }
  })
})

export type ProfileV2 = z.infer<typeof profileV2Schema>
export type VariableDecl = z.infer<typeof variableDeclSchema>

export type ProfileIssue = { path: string; expected: string; value: string }

function describe(value: unknown, issue: z.core.$ZodIssue): ProfileIssue {
  const actual = issue.path.reduce<unknown>((current, key) =>
    current != null && typeof current === 'object' ? (current as Record<PropertyKey, unknown>)[key] : undefined, value)
  let display: string
  try { display = typeof actual === 'string' ? actual : JSON.stringify(actual) ?? String(actual) }
  catch { display = String(actual) }
  return { path: issue.path.map(String).join('.') || '$', expected: issue.message, value: display }
}

/** Every validation problem in a candidate profile (empty when valid), for feedback to a person or an AI. */
export function profileIssues(value: unknown, language?: Language): ProfileIssue[] {
  const result = profileV2Schema.safeParse(value)
  return result.success ? [] : result.error.issues.map(issue => {
    const described = describe(value, issue)
    return language ? localizeIssue(described, language) : described
  })
}

/** Parse a profile or throw a localizable error with the first invalid path. */
export function parseProfileV2(value: unknown, language?: Language): ProfileV2 {
  const result = profileV2Schema.safeParse(value)
  if (!result.success) {
    const described = describe(value, result.error.issues[0])
    throw new MessageError('error.profileValidation', { ...(language ? localizeIssue(described, language) : described) })
  }
  return result.data
}
