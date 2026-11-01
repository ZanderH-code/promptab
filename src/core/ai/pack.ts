import { z } from 'zod'
import { RANGES } from '../schema/defaults'
import { baseColorsSchema, profileV2Schema, widgetSchema } from '../schema/profile'
import { areaGridProblem, areaNames } from '../layout/grid'

/**
 * The theme pack an AI assistant is asked to write (v1: theme, background and css only).
 * Everything is optional so a pack may change just the colours or just the CSS; a field that is present
 * must be valid. Field rules mirror the profile schema, and `applyPack` re-validates the merged profile.
 */
export const PACK_KIND = 'mnt.theme-pack'
export const PACK_VERSION = 2

const themeShape = profileV2Schema.shape.theme.shape
const backgroundShape = profileV2Schema.shape.background.shape
const text = (error: string) => z.string({ error }).refine(value => value.trim().length > 0, { error })

function number(range: { min: number; max: number }, integer = false) {
  const error = `${integer ? 'integer' : 'number'} ${range.min}-${range.max}`
  const base = z.number({ error }).min(range.min, { error }).max(range.max, { error })
  return integer ? base.int({ error }) : base
}

const colors = z.object({
  bg: baseColorsSchema.shape.bg,
  text: baseColorsSchema.shape.text,
  accent: baseColorsSchema.shape.accent,
  surface: baseColorsSchema.shape.surface.optional(),
})
const fontRef = z.string({ error: 'font key or family name' }).refine(
  value => /^[\p{L}\p{N}\s,"'._-]+$/u.test(value) && value.trim().length > 0 && !value.startsWith('mnt-asset:'),
  { error: 'font key (serif, mono, outfit, ...) or a plain family name' },
)

export const aiPackSchema = z.object({
  $schema: z.string().optional(),
  kind: z.literal(PACK_KIND).optional(),
  packVersion: z.literal(PACK_VERSION).optional(),
  cssApiVersion: z.literal(1).optional(),
  meta: z.object({
    name: text('non-empty name'),
    description: z.string().optional(),
    author: z.string().optional(),
    createdWith: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  theme: z.object({
    mode: themeShape.mode.optional(),
    color: colors.optional(),
    colorLight: colors.optional(),
    font: z.object({ display: fontRef.optional(), ui: fontRef.optional() }).optional(),
    radius: number(RANGES.radius).optional(),
    shadow: number(RANGES.shadow).optional(),
    glass: number(RANGES.glass).optional(),
    density: themeShape.density.optional(),
    scale: number(RANGES.scale).optional(),
    iconShape: themeShape.iconShape.optional(),
    iconSize: number({ min: 40, max: 120 }, true).optional(),
  }).optional(),
  background: z.object({
    type: z.enum(['theme', 'color', 'gradient', 'accent']).optional(),
    color: backgroundShape.color,
    gradient: backgroundShape.gradient,
    dim: number(RANGES.dim).optional(),
  }).optional(),
  css: z.string().optional(),
  layout: z.object({
    areas: profileV2Schema.shape.layout.shape.areas.optional(),
    columns: profileV2Schema.shape.layout.shape.columns,
    rows: profileV2Schema.shape.layout.shape.rows,
    breakpoints: profileV2Schema.shape.layout.shape.breakpoints,
    areaStyles: profileV2Schema.shape.layout.shape.areaStyles,
    contentWidth: profileV2Schema.shape.layout.shape.contentWidth.optional(),
    align: profileV2Schema.shape.layout.shape.align.optional(),
    gap: profileV2Schema.shape.layout.shape.gap.optional(),
  }).optional(),
  widgets: z.array(widgetSchema).optional(),
}).superRefine((pack, ctx) => {
  const { background } = pack
  if (background?.type === 'gradient' && !background.gradient) ctx.addIssue({ code: 'custom', path: ['background', 'gradient'], message: 'gradient required when type is "gradient"' })
  if (background?.type === 'color' && !background.color) ctx.addIssue({ code: 'custom', path: ['background', 'color'], message: 'color required when type is "color"' })
  if (pack.layout || pack.widgets) {
    const layout = pack.layout
    if (layout?.areas) {
      for (const issue of [
        areaGridProblem(layout.areas),
        ...(layout.breakpoints?.narrow?.areas ? [areaGridProblem(layout.breakpoints.narrow.areas)] : []),
        ...(layout.breakpoints?.medium?.areas ? [areaGridProblem(layout.breakpoints.medium.areas)] : []),
      ].filter((issue): issue is string => !!issue)) ctx.addIssue({ code: 'custom', path: ['layout', 'areas'], message: issue })
    }
    const profile = profileV2Schema.safeParse({
      schemaVersion: 2,
      meta: { id: 'ai-pack', name: 'AI pack', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      prefs: { language: 'en', openIn: 'new-tab', reduceMotion: 'system', reduceTransparency: 'system' },
      theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#eeeae5', accent: '#90d5cd' }, font: { display: 'system', ui: 'system' }, radius: 14, shadow: 40, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
      background: { type: 'theme', dim: 35 },
      layout: { areas: ['overview', 'bookmarks'], contentWidth: 960, align: 'center-center', gap: 24, ...(pack.layout ?? {}) },
      widgets: pack.widgets ?? [
        { id: 'clock', type: 'clock', area: 'overview', order: 0, props: {} },
        { id: 'date', type: 'date', area: 'overview', order: 1, props: {} },
        { id: 'search', type: 'search', area: 'overview', order: 2, props: {} },
        { id: 'bookmarks', type: 'bookmarks', area: 'bookmarks', order: 3, props: {} },
      ],
      bookmarks: { groups: [{ id: 'default', name: 'Bookmarks', collapsed: false, items: [] }] },
      search: { engines: [{ id: 'search', name: 'Search', template: 'https://example.com/?q={query}' }], defaultEngineId: 'search' },
      custom: { css: '', cssEnabled: false, variables: [], values: {} },
    })
    if (!profile.success) for (const issue of profile.error.issues) {
      const path = issue.path.map(String)
      const packPath = path[0] === 'layout' ? ['layout', ...path.slice(1)] : path[0] === 'widgets' ? ['widgets', ...path.slice(1)] : ['layout']
      ctx.addIssue({ code: 'custom', path: packPath, message: issue.message })
    }
    if (pack.widgets && layout?.areas) {
      const grids = [...(layout.areas ? [layout.areas] : []), ...Object.values(layout.breakpoints ?? {}).filter((grid): grid is NonNullable<typeof grid> => !!grid).map(grid => grid.areas)]
      const namesByGrid = grids.map(areaNames)
      for (let i = 0; i < pack.widgets.length; i++) {
        const widget = pack.widgets[i]
        if (!namesByGrid.every(names => names.includes(widget.area))) ctx.addIssue({ code: 'custom', path: ['widgets', i, 'area'], message: `widget area \\"${widget.area}\\" must exist in every configured grid` })
      }
    }
  }
})

export type AiPack = z.infer<typeof aiPackSchema>
export type PackPart = 'theme' | 'background' | 'css' | 'layout' | 'widgets'
export const PACK_PARTS: readonly PackPart[] = ['theme', 'background', 'css', 'layout', 'widgets']

/** Which parts a pack actually carries. */
export const partsOf = (pack: AiPack): Record<PackPart, boolean> => ({
  theme: !!pack.theme && Object.keys(pack.theme).length > 0,
  background: !!pack.background && Object.keys(pack.background).length > 0,
  css: typeof pack.css === 'string' && pack.css.trim() !== '',
  layout: !!pack.layout && Object.keys(pack.layout).length > 0,
  widgets: !!pack.widgets?.length,
})

/** Nested key names the schema knows, derived from the schema itself so they cannot drift. */
export type KeyTree = { [key: string]: KeyTree | null }
export function keyTree(schema: unknown): KeyTree | null {
  let current = schema
  while (current && typeof current === 'object' && 'unwrap' in current && typeof (current as { unwrap: unknown }).unwrap === 'function') current = (current as { unwrap(): unknown }).unwrap()
  const shape = (current as { shape?: Record<string, unknown> } | undefined)?.shape
  return shape ? Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, keyTree(value)])) : null
}
export const PACK_KEYS = keyTree(aiPackSchema)!

/** Paths of keys the schema does not define (a warning, not an error). */
export function unknownKeys(value: unknown, tree: KeyTree | null = PACK_KEYS, path = ''): string[] {
  if (!tree || !value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).flatMap(([key, child]) => {
    const here = path ? `${path}.${key}` : key
    return key in tree ? unknownKeys(child, tree[key], here) : [here]
  })
}
