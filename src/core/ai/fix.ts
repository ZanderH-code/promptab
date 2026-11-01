import { PACK_KEYS, type KeyTree } from './pack'

/** A small mistake that was corrected automatically; shown to the person so nothing changes silently. */
export type Fix = { kind: 'color' | 'number' | 'key'; path: string; before: string; after: string }

const COLOR_PATHS = new Set([
  ...['color', 'colorLight'].flatMap(group => ['bg', 'surface', 'text', 'accent'].map(key => `theme.${group}.${key}`)),
  'background.color',
])
const NUMBER_PATHS = new Set(['theme.radius', 'theme.shadow', 'theme.glass', 'theme.scale', 'theme.iconSize', 'background.dim', 'background.gradient.angle'])

/** Alias keys (compared without case, `-` and `_`) that models commonly use, and the key they mean. */
const ALIASES: Record<string, string> = {
  accentcolor: 'accent', primary: 'accent', primarycolor: 'accent',
  backgroundcolor: 'bg', background: 'bg', bgcolor: 'bg', base: 'bg',
  textcolor: 'text', foreground: 'text', fg: 'text',
  surfacecolor: 'surface', card: 'surface', panel: 'surface',
  lightcolor: 'colorLight', lighttheme: 'colorLight',
  borderradius: 'radius', cornerradius: 'radius',
  customcss: 'css', fonts: 'font',
}
const flat = (key: string) => key.toLowerCase().replace(/[-_]/g, '')

function canonicalKey(key: string, tree: KeyTree): string | undefined {
  if (key in tree) return key
  const wanted = flat(key)
  const exact = Object.keys(tree).find(known => flat(known) === wanted)
  if (exact) return exact
  const alias = ALIASES[wanted]
  return alias && alias in tree ? alias : undefined
}

function fixColor(value: string): string | undefined {
  if (/^#[\da-f]{6}$/i.test(value)) return value.toLowerCase()
  const short = /^#?([\da-f])([\da-f])([\da-f])$/i.exec(value.trim())
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
  const bare = /^([\da-f]{6})$/i.exec(value.trim())
  return bare ? `#${bare[1]}`.toLowerCase() : undefined
}

function fixNumber(value: string): number | undefined {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(?:px|%|deg|rem)?\s*$/i.exec(value)
  return match ? Number(match[1]) : undefined
}

/**
 * Repairs the usual small slips in a model's pack: `#abc` colours, numbers written as `"16px"`, and misspelled
 * or aliased keys (`accentColor`). Unknown keys and anything else are left for validation to report.
 */
export function autoFix(raw: unknown): { value: unknown; fixes: Fix[] } {
  const fixes: Fix[] = []
  const fixLeaf = (value: unknown, path: string): unknown => {
    if (typeof value !== 'string') return value
    if (COLOR_PATHS.has(path) || /^background\.gradient\.stops\[\d+\]$/.test(path)) {
      const fixed = fixColor(value)
      if (fixed && fixed !== value) {
        // Upper-case hex is normal for people and models, so changing only the case is not worth reporting.
        if (fixed !== value.toLowerCase()) fixes.push({ kind: 'color', path, before: value, after: fixed })
        return fixed
      }
    } else if (NUMBER_PATHS.has(path)) {
      const fixed = fixNumber(value)
      if (fixed !== undefined) { fixes.push({ kind: 'number', path, before: value, after: String(fixed) }); return fixed }
    }
    return value
  }
  const walk = (value: unknown, tree: KeyTree | null, path: string): unknown => {
    if (Array.isArray(value)) return value.map((item, index) => walk(item, null, `${path}[${index}]`))
    if (!value || typeof value !== 'object') return fixLeaf(value, path)
    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      const target = tree ? canonicalKey(key, tree) : key
      const name = target && target !== key && !(target in source) && !(target in result) ? target : key
      if (name !== key) fixes.push({ kind: 'key', path: path ? `${path}.${key}` : key, before: key, after: name })
      result[name] = walk(child, tree?.[name] ?? null, path ? `${path}.${name}` : name)
    }
    return result
  }
  return { value: walk(structuredClone(raw), PACK_KEYS, ''), fixes }
}
