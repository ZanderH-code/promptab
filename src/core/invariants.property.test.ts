import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { remoteRefs } from './ai/evalScore'
import { autoFix } from './ai/fix'
import { extractCandidates, readCandidate } from './ai/parse'
import { portableCss, sanitizeCss } from './css/sanitize'
import { areaGridProblem, areaNames, columnCount } from './layout/grid'
import { migrateV1 } from './migrate/v1'
import type { Settings, Shortcut } from './model'
import { profileIssues } from './schema/profile'
import { adjustLightness, contrastRatio, hexToOklch, hexToRgb, mixOklch, oklchToHex, pickOnColor } from './tokens/oklch'

const HEX_RE = /^#[0-9a-f]{6}$/

const hexColorArb = fc
  .tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }))
  .map(([r, g, b]) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`)

const hex64Arb = fc.stringMatching(/^[a-f0-9]{64}$/)
const safeIdentArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/)

describe('property invariants: CSS sanitizer', () => {
  it('never throws on arbitrary strings and never lets remote refs survive into layered output', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), source => {
        const result = sanitizeCss(source)
        if (result.ok) {
          expect(result.errors).toEqual([])
          expect(result.layered).toBe(result.css ? `@layer user{${result.css}}` : '')
          expect(remoteRefs(result.layered)).toEqual([])
        } else {
          expect(result.errors.length).toBeGreaterThan(0)
          expect(result.css).toBe('')
          expect(result.layered).toBe('')
        }
      }),
      { numRuns: 100 },
    )
  })

  it('rejects every generated adversarial remote-resource CSS payload', () => {
    const hostArb = fc.stringMatching(/^[a-z0-9]{1,10}\.[a-z]{2,4}$/)
    const pathArb = fc.stringMatching(/^[a-z0-9/_-]{1,16}$/)
    const remoteUrlArb = fc
      .tuple(fc.constantFrom('https://', 'http://', '//'), hostArb, pathArb)
      .map(([scheme, host, path]) => `${scheme}${host}/${path}`)

    const adversarialCssArb = fc.oneof(
      remoteUrlArb.map(url => `@import url("${url}");`),
      remoteUrlArb.map(url => `@import "${url}";`),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { background-image: url("${url}"); }`),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { background: image-set("${url}" 1x); }`),
      fc
        .tuple(safeIdentArb, remoteUrlArb)
        .map(([cls, url]) => `.${cls} { background: -webkit-image-set("${url}" 1x); }`),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { background: image("${url}"); }`),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { background: cross-fade("${url}", #000); }`),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { --bg: url("${url}"); }`),
      fc
        .tuple(safeIdentArb, safeIdentArb)
        .map(([cls, name]) => `.${cls} { background: image-set(var(--${name}) 1x); }`),
      remoteUrlArb.map(url => `@font-face { font-family: x; src: url("${url}"); }`),
      fc.constant('@font-face { font-family: x; src: url("data:image/png;base64,AA=="); }'),
      fc.tuple(safeIdentArb, remoteUrlArb).map(([cls, url]) => `.${cls} { -moz-binding: url("${url}"); }`),
      safeIdentArb.map(cls => `.${cls} { width: expression(alert(1)); }`),
      remoteUrlArb.map(url => `@\\69mport "${url}";`),
    )

    fc.assert(
      fc.property(adversarialCssArb, payload => {
        const result = sanitizeCss(payload)
        expect(result.ok).toBe(false)
        expect(result.layered).toBe('')
        expect(remoteRefs(result.layered)).toEqual([])
      }),
      { numRuns: 100 },
    )
  })

  it('is idempotent on valid safe CSS and strips all local assets in portableCss', () => {
    const safeCssArb = fc
      .tuple(safeIdentArb, hexColorArb, hex64Arb, fc.integer({ min: 0, max: 40 }))
      .map(
        ([cls, color, hash, pad]) =>
          `.${cls} { color: ${color}; padding: ${pad}px; background-image: url("mnt-asset:${hash}"); mask-image: url("data:image/png;base64,iVBORw0KGgo="); }`,
      )

    fc.assert(
      fc.property(safeCssArb, source => {
        const first = sanitizeCss(source)
        expect(first.ok).toBe(true)
        expect(remoteRefs(first.layered)).toEqual([])
        const second = sanitizeCss(first.css)
        expect(second.ok).toBe(true)
        expect(second.css).toBe(first.css)

        const portable = portableCss(source)
        expect(portable.css).toBeDefined()
        expect(portable.removed).toBe(2)
        const checked = sanitizeCss(portable.css ?? '')
        expect(checked.ok).toBe(true)
        expect(checked.assets).toEqual([])
        expect(portable.css).not.toContain('mnt-asset:')
        expect(portable.css).not.toContain('data:image/')
      }),
      { numRuns: 60 },
    )
  })
})

describe('property invariants: AI reply parser and autoFix', () => {
  it('extractCandidates + readCandidate never throw, deduplicate, and order json before css', () => {
    const fencedReplyArb = fc.oneof(
      fc.string({ maxLength: 300 }),
      fc
        .array(
          fc.tuple(
            fc.constantFrom('json', 'css', 'jsonc', 'txt', ''),
            fc.constantFrom('```', '~~~'),
            fc.string({ maxLength: 100 }),
          ),
          { maxLength: 4 },
        )
        .map(blocks => blocks.map(([lang, fence, body]) => `${fence}${lang}\n${body}\n${fence}`).join('\n\n')),
    )

    fc.assert(
      fc.property(fencedReplyArb, reply => {
        const candidates = extractCandidates(reply)
        const keys = candidates.map(c => `${c.lang}:${c.code}`)
        expect(new Set(keys).size).toBe(keys.length)

        let seenCss = false
        for (const candidate of candidates) {
          if (candidate.lang === 'css') seenCss = true
          else expect(seenCss).toBe(false)
          const reading = readCandidate(candidate)
          if (reading.ok) expect(reading.value).toBeTruthy()
          else expect(reading.problems.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('autoFix never pollutes Object.prototype, never mutates input, and is idempotent', () => {
    const shortHexArb = fc
      .tuple(fc.constantFrom('#', ''), fc.stringMatching(/^[0-9a-fA-F]{3}$/))
      .map(([prefix, hex]) => `${prefix}${hex}`)
    const bareHexArb = fc.stringMatching(/^[0-9a-fA-F]{6}$/)
    const unitNumArb = fc
      .tuple(fc.integer({ min: 0, max: 360 }), fc.constantFrom('px', '%', 'deg', 'rem', ''))
      .map(([n, unit]) => `${n}${unit}`)

    const packLikeArb = fc.record(
      {
        accentColor: fc.oneof(shortHexArb, bareHexArb, hexColorArb, fc.string({ maxLength: 12 })),
        theme: fc.record(
          {
            borderRadius: fc.oneof(unitNumArb, fc.integer({ min: 0, max: 40 })),
            color: fc.record(
              {
                backgroundColor: fc.oneof(shortHexArb, bareHexArb, hexColorArb),
                accentColor: fc.oneof(shortHexArb, bareHexArb, hexColorArb),
                textColor: fc.oneof(shortHexArb, bareHexArb, hexColorArb),
                surfaceColor: fc.oneof(shortHexArb, bareHexArb, hexColorArb),
              },
              { requiredKeys: [] },
            ),
          },
          { requiredKeys: [] },
        ),
        background: fc.record(
          {
            dim: fc.oneof(unitNumArb, fc.integer({ min: 0, max: 80 })),
            color: fc.oneof(shortHexArb, bareHexArb, hexColorArb),
          },
          { requiredKeys: [] },
        ),
        customCss: fc.string({ maxLength: 40 }),
      },
      { requiredKeys: [] },
    )

    fc.assert(
      fc.property(packLikeArb, fc.string({ maxLength: 20 }), (raw, payload) => {
        const input = Object.assign({}, raw)
        Object.defineProperty(input, '__proto__', {
          value: { polluted: payload },
          enumerable: true,
          writable: true,
          configurable: true,
        })
        const before = structuredClone(input)

        const first = autoFix(input)
        expect(({} as Record<string, unknown>).polluted).toBeUndefined()
        expect(input).toEqual(before)
        for (const fix of first.fixes) {
          if (fix.kind === 'number') expect(Number.isFinite(Number(fix.after))).toBe(true)
          else expect(fix.before).not.toBe(fix.after)
        }

        const second = autoFix(first.value)
        expect(second.fixes).toEqual([])
        expect(second.value).toEqual(first.value)
      }),
      { numRuns: 100 },
    )
  })
})

describe('property invariants: layout grid', () => {
  it('accepts valid rectangular grids with unique row signatures and tracks names & columns accurately', () => {
    const validGridArb = fc.integer({ min: 1, max: 5 }).chain(cols =>
      fc
        .array(fc.array(fc.oneof(fc.constant('.'), safeIdentArb), { minLength: cols, maxLength: cols }), {
          minLength: 1,
          maxLength: 5,
        })
        .map(rows => {
          // Give every non-dot cell a unique area per row/col block (guaranteed single-cell rectangles and unique rows).
          const placed: string[] = []
          const grid = rows.map((row, r) =>
            row
              .map((cell, c) => {
                if (cell === '.') return '.'
                const name = `a${r}_${c}`
                placed.push(name)
                return name
              })
              .join(' '),
          )
          return { cols, grid, placed }
        }),
    )

    fc.assert(
      fc.property(validGridArb, ({ cols, grid, placed }) => {
        expect(areaGridProblem(grid)).toBeNull()
        expect(columnCount(grid)).toBe(cols)
        const names = areaNames(grid)
        expect(new Set(names).size).toBe(names.length)
        expect(names).toEqual(placed)
      }),
      { numRuns: 100 },
    )
  })

  it('rejects empty grids, ragged rows, and L-shaped non-rectangular areas', () => {
    expect(areaGridProblem([])).not.toBeNull()

    const raggedArb = fc
      .tuple(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 }))
      .filter(([a, b]) => a !== b)
      .map(([a, b]) => [
        Array.from({ length: a }, (_, i) => `r0_${i}`).join(' '),
        Array.from({ length: b }, (_, i) => `r1_${i}`).join(' '),
      ])

    fc.assert(
      fc.property(raggedArb, grid => {
        expect(areaGridProblem(grid)).not.toBeNull()
      }),
      { numRuns: 60 },
    )

    const lShapeArb = fc.tuple(safeIdentArb, fc.integer({ min: 0, max: 3 })).map(([name, missingCorner]) => {
      const cells = [name, name, name, name]
      cells[missingCorner] = '.'
      return [`${cells[0]} ${cells[1]}`, `${cells[2]} ${cells[3]}`]
    })

    fc.assert(
      fc.property(lShapeArb, grid => {
        const problem = areaGridProblem(grid)
        expect(problem).toContain('rectangle')
      }),
      { numRuns: 60 },
    )
  })
})

describe('property invariants: OKLCH color math', () => {
  it('contrastRatio is symmetric, reflexive, and bounded in [1, 21]', () => {
    fc.assert(
      fc.property(hexColorArb, hexColorArb, (a, b) => {
        const ab = contrastRatio(a, b)
        const ba = contrastRatio(b, a)
        expect(Number.isFinite(ab)).toBe(true)
        expect(ab).toBeGreaterThanOrEqual(1)
        expect(ab).toBeLessThanOrEqual(21)
        expect(Math.abs(ab - ba)).toBeLessThan(1e-12)
        expect(contrastRatio(a, a)).toBe(1)
      }),
      { numRuns: 100 },
    )
  })

  it('hexToOklch -> oklchToHex round-trips within +-1 sRGB channel step', () => {
    fc.assert(
      fc.property(hexColorArb, hex => {
        const back = oklchToHex(hexToOklch(hex))
        expect(back).toMatch(HEX_RE)
        const [r1, g1, b1] = hexToRgb(hex)
        const [r2, g2, b2] = hexToRgb(back)
        expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(1)
        expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(1)
        expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(1)
      }),
      { numRuns: 100 },
    )
  })

  it('pickOnColor chooses the higher-contrast extreme and always meets WCAG AA (4.5)', () => {
    fc.assert(
      fc.property(hexColorArb, bg => {
        const pick = pickOnColor(bg)
        const other = pick === '#000000' ? '#ffffff' : '#000000'
        expect(contrastRatio(pick, bg)).toBeGreaterThanOrEqual(contrastRatio(other, bg))
        expect(contrastRatio(pick, bg)).toBeGreaterThanOrEqual(4.5)
      }),
      { numRuns: 100 },
    )
  })

  it('mixOklch preserves endpoints and stays in valid hex gamut', () => {
    fc.assert(
      fc.property(hexColorArb, hexColorArb, fc.double({ min: 0, max: 1, noNaN: true }), (a, b, t) => {
        expect(mixOklch(a, b, 0)).toBe(a)
        expect(mixOklch(a, b, 1)).toBe(b)
        expect(mixOklch(a, b, t)).toMatch(HEX_RE)
      }),
      { numRuns: 100 },
    )
  })

  it('adjustLightness preserves passing colors and guarantees any achievable target <= 4.5', () => {
    fc.assert(
      fc.property(hexColorArb, hexColorArb, fc.double({ min: 1, max: 4.5, noNaN: true }), (fg, bg, minRatio) => {
        const out = adjustLightness(fg, bg, minRatio)
        expect(out).toMatch(HEX_RE)
        if (contrastRatio(fg, bg) >= minRatio) {
          expect(out).toBe(fg)
        }
        expect(contrastRatio(out, bg)).toBeGreaterThanOrEqual(minRatio)
      }),
      { numRuns: 60 },
    )
  })
})

describe('property invariants: v1 -> v2 migration', () => {
  it('migrates every valid v1 Settings object into a schema-valid ProfileV2', async () => {
    const shortcutArb = (index: number): fc.Arbitrary<Shortcut> =>
      fc.record({
        id: fc.constant(`link-${index}`),
        name: fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 _-]{0,20}$/),
        url: fc.stringMatching(/^[a-z0-9]{1,10}\.[a-z]{2,4}$/).map(host => `https://${host}/`),
        color: hexColorArb,
        icon: fc.stringMatching(/^[A-Za-z0-9]{1,2}$/),
        iconMode: fc.constantFrom<'auto' | 'text' | 'brand' | 'lucide' | 'emoji'>(
          'auto',
          'text',
          'brand',
          'lucide',
          'emoji',
        ),
        iconColorMode: fc.constantFrom<'brand' | 'accent' | 'custom'>('brand', 'accent', 'custom'),
      })

    const v1SettingsArb: fc.Arbitrary<Settings> = fc.integer({ min: 0, max: 5 }).chain(count =>
      fc.record({
        schemaVersion: fc.constant(1 as const),
        language: fc.constantFrom<'zh-CN' | 'en'>('zh-CN', 'en'),
        theme: fc.constantFrom<'dark' | 'light'>('dark', 'light'),
        accent: hexColorArb,
        background: hexColorArb,
        showClock: fc.boolean(),
        showDate: fc.boolean(),
        showSearch: fc.boolean(),
        hour12: fc.boolean(),
        searchTemplate: fc.constantFrom(
          'https://www.google.com/search?q={query}',
          'https://duckduckgo.com/?q={query}',
          'https://example.org/find?term={query}',
        ),
        shortcuts: fc.tuple(...Array.from({ length: count }, (_, i) => shortcutArb(i))),
        columns: fc.integer({ min: 2, max: 10 }),
        iconSize: fc.integer({ min: 40, max: 120 }),
        iconShape: fc.constantFrom<'circle' | 'rounded' | 'square'>('circle', 'rounded', 'square'),
        alignment: fc.constantFrom<'left' | 'center'>('left', 'center'),
        layout: fc.constantFrom<'stacked' | 'split'>('stacked', 'split'),
        reverse: fc.boolean(),
        overlay: fc.integer({ min: 0, max: 80 }),
      }),
    )

    await fc.assert(
      fc.asyncProperty(v1SettingsArb, async v1 => {
        const profile = await migrateV1(v1, {
          id: () => 'profile-prop',
          now: () => '2026-01-01T00:00:00.000Z',
          add: async () => `mnt-asset:${'a'.repeat(64)}`,
        })
        expect(profile.schemaVersion).toBe(2)
        expect(profileIssues(profile)).toEqual([])
        expect(profile.bookmarks.groups[0]?.items).toHaveLength(v1.shortcuts.length)
      }),
      { numRuns: 30 },
    )
  })

  it('rejects non-object inputs cleanly', async () => {
    const nonObjectArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.anything()),
    )
    await fc.assert(
      fc.asyncProperty(nonObjectArb, async bad => {
        await expect(
          migrateV1(bad, {
            id: () => 'profile-prop',
            now: () => '2026-01-01T00:00:00.000Z',
            add: async () => `mnt-asset:${'a'.repeat(64)}`,
          }),
        ).rejects.toThrow()
      }),
      { numRuns: 40 },
    )
  })
})
