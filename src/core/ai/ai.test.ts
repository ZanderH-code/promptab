import { describe, expect, it } from 'vitest'
import { translate } from '../../i18n'
import { CSS_API_ATTRIBUTES, CSS_API_CLASSES, CSS_API_VARIABLES } from '../css/api'
import { applyTemplate } from '../layout/profile'
import { parseProfileV2, profileIssues, type ProfileV2 } from '../schema/profile'
import { analyzeCandidate } from './analyze'
import { aiPackSchema, partsOf } from './pack'
import { applyPack, exportThemePack } from './apply'
import { EXAMPLES } from './examples'
import { autoFix } from './fix'
import { extractCandidates } from './parse'
import { buildPromptPack, slimSchema } from './prompt'
import { buildErrorFeedback, problemText } from './report'

const asset = `mnt-asset:${'c'.repeat(64)}`
const profile: ProfileV2 = parseProfileV2({
  schemaVersion: 2,
  meta: { id: 'main', name: 'Main', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  prefs: { language: 'en', openIn: 'new-tab', reduceMotion: 'system', reduceTransparency: 'system' },
  theme: { mode: 'dark', color: { bg: '#102932', surface: '#203942', text: '#eeeae5', accent: '#90d5cd' }, font: { display: 'serif', ui: 'system' }, radius: 14, shadow: 40, glass: 0, density: 'comfortable', scale: 1, iconShape: 'circle', iconSize: 72 },
  background: { type: 'image', dim: 35, image: { asset, blur: 0, grayscale: 0, scale: 1, vignette: 0, position: 'center' } },
  layout: { contentWidth: 960, align: 'center-center', gap: 24, areas: ['clock search', 'links links'] },
  widgets: [{ id: 'clock', type: 'clock', area: 'clock', order: 0, props: { hour12: false } }],
  bookmarks: { groups: [{ id: 'favorites', name: 'Favorites', collapsed: false, items: [{ id: 'example', name: 'Private Site', url: 'https://secret.example.org/inbox', color: '#90d5cd', icon: 'P', iconMode: 'auto' }] }] },
  search: { engines: [{ id: 'google', name: 'Google', template: 'https://google.com/search?q={query}' }], defaultEngineId: 'google' },
  custom: { css: '', cssEnabled: false, variables: [], values: {} },
})

const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```'
const analyze = (reply: string) => analyzeCandidate(extractCandidates(reply)[0], profile)
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('en', key, params)

describe('extractCandidates', () => {
  it('finds fenced blocks inside chatty replies, json first', () => {
    const reply = `Sure!\n\n${fence('css', '.mnt-clock { color: red; }')}\n\nand\n\n${fence('json', '{"kind":"mnt.theme-pack"}')}\nEnjoy`
    expect(extractCandidates(reply).map(c => c.lang)).toEqual(['json', 'css'])
  })

  it('accepts tilde fences, CRLF and an unclosed final fence', () => {
    expect(extractCandidates('~~~json\r\n{"a":1}\r\n~~~')).toHaveLength(1)
    expect(extractCandidates('```json\n{"a":1}')).toHaveLength(1)
  })

  it('falls back to bare JSON and bare CSS', () => {
    expect(extractCandidates('Here: {"kind":"mnt.theme-pack"} done')).toEqual([{ lang: 'json', code: '{"kind":"mnt.theme-pack"}' }])
    expect(extractCandidates('.mnt-clock { color: red; }')[0].lang).toBe('css')
    expect(extractCandidates('no code here')).toEqual([])
  })
})

describe('autoFix', () => {
  it('repairs colours, units and key case and says what it did', () => {
    const { value, fixes } = autoFix({ theme: { color: { bg: '0e1116', text: '#FFF', accent: '#7ee0c3' }, Radius: '12px' } })
    expect(value).toMatchObject({ theme: { color: { bg: '#0e1116', text: '#ffffff' }, radius: 12 } })
    expect(fixes.map(f => f.kind).sort()).toEqual(['color', 'color', 'key', 'number'])
  })
})

describe('upper-case hex', () => {
  it('is accepted without being reported as a fix', () => {
    const analysis = analyze(fence('json', JSON.stringify({ theme: { color: { bg: '#10141B', text: '#FFFFFF', accent: '#7EE0C3' } } })))
    expect(analysis.problems).toEqual([])
    expect(analysis.fixes).toEqual([])
    expect(analysis.pack?.theme?.color?.bg).toBe('#10141b')
  })
})

describe('analyzeCandidate', () => {
  it('passes every bundled example with no problems and no warnings', () => {
    for (const example of EXAMPLES) {
      const analysis = analyze(fence('json', JSON.stringify(example.pack)))
      expect({ id: example.id, problems: analysis.problems, warnings: analysis.warnings }).toEqual({ id: example.id, problems: [], warnings: [] })
    }
  })

  it('tolerates comments and trailing commas', () => {
    const analysis = analyze(fence('json', '{\n // note\n "kind": "mnt.theme-pack", "theme": { "radius": 8, },\n}'))
    expect(analysis.problems).toEqual([])
    expect(analysis.parts).toEqual({ theme: true, background: false, css: false, layout: false, widgets: false })
  })

  it('locates syntax errors by line and column', () => {
    const analysis = analyze(fence('json', '{\n  "theme": { "radius": }\n}'))
    expect(analysis.problems[0]).toMatchObject({ kind: 'syntax', line: 2 })
  })

  it('reports a faulty reply field by field, then passes once fixed', () => {
    const faulty = fence('json', JSON.stringify({ kind: 'mnt.theme-pack', theme: { mode: 'sepia', radius: 400, color: { bg: 'not-a-colour', text: '#ffffff', accent: '#7ee0c3' } }, background: { type: 'gradient' } }))
    const bad = analyze(faulty)
    expect(bad.pack).toBeUndefined()
    const paths = bad.problems.flatMap(p => (p.kind === 'field' ? [p.path] : []))
    expect(paths).toEqual(expect.arrayContaining(['theme.mode', 'theme.radius', 'theme.color.bg']))
    const feedback = buildErrorFeedback(t, bad.problems)
    expect(feedback).toContain('1. ')
    expect(feedback).toContain('theme.mode')
    expect(feedback).toContain('json code block')

    const fixed = analyze(fence('json', JSON.stringify({ kind: 'mnt.theme-pack', theme: { mode: 'dark', radius: 12, color: { bg: '#10141b', text: '#ffffff', accent: '#7ee0c3' } } })))
    expect(fixed.problems).toEqual([])
    expect(fixed.pack).toBeDefined()
  })

  it('localizes every schema expectation while preserving field paths and values', () => {
    const faulty = fence('json', JSON.stringify({ kind: 'mnt.theme-pack', theme: { mode: 'sepia', radius: 400, color: { bg: 'not-a-colour' } }, background: { type: 'gradient' } }))
    const english = analyzeCandidate(extractCandidates(faulty)[0], profile, 'en')
    const chinese = analyzeCandidate(extractCandidates(faulty)[0], profile, 'zh-CN')
    expect(chinese.problems).toHaveLength(english.problems.length)
    expect(chinese.problems.map(problem => problem.kind === 'field' ? { path: problem.path, value: problem.value } : problem)).toEqual(english.problems.map(problem => problem.kind === 'field' ? { path: problem.path, value: problem.value } : problem))
    const radiusProblem = chinese.problems.find(problem => problem.kind === 'field' && problem.path === 'theme.radius')
    expect(radiusProblem && radiusProblem.kind === 'field' ? radiusProblem.expected : '').toContain('数字')
  })

  it('rejects stylesheets the sanitizer rejects, with a position', () => {
    const analysis = analyze(fence('json', JSON.stringify({ kind: 'mnt.theme-pack', css: '@import url(https://evil.example/x.css);\n.mnt-clock { color: red }' })))
    expect(analysis.problems.some(p => p.kind === 'css')).toBe(true)
    expect(problemText(t, analysis.problems.find(p => p.kind === 'css')!)).toMatch(/line 1/)
  })

  it('rejects an empty pack and uploaded fonts', () => {
    expect(analyze(fence('json', '{"kind":"mnt.theme-pack"}')).problems).toEqual([{ kind: 'empty' }])
    const asset = analyze(fence('json', JSON.stringify({ theme: { font: { display: 'mnt-asset:' + 'a'.repeat(64) } } })))
    expect(asset.problems.length).toBeGreaterThan(0)
  })

  it('warns, without blocking, about contrast, unknown keys, unknown fonts and risky css', () => {
    const analysis = analyze(fence('json', JSON.stringify({
      kind: 'mnt.theme-pack',
      sparkle: true,
      theme: { mode: 'dark', color: { bg: '#222222', text: '#333333', accent: '#444444' }, font: { display: 'Papyrus' } },
      css: '.mnt-clock { animation: spin 1s infinite; color: rgb(1,2,3) !important; }\n.sidebar { margin: 0 }',
    })))
    expect(analysis.problems).toEqual([])
    const kinds = new Set(analysis.warnings.map(w => w.kind))
    for (const kind of ['unknown-key', 'contrast', 'font', 'css-important', 'css-foreign', 'css-animation', 'css-literal-color'] as const) expect(kinds).toContain(kind)
  })
})

describe('AI pack layout and widget parts', () => {
  it('validates layout grids and widgets against all breakpoint areas', () => {
    const valid = { layout: { areas: ['clock search', 'links links'], columns: ['1fr', '1fr'], gap: 16 }, widgets: [{ id: 'clock', type: 'clock', area: 'clock', order: 0, props: { pad: true } }] }
    expect(aiPackSchema.safeParse(valid).success).toBe(true)
    expect(aiPackSchema.safeParse({ layout: { areas: ['a b', 'b a'] } }).success).toBe(false)
    expect(aiPackSchema.safeParse({ layout: { areas: ['clock search', 'links links'], breakpoints: { narrow: { areas: ['overview'] } } }, widgets: valid.widgets }).success).toBe(false)
    expect(aiPackSchema.safeParse({ widgets: [{ id: 'x', type: 'script', area: 'clock', order: 0, props: {} }] }).success).toBe(false)
  })

  it('counts layout and widgets as independently selectable pack parts', () => {
    expect(partsOf({ layout: { areas: ['overview'] }, widgets: [{ id: 'c', type: 'clock', area: 'overview', order: 0, props: {} }] })).toEqual({ theme: false, background: false, css: false, layout: true, widgets: true })
  })
})

describe('theme pack variables', () => {
  it('exports a shareable pack and restores values without profile data', () => {
    const variable = { name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'range' as const, min: 0, max: 10, unit: 'px', default: 2 }
    const source = { ...profile, custom: { ...profile.custom, css: '.x { padding: var(--glow) }', variables: [variable], values: { '--glow': 7 } } }
    const json = JSON.stringify(exportThemePack(source))
    expect(json).not.toContain('secret.example.org')
    expect(json).not.toContain('mnt-asset:')
    const pack = aiPackSchema.parse(JSON.parse(json))
    expect(pack.layout).toEqual(profile.layout)
    expect(pack.widgets).toEqual(profile.widgets)
    expect(applyPack(profile, pack).custom.values).toEqual({ '--glow': 7 })
    expect(pack.background?.type).toBe('theme')
  })

  it('exports widget presentation without private widget content', () => {
    const source: ProfileV2 = { ...profile, widgets: [
      { id: 'greeting', type: 'greeting', area: 'clock', order: 0, props: { name: 'Private Name', size: 2 } },
      { id: 'text', type: 'text', area: 'links', order: 1, props: { text: 'Private Text', muted: true } },
      { id: 'search', type: 'search', area: 'search', order: 2, props: { engine: 'private-engine', size: 1 } },
    ] }
    const exported = exportThemePack(source)
    const json = JSON.stringify(exported)
    expect(json).not.toContain('Private Name')
    expect(json).not.toContain('Private Text')
    expect(json).not.toContain('private-engine')
    const destination = { ...source, widgets: [ { ...source.widgets[0], order: 5 } ] }
    const restored = applyPack(destination, aiPackSchema.parse(JSON.parse(json)))
    expect(restored.widgets).toHaveLength(3)
    expect(restored.widgets[1].props).not.toHaveProperty('text')
    expect(restored.widgets[0].order).toBe(0)
    expect(profileIssues(restored)).toEqual([])
    expect(restored.widgets[0].props).toMatchObject({ name: 'Private Name', size: 2 })
  })

  it('reimports an exported named theme while retaining changed values', () => {
    const variable = { name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'range' as const, min: 0, max: 10, unit: 'px', default: 2 }
    const source = { ...profile, custom: { ...profile.custom, sourcePack: { name: 'Aurora', importedAt: '2026-01-01T00:00:00Z' }, variables: [variable], values: { '--glow': 7 } } }
    const pack = aiPackSchema.parse(JSON.parse(JSON.stringify(exportThemePack(source))))
    expect(pack.meta?.name).toBe('Aurora')
    expect(applyPack({ ...source, custom: { ...source.custom, css: 'old', values: { '--glow': 9 } } }, pack).custom).toMatchObject({ css: '', values: { '--glow': 9 } })
  })

  it('applies authored widget content to an existing matching widget', () => {
    const source: ProfileV2 = { ...profile, widgets: [{ id: 'text', type: 'text', area: 'clock', order: 0, props: { text: 'old' } }] }
    const result = applyPack(source, { widgets: [{ id: 'text', type: 'text', area: 'clock', order: 0, props: { text: 'authored' } }] })
    expect(result.widgets[0].props).toMatchObject({ text: 'authored' })
  })

  it('rejects duplicate and reserved variable names', () => {
    const variable = { name: '--mnt-radius', label: { en: 'Radius', 'zh-CN': '圆角' }, type: 'toggle', default: 1 }
    expect(aiPackSchema.safeParse({ variables: [variable] }).success).toBe(false)
    expect(aiPackSchema.safeParse({ variables: [{ ...variable, name: '--custom' }, { ...variable, name: '--custom' }] }).success).toBe(false)
  })

  it('preserves compatible values on reimport and removes obsolete values', () => {
    const variable = { name: '--glow', label: { en: 'Glow', 'zh-CN': '光' }, type: 'range' as const, min: 0, max: 10, unit: 'px', default: 2 }
    const pack = aiPackSchema.parse({ meta: { name: 'Aurora' }, css: '.x { padding: var(--glow) }', variables: [variable] })
    const existing = { ...profile, custom: { ...profile.custom, sourcePack: { name: 'Aurora', importedAt: '2026-01-01T00:00:00Z' }, variables: [variable], values: { '--glow': 7, '--old': 1 } } }
    expect(applyPack(existing, pack).custom.values).toEqual({ '--glow': 7 })
    expect(applyPack(existing, aiPackSchema.parse({ meta: { name: 'Other' }, variables: [variable] })).custom.values).toEqual({ '--glow': 2 })
    expect(applyPack(existing, aiPackSchema.parse({ meta: { name: 'Aurora' }, variables: [{ ...variable, max: 5 }] })).custom.values).toEqual({ '--glow': 2 })
  })
})

describe('applyPack', () => {
  const pack = analyze(fence('json', JSON.stringify(EXAMPLES[1].pack))).pack!

  it('merges theme, background and css, keeping bookmarks and the wallpaper asset', () => {
    const next = applyPack(profile, pack, undefined, '2026-02-02T00:00:00Z')
    expect(profileIssues(next)).toEqual([])
    expect(next.theme.color.accent).toBe('#7ee0c3')
    expect(next.theme.font.display).toBe('barlow-condensed')
    expect(next.background.type).toBe('gradient')
    expect(next.custom).toMatchObject({ cssEnabled: true, sourcePack: { name: 'Midnight terminal' } })
    expect(next.bookmarks).toBe(profile.bookmarks)
    expect(next.widgets).toBe(profile.widgets)
    expect(next.meta.updatedAt).toBe('2026-02-02T00:00:00Z')
  })

  it('applies selected layout and widget fields while preserving omitted widget props', () => {
    const pack = { layout: { areas: ['clock search', 'links links'], gap: 10 }, widgets: [{ id: 'clock', type: 'clock' as const, area: 'clock', order: 0, props: { hour12: true } }] }
    const next = applyPack(profile, pack)
    expect(next.layout).toMatchObject({ areas: ['clock search', 'links links'], gap: 10 })
    expect(next.widgets[0]).toMatchObject({ id: 'clock', props: { hour12: true } })
    expect(next.widgets).toHaveLength(profile.widgets.length)
  })

  it('retains unmatched widgets in a valid area when importing a different layout', () => {
    const source = applyTemplate(profile, 'icon-split')
    const destination = applyTemplate(profile, 'banner')
    const pack = aiPackSchema.parse(exportThemePack(source))
    const result = applyPack(destination, pack, ['layout', 'widgets'])
    const toolbar = result.widgets.find(widget => widget.id === 'layout-banner-toolbar')
    expect(toolbar).toMatchObject({ type: 'toolbar', area: 'overview' })
    expect(profileIssues(result)).toEqual([])
  })

  it('applies only the chosen parts, and nothing when none apply', () => {
    const cssOnly = applyPack(profile, pack, ['css'])
    expect(cssOnly.theme).toBe(profile.theme)
    expect(cssOnly.background).toBe(profile.background)
    expect(cssOnly.custom.css).toContain('.mnt-clock')
    expect(applyPack(profile, pack, [])).toBe(profile)
  })

  it('fills the surface a pack leaves out', () => {
    const light = analyze(fence('json', JSON.stringify({ theme: { colorLight: { bg: '#f3ecdf', text: '#2f2a24', accent: '#9a4a28' } } }))).pack!
    expect(applyPack(profile, light).theme.colorLight?.surface).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('buildPromptPack', () => {
  for (const language of ['zh-CN', 'en'] as const) {
    it(`names the whole CSS API, the schema and both examples (${language})`, () => {
      const prompt = buildPromptPack({ language, request: 'warm and quiet' })
      for (const name of CSS_API_CLASSES) expect(prompt).toContain(`.${name}`)
      for (const name of [...CSS_API_ATTRIBUTES, ...CSS_API_VARIABLES]) expect(prompt).toContain(name)
      for (const example of EXAMPLES) expect(prompt).toContain(example.pack.meta!.name)
      expect(prompt).toContain('mnt.theme-pack')
      expect(prompt).toContain('warm and quiet')
      expect(prompt).toContain('prefers-reduced-motion')
    })
  }

  it('never leaks bookmarks, URLs or wallpaper assets from the current profile', () => {
    const prompt = buildPromptPack({ language: 'en', current: profile })
    expect(prompt).not.toContain('secret.example.org')
    expect(prompt).not.toContain('Private Site')
    expect(prompt).not.toContain('mnt-asset:')
    expect(prompt).toContain('"accent": "#90d5cd"')
  })

  it('keeps the slim schema in step with the real schema keys', () => {
    const slim = slimSchema()
    for (const key of ['kind', 'packVersion', 'meta', 'theme', 'colorLight', 'font', 'radius', 'shadow', 'glass', 'density', 'scale', 'iconShape', 'iconSize', 'background', 'gradient', 'dim', 'css']) expect(slim).toContain(`"${key}"`)
  })
})
