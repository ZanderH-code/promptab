import { z } from 'zod'
import { RANGES } from '../schema/defaults'
import { baseColorsSchema, profileV2Schema } from '../schema/profile'

/**
 * The theme pack an AI assistant is asked to write (v1: theme, background and css only).
 * Everything is optional so a pack may change just the colours or just the CSS; a field that is present
 * must be valid. Field rules mirror the profile schema, and `applyPack` re-validates the merged profile.
 */
export const PACK_KIND = 'mnt.theme-pack'
export const PACK_VERSION = 1

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
}).superRefine((pack, ctx) => {
  const { background } = pack
  if (background?.type === 'gradient' && !background.gradient) ctx.addIssue({ code: 'custom', path: ['background', 'gradient'], message: 'gradient required when type is "gradient"' })
  if (background?.type === 'color' && !background.color) ctx.addIssue({ code: 'custom', path: ['background', 'color'], message: 'color required when type is "color"' })
})

export type AiPack = z.infer<typeof aiPackSchema>
export type PackPart = 'theme' | 'background' | 'css'
export const PACK_PARTS: readonly PackPart[] = ['theme', 'background', 'css']

/** Which parts a pack actually carries. */
export const partsOf = (pack: AiPack): Record<PackPart, boolean> => ({
  theme: !!pack.theme && Object.keys(pack.theme).length > 0,
  background: !!pack.background && Object.keys(pack.background).length > 0,
  css: typeof pack.css === 'string' && pack.css.trim() !== '',
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
